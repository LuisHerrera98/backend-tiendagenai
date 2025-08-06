import { IsOptional, IsString, MinLength, IsBoolean, IsNumber, IsIn } from 'class-validator';
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

  @Transform(({ value }) => Number(value))
  @IsNumber()
  price: number;

  @IsOptional()
  images: any[];

  @IsOptional()
  @IsBoolean()
  active: boolean;

  @IsOptional()
  stock: StockItem[];

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
}