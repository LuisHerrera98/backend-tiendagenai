import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FacebookCredentials extends Document {
  @Prop({ required: true, unique: true })
  tenantId: string;

  @Prop({ required: false })
  businessId: string;

  @Prop({ required: false })
  catalogId: string;

  @Prop({ required: false })
  accessToken: string; // Encriptado

  @Prop({ default: false })
  isEnabled: boolean;

  @Prop({ default: false })
  autoPublish: boolean; // Publicar automáticamente productos nuevos

  @Prop({ type: Object, default: {} })
  publishedProducts: Record<string, string>; // { productId: facebookProductId }

  @Prop()
  lastSyncAt: Date;

  @Prop({ default: 0 })
  totalPublished: number;
}

export const FacebookCredentialsSchema = SchemaFactory.createForClass(FacebookCredentials);
