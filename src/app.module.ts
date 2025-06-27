import { Module } from '@nestjs/common';
import { SizeModule } from './size/size.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from './common/common.module';
import { FileModule } from './file/file.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ConfigModule } from '@nestjs/config';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { SellModule } from './sell/sell.module';
import { BrandModule } from './brand/brand.module';

@Module({
  imports: [
    CloudinaryModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      'mongodb+srv://Lucho:mision2017@db-trendsneakers.bday4jw.mongodb.net/ecommerce-test',
    ),
    SizeModule,
    CommonModule,
    FileModule,
    CategoryModule,
    ProductModule,
    SellModule,
    BrandModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
