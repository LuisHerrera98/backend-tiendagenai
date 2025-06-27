import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateSizeDto {
  @IsString()
  @MinLength(1, { message: 'El nombre no puede estar vacío' })
  @MaxLength(20, { message: 'El nombre no puede tener más de 20 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  category_id: string;
}