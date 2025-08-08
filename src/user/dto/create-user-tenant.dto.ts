import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class CreateUserTenantDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El subdominio solo puede contener letras minúsculas, números y guiones'
  })
  subdomain: string;

  @IsString()
  @MinLength(3)
  storeName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}