import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './entities/product.entity';
import { Size, SizeSchema } from '../size/entities/size.entity';
import { Brand, BrandSchema } from '../brand/entities/brand.entity';
import { Type, TypeSchema } from '../type/entities/type.entity';
import { Gender, GenderSchema } from '../gender/entities/gender.entity';
import { Category, CategorySchema } from '../category/entities/category.entity';
import { FileModule } from 'src/file/file.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Size.name, schema: SizeSchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Type.name, schema: TypeSchema },
      { name: Gender.name, schema: GenderSchema },
      { name: Category.name, schema: CategorySchema }
    ]),
    FileModule,
    CloudinaryModule
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}