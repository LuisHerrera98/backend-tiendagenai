import { Module } from '@nestjs/common';
import { SellService } from './sell.service';
import { SellController } from './sell.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Sell, SellSchema, DateSell, DateSellSchema } from './entities/sell.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { ClientCreditModule } from '../client-credit/client-credit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sell.name, schema: SellSchema },
      { name: DateSell.name, schema: DateSellSchema },
      { name: Product.name, schema: ProductSchema }
    ]),
    ClientCreditModule,
  ],
  controllers: [SellController],
  providers: [SellService],
  exports: [SellService],
})
export class SellModule {}