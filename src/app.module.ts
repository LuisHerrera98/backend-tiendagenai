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
import { ClientCreditModule } from './client-credit/client-credit.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    CloudinaryModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      'mongodb+srv://Lucho:mision2017@db-trendsneakers.bday4jw.mongodb.net/ecommerce-test',
    ),
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
    ClientCreditModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
