import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateModeloDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(1, { message: 'El nombre no puede estar vacío' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  category_id: string;
}
