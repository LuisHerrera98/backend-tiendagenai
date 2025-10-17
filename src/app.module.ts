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
import { ExchangeModule } from './exchange/exchange.module';
import { TypeModule } from './type/type.module';
import { GenderModule } from './gender/gender.module';
import { ColorModule } from './color/color.module';
import { ClientCreditModule } from './client-credit/client-credit.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { EmailModule } from './email/email.module';
import { FacebookMarketplaceModule } from './facebook-marketplace/facebook-marketplace.module';

@Module({
  imports: [
    CloudinaryModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    HealthModule,
    TenantModule,
    AuthModule,
    UserModule,
    SizeModule,
    CommonModule,
    FileModule,
    CategoryModule,
    ProductModule,
    SellModule,
    BrandModule,
    ExchangeModule,
    TypeModule,
    GenderModule,
    ColorModule,
    ClientCreditModule,
    PublicModule,
    OrderModule,
    PaymentModule,
    EmailModule,
    FacebookMarketplaceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
