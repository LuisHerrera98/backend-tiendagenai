import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { Exchange, ExchangeSchema } from './entities/exchange.entity';
import { Sell, SellSchema } from '../sell/entities/sell.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { ClientCreditModule } from '../client-credit/client-credit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exchange.name, schema: ExchangeSchema },
      { name: Sell.name, schema: SellSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    ClientCreditModule,
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}