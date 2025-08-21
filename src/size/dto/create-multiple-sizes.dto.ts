import { IsString, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SizeItem {
  @IsString()
  name: string;
}

export class CreateMultipleSizesDto {
  @IsString()
  category_id: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos una talla' })
  @ValidateNested({ each: true })
  @Type(() => SizeItem)
  sizes: SizeItem[];
}