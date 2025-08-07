import { Module } from '@nestjs/common';
import { SizeService } from './size.service';
import { SizeController } from './size.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Size, SizeSchema } from './entities/size.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { Category, CategorySchema } from '../category/entities/category.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Size.name, schema: SizeSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema }
    ])
  ],
  controllers: [SizeController],
  providers: [SizeService],
})
export class SizeModule {}