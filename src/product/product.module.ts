import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './entities/product.entity';
import { Size, SizeSchema } from '../size/entities/size.entity';
import { FileModule } from 'src/file/file.module';
import { SellModule } from 'src/sell/sell.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Size.name, schema: SizeSchema }
    ]),
    FileModule,
    SellModule,
    CloudinaryModule
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}