import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Tenant } from '../../tenant/entities/tenant.entity';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ 
    type: String, 
    enum: ['super_admin', 'store_owner', 'store_admin', 'store_employee'],
    default: 'store_owner'
  })
  role: string;

  // Array de tiendas que el usuario puede administrar
  @Prop([{ type: MongooseSchema.Types.ObjectId, ref: 'Tenant' }])
  tenantIds: string[];

  // Tienda actualmente seleccionada
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', required: false })
  currentTenantId?: string;

  @Prop({ type: Boolean, default: false })
  emailVerified: boolean;

  @Prop({ type: String })
  emailVerificationToken?: string;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;

  @Prop({ type: String })
  resetPasswordToken?: string;

  @Prop({ type: Date })
  resetPasswordExpires?: Date;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({ type: Date })
  lastLogin?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índice único solo por email (un usuario puede tener múltiples tiendas)
UserSchema.index({ email: 1 }, { unique: true });