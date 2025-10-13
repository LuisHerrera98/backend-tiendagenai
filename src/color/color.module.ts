import { Module } from '@nestjs/common';
import { ColorService } from './color.service';
import { ColorController } from './color.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Color, ColorSchema } from './entities/color.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Color.name, schema: ColorSchema },
      { name: Product.name, schema: ProductSchema }
    ])
  ],
  controllers: [ColorController],
  providers: [ColorService],
})
export class ColorModule {}