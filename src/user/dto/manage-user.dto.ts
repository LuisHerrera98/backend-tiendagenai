import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { UserRole, Permission } from '../entities/role.entity';

export class CreateManagedUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsArray()
  @IsOptional()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  employeeCode?: string;
}

export class UpdateManagedUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsArray()
  @IsOptional()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}