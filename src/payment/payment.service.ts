import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, PaymentStatus, PaymentMethod } from '../order/entities/order.entity';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { MercadoPagoService } from './mercadopago.service';
import { EncryptionService } from '../common/services/encryption.service';
import { UpdateMercadoPagoConfigDto, ValidateCredentialsDto } from './dto/mercadopago-config.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private mercadoPagoService: MercadoPagoService,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Obtiene la configuración de MercadoPago del tenant
   */
  async getMercadoPagoConfig(tenantId: string): Promise<any> {
    const tenant = await this.tenantModel.findById(tenantId);
    
    if (!tenant) {
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
    }

    const config = tenant.mercadoPagoConfig || {};
    
    // Retornar configuración sin las credenciales sensibles
    return {
      enabled: config.enabled || false,
      mode: config.mode || 'test',
      hasTestCredentials: !!(config.test?.accessToken && config.test?.publicKey),
      hasProductionCredentials: !!(config.production?.accessToken && config.production?.publicKey),
      testPublicKey: config.test?.publicKey || null,
      productionPublicKey: config.production?.publicKey || null,
      webhookSecret: config.webhookSecret ? '***configured***' : null,
      autoReturn: config.autoReturn ?? true,
      binaryMode: config.binaryMode ?? false,
      expirationMinutes: config.expirationMinutes || 30,
      lastTestValidation: config.lastTestValidation,
      lastProdValidation: config.lastProdValidation,
    };
  }

  /**
   * Actualiza la configuración de MercadoPago del tenant
   */
  async updateMercadoPagoConfig(
    tenantId: string,
    updateConfigDto: UpdateMercadoPagoConfigDto,
  ): Promise<any> {
    const tenant = await this.tenantModel.findById(tenantId);
    
    if (!tenant) {
      throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
    }

    // Inicializar configuración si no existe
    if (!tenant.mercadoPagoConfig) {
      tenant.mercadoPagoConfig = {
        enabled: false,
        mode: 'test',
        test: {},
        production: {},
      };
    }

    // Actualizar configuración básica
    if (updateConfigDto.enabled !== undefined) {
      tenant.mercadoPagoConfig.enabled = updateConfigDto.enabled;
    }
    
    if (updateConfigDto.mode) {
      tenant.mercadoPagoConfig.mode = updateConfigDto.mode;
    }

    // Actualizar credenciales de test si se proporcionan
    if (updateConfigDto.test) {
      if (!tenant.mercadoPagoConfig.test) {
        tenant.mercadoPagoConfig.test = {};
      }
      
      if (updateConfigDto.test.accessToken) {
        tenant.mercadoPagoConfig.test.accessToken = this.encryptionService.encrypt(
          updateConfigDto.test.accessToken
        );
      }
      
      if (updateConfigDto.test.publicKey) {
        tenant.mercadoPagoConfig.test.publicKey = updateConfigDto.test.publicKey;
      }
    }

    // Actualizar credenciales de producción si se proporcionan
    if (updateConfigDto.production) {
      if (!tenant.mercadoPagoConfig.production) {
        tenant.mercadoPagoConfig.production = {};
      }
      
      if (updateConfigDto.production.accessToken) {
        tenant.mercadoPagoConfig.production.accessToken = this.encryptionService.encrypt(
          updateConfigDto.production.accessToken
        );
      }
      
      if (updateConfigDto.production.publicKey) {
        tenant.mercadoPagoConfig.production.publicKey = updateConfigDto.production.publicKey;
      }
    }

    // Actualizar webhook secret si se proporciona
    if (updateConfigDto.webhookSecret) {
      tenant.mercadoPagoConfig.webhookSecret = this.encryptionService.encrypt(
        updateConfigDto.webhookSecret
      );
    }

    // Actualizar otras configuraciones
    if (updateConfigDto.autoReturn !== undefined) {
      tenant.mercadoPagoConfig.autoReturn = updateConfigDto.autoReturn;
    }
    
    if (updateConfigDto.binaryMode !== undefined) {
      tenant.mercadoPagoConfig.binaryMode = updateConfigDto.binaryMode;
    }
    
    if (updateConfigDto.expirationMinutes !== undefined) {
      tenant.mercadoPagoConfig.expirationMinutes = updateConfigDto.expirationMinutes;
    }

    // Guardar cambios
    await tenant.save();

    return {
      message: 'MercadoPago configuration updated successfully',
      config: await this.getMercadoPagoConfig(tenantId),
    };
  }

  /**
   * Valida las credenciales de MercadoPago
   */
  async validateMercadoPagoCredentials(
    tenantId: string,
    validateDto: ValidateCredentialsDto,
  ): Promise<any> {
    try {
      // Validar las credenciales
      const isValid = await this.mercadoPagoService.validateCredentials(validateDto.accessToken);
      
      if (isValid) {
        // Actualizar fecha de última validación
        const tenant = await this.tenantModel.findById(tenantId);
        
        if (tenant && tenant.mercadoPagoConfig) {
          if (validateDto.mode === 'test') {
            tenant.mercadoPagoConfig.lastTestValidation = new Date();
          } else {
            tenant.mercadoPagoConfig.lastProdValidation = new Date();
          }
          await tenant.save();
        }
      }

      return {
        valid: isValid,
        mode: validateDto.mode,
        message: isValid 
          ? `${validateDto.mode === 'test' ? 'Test' : 'Production'} credentials are valid`
          : 'Invalid credentials',
      };
    } catch (error) {
      return {
        valid: false,
        mode: validateDto.mode,
        message: `Error validating credentials: ${error.message}`,
      };
    }
  }

  /**
   * Crea una preferencia de pago para una orden
   */
  async createPaymentPreference(tenantId: string, orderId: string): Promise<any> {
    // Buscar la orden
    const order = await this.orderModel.findOne({
      _id: orderId,
      tenantId,
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    // Verificar que la orden esté pendiente de pago
    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new HttpException('Order payment is not pending', HttpStatus.BAD_REQUEST);
    }

    // Crear la preferencia en MercadoPago
    const preference = await this.mercadoPagoService.createPreference(tenantId, {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items,
      total: order.total,
    });

    // Actualizar la orden con la información de la preferencia
    order.paymentMethod = PaymentMethod.MERCADO_PAGO;
    order.paymentStatus = PaymentStatus.PROCESSING;
    order.mercadoPagoData = {
      preferenceId: preference.preferenceId,
      externalReference: order.orderNumber,
      dateCreated: new Date(),
    };
    await order.save();

    return preference;
  }

  /**
   * Procesa la notificación de webhook de MercadoPago
   */
  async processWebhookNotification(
    tenantId: string,
    notificationType: string,
    dataId: string,
    signature?: string
  ): Promise<void> {
    // Obtener el tenant
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant || !tenant.mercadoPagoConfig?.enabled) {
      throw new HttpException('Invalid tenant or MercadoPago not enabled', HttpStatus.BAD_REQUEST);
    }

    // Validar la firma del webhook si está configurada
    if (tenant.mercadoPagoConfig.webhookSecret && signature) {
      const secret = this.encryptionService.decrypt(tenant.mercadoPagoConfig.webhookSecret);
      const isValid = this.mercadoPagoService.validateWebhookSignature(
        { id: dataId },
        signature,
        secret
      );

      if (!isValid) {
        throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
      }
    }

    // Procesar según el tipo de notificación
    if (notificationType === 'payment') {
      await this.processPaymentNotification(tenantId, dataId);
    }
    // Aquí se pueden agregar otros tipos de notificaciones como 'merchant_order'
  }

  /**
   * Procesa una notificación de pago
   */
  private async processPaymentNotification(tenantId: string, paymentId: string): Promise<void> {
    try {
      // Obtener información del pago desde MercadoPago
      const paymentInfo = await this.mercadoPagoService.getPaymentInfo(tenantId, paymentId);

      // Buscar la orden por external_reference
      const order = await this.orderModel.findOne({
        tenantId,
        orderNumber: paymentInfo.externalReference,
      });

      if (!order) {
        console.error(`Order not found for payment ${paymentId}`);
        return;
      }

      // Actualizar el estado del pago según MercadoPago
      const statusMap = {
        'approved': PaymentStatus.APPROVED,
        'pending': PaymentStatus.PENDING,
        'in_process': PaymentStatus.IN_PROCESS,
        'rejected': PaymentStatus.REJECTED,
        'cancelled': PaymentStatus.CANCELLED,
        'refunded': PaymentStatus.REFUNDED,
        'charged_back': PaymentStatus.CHARGED_BACK,
        'in_mediation': PaymentStatus.IN_MEDIATION,
      };

      order.paymentStatus = statusMap[paymentInfo.status] || PaymentStatus.PENDING;

      // Actualizar la información de MercadoPago
      order.mercadoPagoData = {
        ...order.mercadoPagoData,
        paymentId: paymentInfo.id,
        collectionStatus: paymentInfo.status,
        paymentType: paymentInfo.paymentTypeId,
        dateApproved: paymentInfo.dateApproved,
        lastModified: paymentInfo.lastModified,
        payer: paymentInfo.payer,
        transactionDetails: {
          netReceivedAmount: paymentInfo.netReceivedAmount,
          totalPaidAmount: paymentInfo.totalPaidAmount,
        },
      };

      await order.save();
    } catch (error) {
      console.error('Error processing payment notification:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de un pago
   */
  async getPaymentStatus(tenantId: string, orderId: string): Promise<any> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      tenantId,
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      mercadoPagoData: order.mercadoPagoData,
    };
  }

  /**
   * Cancela un pago pendiente
   */
  async cancelPayment(tenantId: string, orderId: string): Promise<void> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      tenantId,
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    if (order.paymentStatus === PaymentStatus.APPROVED) {
      throw new HttpException('Cannot cancel an approved payment', HttpStatus.BAD_REQUEST);
    }

    order.paymentStatus = PaymentStatus.CANCELLED;
    await order.save();
  }

  /**
   * Procesa un reembolso
   */
  async refundPayment(tenantId: string, orderId: string, amount?: number): Promise<any> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      tenantId,
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    if (order.paymentStatus !== PaymentStatus.APPROVED) {
      throw new HttpException('Can only refund approved payments', HttpStatus.BAD_REQUEST);
    }

    if (!order.mercadoPagoData?.paymentId) {
      throw new HttpException('No MercadoPago payment found', HttpStatus.BAD_REQUEST);
    }

    // Procesar el reembolso en MercadoPago
    const refund = await this.mercadoPagoService.refundPayment(
      tenantId,
      order.mercadoPagoData.paymentId,
      amount
    );

    // Actualizar la orden
    order.paymentStatus = PaymentStatus.REFUNDED;
    order.mercadoPagoData = {
      ...order.mercadoPagoData,
      lastModified: new Date(),
    };
    await order.save();

    return refund;
  }
}