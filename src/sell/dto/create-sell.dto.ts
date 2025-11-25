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
  price: number; // Precio de venta real (efectivo/transferencia)

  @IsNumber()
  @IsOptional()
  listPrice?: number; // Precio de lista original

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

  // Datos del producto para desnormalizar
  @IsString()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsOptional()
  category_name?: string;

  @IsString()
  @IsOptional()
  color_id?: string;

  @IsString()
  @IsOptional()
  color_name?: string;

  @IsArray()
  @IsOptional()
  genders?: string[];

  @IsString()
  @IsOptional()
  gender_names?: string;
}