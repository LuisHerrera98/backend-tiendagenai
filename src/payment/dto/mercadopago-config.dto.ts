import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MercadoPagoCredentialsDto {
  @IsString()
  accessToken: string;

  @IsString()
  publicKey: string;
}

export class UpdateMercadoPagoConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(['test', 'production'])
  mode?: 'test' | 'production';

  @IsOptional()
  @ValidateNested()
  @Type(() => MercadoPagoCredentialsDto)
  test?: MercadoPagoCredentialsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MercadoPagoCredentialsDto)
  production?: MercadoPagoCredentialsDto;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  failureUrl?: string;

  @IsOptional()
  @IsString()
  pendingUrl?: string;

  @IsOptional()
  @IsBoolean()
  autoReturn?: boolean;

  @IsOptional()
  @IsBoolean()
  binaryMode?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(1440) // Máximo 24 horas
  expirationMinutes?: number;
}

export class ValidateCredentialsDto {
  @IsString()
  accessToken: string;

  @IsString()
  publicKey: string;
  
  @IsEnum(['test', 'production'])
  mode: 'test' | 'production';
}