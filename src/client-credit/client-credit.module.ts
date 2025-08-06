import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientCreditService } from './client-credit.service';
import { ClientCreditController } from './client-credit.controller';
import { ClientCredit, ClientCreditSchema } from './entities/client-credit.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClientCredit.name, schema: ClientCreditSchema }
    ])
  ],
  controllers: [ClientCreditController],
  providers: [ClientCreditService],
  exports: [ClientCreditService],
})
export class ClientCreditModule {}