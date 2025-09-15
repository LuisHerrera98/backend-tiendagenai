import { Injectable, NotFoundException, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './entities/tenant.entity';
import { UpdateMercadoPagoConfigDto, ValidateCredentialsDto } from '../payment/dto/mercadopago-config.dto';
import { EncryptionService } from '../common/services/encryption.service';
import { MercadoPagoService } from '../payment/mercadopago.service';

@Injectable()
export class TenantService {
  private encryptionService: EncryptionService;
  private mercadoPagoService: MercadoPagoService;

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {
    // Inicializamos los servicios después para evitar dependencias circulares
    this.encryptionService = new EncryptionService();
  }

  async findBySubdomain(subdomain: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findOne({ 
      subdomain: subdomain.toLowerCase(),
      status: 'active'
    });
    
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    
    return tenant;
  }

  async findById(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findById(id);
    
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    
    return tenant;
  }

  async updateCustomization(tenantId: string, customization: any) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { customization },
      { new: true }
    );
  }

  async updateSettings(tenantId: string, settings: any) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { settings },
      { new: true }
    );
  }

  async incrementProductCount(tenantId: string, increment: number = 1) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { $inc: { productCount: increment } },
      { new: true }
    );
  }

  async incrementSaleCount(tenantId: string, increment: number = 1) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { $inc: { saleCount: increment } },
      { new: true }
    );
  }

  async findAll() {
    return this.tenantModel.find().sort({ createdAt: -1 });
  }

  async updatePlan(tenantId: string, plan: string) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { plan },
      { new: true }
    );
  }

  async suspendTenant(tenantId: string) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { status: 'suspended' },
      { new: true }
    );
  }

  async activateTenant(tenantId: string) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { status: 'active' },
      { new: true }
    );
  }

  // MercadoPago Methods
  async getMercadoPagoConfig(tenantId: string) {
    const tenant = await this.findById(tenantId);
    
    if (!tenant.mercadoPagoConfig) {
      return {
        enabled: false,
        configured: false,
      };
    }

    // No devolver las credenciales encriptadas al frontend
    const config = tenant.mercadoPagoConfig;
    const mode = config.mode || 'test';
    const credentials = config[mode] || {};
    
    return {
      enabled: config.enabled || false,
      mode: mode,
      configured: !!(credentials.accessToken && credentials.publicKey),
      hasWebhookSecret: !!config.webhookSecret,
      successUrl: config.successUrl,
      failureUrl: config.failureUrl,
      pendingUrl: config.pendingUrl,
      autoReturn: config.autoReturn || false,
      binaryMode: config.binaryMode || false,
      expirationMinutes: config.expirationMinutes || 60,
      lastValidated: mode === 'test' ? config.lastTestValidation : config.lastProdValidation,
    };
  }

  async updateMercadoPagoConfig(tenantId: string, config: UpdateMercadoPagoConfigDto) {
    const tenant = await this.findById(tenantId);
    
    const currentConfig = tenant.mercadoPagoConfig || {
      enabled: false,
      mode: 'test',
      test: {},
      production: {},
    };
    const updatedConfig = { ...currentConfig };

    // Actualizar credenciales de test si se proporcionan
    if (config.test) {
      if (!updatedConfig.test) updatedConfig.test = {};
      
      if (config.test.accessToken) {
        updatedConfig.test.accessToken = this.encryptionService.encrypt(config.test.accessToken);
      }
      if (config.test.publicKey) {
        updatedConfig.test.publicKey = config.test.publicKey; // Public key no se encripta
      }
      
      // Si se actualizan credenciales de test, resetear validación
      if (config.test.accessToken || config.test.publicKey) {
        updatedConfig.lastTestValidation = null;
      }
    }

    // Actualizar credenciales de producción si se proporcionan
    if (config.production) {
      if (!updatedConfig.production) updatedConfig.production = {};
      
      if (config.production.accessToken) {
        updatedConfig.production.accessToken = this.encryptionService.encrypt(config.production.accessToken);
      }
      if (config.production.publicKey) {
        updatedConfig.production.publicKey = config.production.publicKey; // Public key no se encripta
      }
      
      // Si se actualizan credenciales de producción, resetear validación
      if (config.production.accessToken || config.production.publicKey) {
        updatedConfig.lastProdValidation = null;
      }
    }
    
    // Encriptar webhook secret si se proporciona
    if (config.webhookSecret) {
      updatedConfig.webhookSecret = this.encryptionService.encrypt(config.webhookSecret);
    }

    // Actualizar otros campos
    if (config.enabled !== undefined) updatedConfig.enabled = config.enabled;
    if (config.mode) updatedConfig.mode = config.mode;
    if (config.successUrl) updatedConfig.successUrl = config.successUrl;
    if (config.failureUrl) updatedConfig.failureUrl = config.failureUrl;
    if (config.pendingUrl) updatedConfig.pendingUrl = config.pendingUrl;
    if (config.autoReturn !== undefined) updatedConfig.autoReturn = config.autoReturn;
    if (config.binaryMode !== undefined) updatedConfig.binaryMode = config.binaryMode;
    if (config.expirationMinutes) updatedConfig.expirationMinutes = config.expirationMinutes;

    await this.tenantModel.findByIdAndUpdate(
      tenantId,
      { mercadoPagoConfig: updatedConfig },
      { new: true }
    );

    return {
      success: true,
      message: 'MercadoPago configuration updated successfully',
    };
  }

  async validateMercadoPagoCredentials(credentials: ValidateCredentialsDto) {
    try {
      // Crear instancia temporal de MercadoPagoService para validar
      const tempMpService = new MercadoPagoService(this.tenantModel, this.encryptionService);
      const isValid = await tempMpService.validateCredentials(credentials.accessToken);
      
      if (isValid) {
        return {
          valid: true,
          message: 'Credentials are valid',
        };
      } else {
        return {
          valid: false,
          message: 'Invalid credentials',
        };
      }
    } catch (error) {
      return {
        valid: false,
        message: 'Error validating credentials: ' + error.message,
      };
    }
  }
}