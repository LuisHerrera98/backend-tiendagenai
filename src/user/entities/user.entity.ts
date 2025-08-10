import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { UserRole, Permission } from './role.entity';

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
    enum: Object.values(UserRole),
    default: UserRole.ADMIN
  })
  role: UserRole;

  // Permisos personalizados (solo para rol CUSTOM)
  @Prop({ type: [String], default: [] })
  permissions: Permission[];

  // Usuario creado por (para tracking)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  createdBy?: string;

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

  // Información adicional para vendedores
  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  address?: string;

  @Prop({ type: String, required: false })
  employeeCode?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índice único solo por email (un usuario puede tener múltiples tiendas)
UserSchema.index({ email: 1 }, { unique: true });