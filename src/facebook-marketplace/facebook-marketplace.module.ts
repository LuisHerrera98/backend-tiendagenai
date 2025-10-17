import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FacebookMarketplaceController } from './facebook-marketplace.controller';
import { FacebookMarketplaceService } from './facebook-marketplace.service';
import { FacebookCredentials, FacebookCredentialsSchema } from './entities/facebook-credentials.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { Category, CategorySchema } from '../category/entities/category.entity';
import { Brand, BrandSchema } from '../brand/entities/brand.entity';
import { Type, TypeSchema } from '../type/entities/type.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FacebookCredentials.name, schema: FacebookCredentialsSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
      { name: Type.name, schema: TypeSchema },
    ]),
  ],
  controllers: [FacebookMarketplaceController],
  providers: [FacebookMarketplaceService],
  exports: [FacebookMarketplaceService],
})
export class FacebookMarketplaceModule {}
