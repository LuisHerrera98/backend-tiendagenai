import { IsString, IsArray, IsOptional, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

class OriginalSaleDto {
  @IsMongoId()
  sale_id: string;
}

class NewProductDto {
  @IsMongoId()
  product_id: string;

  @IsString()
  product_name: string;

  @IsString()
  size_id: string;

  @IsString()
  size_name: string;

  @IsString()
  @IsOptional()
  method_payment?: string;
}

export class CreateMassiveExchangeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OriginalSaleDto)
  original_sales: OriginalSaleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewProductDto)
  new_products: NewProductDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  credit_action?: 'create_credit' | 'additional_product' | 'cash_return';

  @IsString()
  @IsOptional()
  client_document?: string;

  @IsString()
  @IsOptional()
  client_name?: string;

  @IsString()
  @IsOptional()
  payment_method_difference?: string;
}