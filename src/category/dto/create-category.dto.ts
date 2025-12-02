import { IsString, MinLength, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1, { message: 'El nombre no puede estar vacío' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El orden debe ser mayor o igual a 0' })
  order?: number;
}