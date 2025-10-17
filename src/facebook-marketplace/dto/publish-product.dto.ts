import { IsArray, IsMongoId, IsOptional } from 'class-validator';

export class PublishProductDto {
  @IsArray()
  @IsMongoId({ each: true })
  productIds: string[];
}

export class UnpublishProductDto {
  @IsArray()
  @IsMongoId({ each: true })
  productIds: string[];
}
