import { IsOptional, IsString, MinLength, IsBoolean, IsNumber, IsIn, IsArray, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';

export class StockItem {
  size_id: string;
  size_name: string;
  quantity: number;
  available: boolean; // Indica si este talle está disponible para el producto
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  category_id: string;

  @IsOptional()
  @IsString()
  type_id: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  cost: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  price: number; // Precio lista - calculado o manual

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  cashPrice: number; // Precio efectivo - calculado o manual

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  transferPrice: number; // Precio transferencia - calculado o manual

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  profitPercentage: number; // % ganancia sobre costo

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  cashDiscountPercentage: number; // % descuento efectivo

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  transferDiscountPercentage: number; // % descuento transferencia

  @IsOptional()
  images: any[];

  @IsOptional()
  @IsBoolean()
  active: boolean;

  @IsOptional()
  stock: StockItem[];

  @IsOptional()
  @IsString()
  @IsIn(['sizes', 'unit'])
  stockType: string;

  @IsOptional()
  @IsString()
  brand_id: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  discount: number;

  @IsOptional()
  @IsString()
  gender_id: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  genders: string[];

  @IsOptional()
  @IsString()
  color_id: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  installmentText: string;

  @IsOptional()
  @IsBoolean()
  withoutStock: boolean;
}