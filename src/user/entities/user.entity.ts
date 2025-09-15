import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { UserRole, Permission } from './role.entity';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  email: string;

  // Email simplificado para login (e.g., 'jose' de 'jose@mitienda.com')
  @Prop({ required: false })
  username?: string;

  @Prop({ required: false }) // Opcional para permitir primer login sin contraseña
  password?: string;

  @Prop({ type: Boolean, default: false })
  passwordSet: boolean; // Indica si el usuario ya configuró su contraseña

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

  // Tenant principal del usuario (para login con email@tenant)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', required: false })
  primaryTenantId?: string;

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

  @Prop({ type: String })
  resetPasswordCode?: string;

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

  // Código de configuración inicial (para primer login)
  @Prop({ type: String, required: false })
  setupToken?: string;

  @Prop({ type: Date, required: false })
  setupTokenExpires?: Date;

  // Historial de logins
  @Prop({ type: [{ date: Date, ip: String, userAgent: String }], default: [] })
  loginHistory?: { date: Date; ip: string; userAgent: string }[];

  // Soft delete
  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  // Email original antes de ser eliminado (para restauración)
  @Prop({ type: String, required: false })
  originalEmail?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índice único compuesto para email + primaryTenantId (permite mismo email en diferentes tiendas)
UserSchema.index({ email: 1, primaryTenantId: 1 }, { unique: true });
// Índice para búsqueda rápida por username + primaryTenantId
UserSchema.index({ username: 1, primaryTenantId: 1 });