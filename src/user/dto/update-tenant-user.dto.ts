import { IsString, IsEnum, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { UserRole, Permission } from '../entities/role.entity';

export class UpdateTenantUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsArray()
  @IsOptional()
  permissions?: Permission[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}