import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { Tenant, TenantSchema } from '../tenant/entities/tenant.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { Category, CategorySchema } from '../category/entities/category.entity';
import { Brand, BrandSchema } from '../brand/entities/brand.entity';
import { Gender, GenderSchema } from '../gender/entities/gender.entity';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Gender.name, schema: GenderSchema },
    ]),
    OrderModule,
  ],
  controllers: [PublicController],
  providers: [PublicService]
})
export class PublicModule {}
