import { IsString, IsEmail, IsEnum, IsOptional, IsArray, IsBoolean, MinLength } from 'class-validator';
import { UserRole, Permission } from '../entities/role.entity';

export class CreateTenantUserDto {
  @IsString()
  name: string; // Nombre completo del usuario

  @IsEmail()
  @IsOptional()
  email: string; // Ahora es opcional, se genera automáticamente

  @IsString()
  @IsOptional()
  username?: string; // Se genera automáticamente del firstName

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string; // Contraseña requerida al crear usuario

  @IsEnum(UserRole)
  role: UserRole;

  @IsArray()
  @IsOptional()
  permissions?: Permission[]; // Solo para rol CUSTOM

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  sendInviteEmail?: boolean; // Si enviar email de invitación
}