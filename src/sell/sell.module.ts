import { Module } from '@nestjs/common';
import { SellService } from './sell.service';
import { SellController } from './sell.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Sell, SellSchema, DateSell, DateSellSchema } from './entities/sell.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sell.name, schema: SellSchema },
      { name: DateSell.name, schema: DateSellSchema }
    ])
  ],
  controllers: [SellController],
  providers: [SellService],
  exports: [SellService],
})
export class SellModule {}