import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Brand, BrandSchema } from './entities/brand.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Brand.name, schema: BrandSchema },
      { name: Product.name, schema: ProductSchema }
    ])
  ],
  controllers: [BrandController],
  providers: [BrandService],
})
export class BrandModule {}