import { IsEmail, IsNotEmpty, IsString, Matches, MinLength, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain can only contain lowercase letters, numbers and hyphens'
  })
  @MinLength(3)
  subdomain: string;

  @IsNotEmpty()
  @IsString()
  storeName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  ownerName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}