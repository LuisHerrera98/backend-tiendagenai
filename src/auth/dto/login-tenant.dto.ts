import { IsString, IsNotEmpty } from 'class-validator';

export class LoginTenantDto {
  @IsString()
  @IsNotEmpty()
  email: string; // Puede ser 'jose@mitienda.com' o 'admin@mitienda.com'

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SetupPasswordDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  setupToken: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  email: string; // jose@mitienda.com
}

export class ResetPasswordWithCodeDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string; // Código de 6 dígitos

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}