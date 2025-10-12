import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './entities/category.entity';
import { Size, SizeSchema } from '../size/entities/size.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Size.name, schema: SizeSchema },
      { name: Product.name, schema: ProductSchema }
    ])
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}