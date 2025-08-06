import { IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateSellDto {
  @IsString()
  product_id: string;

  @IsString()
  product_name: string;

  @IsString()
  size_id: string;

  @IsString()
  size_name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  cost: number;

  @IsArray()
  @IsOptional()
  images: any[];

  @IsString()
  @IsOptional()
  method_payment?: string;

  @IsString()
  @IsOptional()
  client_document?: string;

  @IsNumber()
  @IsOptional()
  credit_used?: number;

  @IsString()
  @IsOptional()
  transaction_id?: string;
}