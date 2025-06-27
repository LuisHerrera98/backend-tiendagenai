import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './entities/category.entity';
import { Size, SizeSchema } from '../size/entities/size.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Size.name, schema: SizeSchema }
    ])
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}