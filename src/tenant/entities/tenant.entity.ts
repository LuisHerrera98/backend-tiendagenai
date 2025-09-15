import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true, lowercase: true })
  subdomain: string;

  @Prop({ required: true })
  storeName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  ownerName: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ 
    type: String, 
    enum: ['active', 'suspended', 'pending_verification', 'trial'],
    default: 'pending_verification'
  })
  status: string;

  @Prop({ type: String, enum: ['free', 'basic', 'premium'], default: 'free' })
  plan: string;

  @Prop({ type: Date })
  trialEndsAt?: Date;

  @Prop({ type: Object })
  customization: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    favicon?: string;
    bannerImage?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      whatsapp?: string;
    };
  };

  @Prop({ type: Object })
  settings: {
    currency?: string;
    timezone?: string;
    language?: string;
    enableWhatsapp?: boolean;
    whatsappNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    whatsapp?: string;
    whatsappEnabled?: boolean;
    instagram?: string;
    facebook?: string;
    simpleStoreEnabled?: boolean;
    freeShippingEnabled?: boolean;
    freeShippingMinAmount?: number;
    freeShippingText?: string;
  };

  @Prop({ type: Object })
  mercadoPagoConfig: {
    enabled?: boolean;
    mode?: 'test' | 'production';
    test?: {
      accessToken?: string; // Encriptado
      publicKey?: string;
    };
    production?: {
      accessToken?: string; // Encriptado
      publicKey?: string;
    };
    webhookSecret?: string; // Encriptado - compartido entre test y prod
    notificationUrl?: string;
    successUrl?: string;
    failureUrl?: string;
    pendingUrl?: string;
    autoReturn?: boolean;
    binaryMode?: boolean;
    expirationMinutes?: number;
    lastTestValidation?: Date;
    lastProdValidation?: Date;
  };

  @Prop({ type: String })
  verificationToken?: string;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: Number, default: 0 })
  productCount: number;

  @Prop({ type: Number, default: 0 })
  saleCount: number;

  @Prop({ type: Boolean, default: true })
  active: boolean;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);