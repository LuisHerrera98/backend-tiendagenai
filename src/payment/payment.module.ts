import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MercadoPagoService } from './mercadopago.service';
import { Tenant, TenantSchema } from '../tenant/entities/tenant.entity';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { EncryptionService } from '../common/services/encryption.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, MercadoPagoService, EncryptionService],
  exports: [PaymentService, MercadoPagoService],
})
export class PaymentModule {}