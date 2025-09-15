import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { Tenant, TenantSchema } from '../tenant/entities/tenant.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { Category, CategorySchema } from '../category/entities/category.entity';
import { Brand, BrandSchema } from '../brand/entities/brand.entity';
import { Gender, GenderSchema } from '../gender/entities/gender.entity';
import { Size, SizeSchema } from '../size/entities/size.entity';
import { Color, ColorSchema } from '../color/entities/color.entity';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { OrderModule } from '../order/order.module';
import { EmailModule } from '../email/email.module';
import { PaymentModule } from '../payment/payment.module';
import { EncryptionService } from '../common/services/encryption.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Gender.name, schema: GenderSchema },
      { name: Size.name, schema: SizeSchema },
      { name: Color.name, schema: ColorSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    OrderModule,
    EmailModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [PublicController],
  providers: [PublicService, EncryptionService]
})
export class PublicModule {}
