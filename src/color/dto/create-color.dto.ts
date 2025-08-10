import { IsString, MinLength, MaxLength, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateColorDto {
  @IsString()
  @MinLength(1, { message: 'El nombre no puede estar vacío' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-F]{3}){1,2}$/i, { message: 'El código hexadecimal debe tener el formato #RRGGBB o #RGB' })
  hex_code?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}