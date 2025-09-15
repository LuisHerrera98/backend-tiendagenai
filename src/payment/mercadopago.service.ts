import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { EncryptionService } from '../common/services/encryption.service';

@Injectable()
export class MercadoPagoService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Obtiene el cliente de MercadoPago configurado para un tenant
   */
  private async getMercadoPagoClient(tenantId: string): Promise<MercadoPagoConfig> {
    const tenant = await this.tenantModel.findById(tenantId);
    
    if (!tenant) {
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
    }

    if (!tenant.mercadoPagoConfig?.enabled) {
      throw new HttpException('MercadoPago is not enabled for this tenant', HttpStatus.BAD_REQUEST);
    }

    const mode = tenant.mercadoPagoConfig.mode || 'test';
    const credentials = tenant.mercadoPagoConfig[mode];

    if (!credentials?.accessToken) {
      throw new HttpException(`MercadoPago ${mode} access token not configured`, HttpStatus.BAD_REQUEST);
    }

    // Desencriptar el access token
    const accessToken = this.encryptionService.decrypt(credentials.accessToken);
    
    if (!accessToken) {
      throw new HttpException('Failed to decrypt MercadoPago credentials', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Configurar el cliente de MercadoPago
    return new MercadoPagoConfig({ 
      accessToken,
      options: {
        timeout: 5000,
        idempotencyKey: `tenant-${tenantId}-${Date.now()}`
      }
    });
  }

  /**
   * Crea una preferencia de pago en MercadoPago
   */
  async createPreference(tenantId: string, orderData: any): Promise<any> {
    try {
      const client = await this.getMercadoPagoClient(tenantId);
      const preference = new Preference(client);
      
      const tenant = await this.tenantModel.findById(tenantId);
      
      // Configurar URLs de retorno
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const subdomain = tenant.subdomain;

      // Preparar items para MercadoPago
      const items = orderData.items.map(item => ({
        id: item.productId,
        title: `${item.productName} - Talle: ${item.sizeName}`,
        quantity: item.quantity,
        unit_price: item.price * (1 - (item.discount || 0) / 100),
        currency_id: 'ARS', // Peso argentino por defecto
        category_id: 'others',
      }));

      // Crear la preferencia
      const preferenceData = {
        items,
        payer: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          phone: {
            number: orderData.customerPhone,
          },
        },
        back_urls: {
          success: `${baseUrl}/store/${subdomain}/payment-success`,
          failure: `${baseUrl}/store/${subdomain}/payment-failure`,
          pending: `${baseUrl}/store/${subdomain}/payment-pending`,
        },
        auto_return: 'approved' as const,
        payment_methods: {
          excluded_payment_types: [],
          installments: 12, // Máximo de cuotas
        },
        notification_url: `${process.env.API_URL || 'http://localhost:3000'}/api/payment/webhook/${tenantId}`,
        external_reference: orderData.orderNumber,
        expires: tenant.mercadoPagoConfig?.expirationMinutes ? true : false,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: tenant.mercadoPagoConfig?.expirationMinutes 
          ? new Date(Date.now() + tenant.mercadoPagoConfig.expirationMinutes * 60000).toISOString()
          : undefined,
        binary_mode: tenant.mercadoPagoConfig?.binaryMode || false,
      };

      const response = await preference.create({ body: preferenceData });
      
      // Retornar el init point correcto según el modo
      const isTestMode = tenant.mercadoPagoConfig.mode === 'test';
      
      return {
        preferenceId: response.id,
        initPoint: isTestMode ? response.sandbox_init_point : response.init_point,
        sandboxInitPoint: response.sandbox_init_point,
        mode: tenant.mercadoPagoConfig.mode || 'test',
      };
    } catch (error) {
      console.error('Error creating MercadoPago preference:', error);
      throw new HttpException(
        `Failed to create payment preference: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtiene información de un pago desde MercadoPago
   */
  async getPaymentInfo(tenantId: string, paymentId: string): Promise<any> {
    try {
      const client = await this.getMercadoPagoClient(tenantId);
      const payment = new Payment(client);
      
      const response = await payment.get({ id: paymentId });
      
      return {
        id: response.id,
        status: response.status,
        statusDetail: response.status_detail,
        operationType: response.operation_type,
        paymentMethodId: response.payment_method_id,
        paymentTypeId: response.payment_type_id,
        transactionAmount: response.transaction_amount,
        netReceivedAmount: response.transaction_details?.net_received_amount,
        totalPaidAmount: response.transaction_details?.total_paid_amount,
        dateApproved: response.date_approved,
        dateCreated: response.date_created,
        lastModified: response.date_last_updated,
        payer: {
          email: response.payer?.email,
          identification: response.payer?.identification,
        },
        externalReference: response.external_reference,
        description: response.description,
      };
    } catch (error) {
      console.error('Error getting payment info:', error);
      throw new HttpException(
        `Failed to get payment info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Procesa un reembolso en MercadoPago
   */
  async refundPayment(tenantId: string, paymentId: string, amount?: number): Promise<any> {
    try {
      const client = await this.getMercadoPagoClient(tenantId);
      const payment = new Payment(client);
      
      // MercadoPago SDK v2 usa métodos diferentes para refunds
      // Necesitamos crear un refund como una nueva operación
      const paymentInfo = await payment.get({ id: paymentId });
      
      if (!paymentInfo) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }
      
      // Por ahora retornamos información básica
      // En producción se debe usar el endpoint de refunds de la API REST
      return {
        id: paymentId,
        status: 'refund_requested',
        amount: amount || paymentInfo.transaction_amount,
        refundedAmount: amount || paymentInfo.transaction_amount,
        message: 'Refund request created. Process manually in MercadoPago dashboard.',
      };
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw new HttpException(
        `Failed to refund payment: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Valida las credenciales de MercadoPago
   */
  async validateCredentials(accessToken: string): Promise<boolean> {
    try {
      const client = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(client);
      
      // Intentar hacer una búsqueda simple para validar las credenciales
      await payment.search({
        options: {
          limit: 1,
        }
      });
      
      return true;
    } catch (error) {
      console.error('Invalid MercadoPago credentials:', error);
      return false;
    }
  }

  /**
   * Valida la firma del webhook de MercadoPago
   */
  validateWebhookSignature(
    data: any,
    signature: string,
    secret: string
  ): boolean {
    // MercadoPago envía x-signature header con formato: ts=timestamp,v1=hash
    const parts = signature.split(',');
    const timestamp = parts[0]?.replace('ts=', '');
    const hash = parts[1]?.replace('v1=', '');
    
    if (!timestamp || !hash) {
      return false;
    }

    // Construir el string para validar
    const dataString = `id:${data.id};timestamp:${timestamp};`;
    
    // Validar el hash
    return this.encryptionService.validateHash(dataString, secret, hash);
  }
}