import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateExchangeDto {
  @IsString()
  original_sell_id: string;

  @IsString()
  new_product_id: string;

  @IsString()
  new_size_id: string;

  @IsString()
  @IsOptional()
  payment_method_difference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  credit_action?: 'create_credit' | 'cash_return' | 'additional_product';

  @IsString()
  @IsOptional()
  client_document?: string;

  @IsString()
  @IsOptional()
  client_phone?: string;

  @IsString()
  @IsOptional()
  client_name?: string;
}