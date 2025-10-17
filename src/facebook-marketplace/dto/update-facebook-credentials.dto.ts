import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateFacebookCredentialsDto {
  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  catalogId?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  autoPublish?: boolean;
}
