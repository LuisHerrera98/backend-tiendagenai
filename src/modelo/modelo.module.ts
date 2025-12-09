import { Module } from '@nestjs/common';
import { ModeloService } from './modelo.service';
import { ModeloController } from './modelo.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Modelo, ModeloSchema } from './entities/modelo.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { Category, CategorySchema } from '../category/entities/category.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Modelo.name, schema: ModeloSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [ModeloController],
  providers: [ModeloService],
  exports: [ModeloService],
})
export class ModeloModule {}
