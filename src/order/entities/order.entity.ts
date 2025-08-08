import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',    // Pedido nuevo, esperando ser armado
  READY = 'armado',       // Pedido armado, listo para entregar
  DELIVERED = 'entregado', // Pedido entregado al cliente
  CANCELLED = 'cancelado'  // Pedido cancelado
}

@Schema({ 
  collection: 'orders', 
  versionKey: false,
  timestamps: true 
})
export class Order extends Document {
  @Prop({
    required: true,
    index: true
  })
  tenantId: string;

  @Prop({
    required: true,
    unique: true
  })
  orderNumber: string;

  @Prop({
    required: true
  })
  customerName: string;

  @Prop({
    required: true
  })
  customerPhone: string;

  @Prop()
  customerEmail?: string;

  @Prop({
    type: [{
      productId: String,
      productName: String,
      sizeId: String,
      sizeName: String,
      quantity: Number,
      price: Number,
      discount: Number,
      subtotal: Number
    }],
    required: true
  })
  items: Array<{
    productId: string;
    productName: string;
    sizeId: string;
    sizeName: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
  }>;

  @Prop({
    required: true
  })
  subtotal: number;

  @Prop({
    default: 0
  })
  discount: number;

  @Prop({
    required: true
  })
  total: number;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING
  })
  status: OrderStatus;

  @Prop()
  notes?: string;

  @Prop({
    type: Date,
    default: Date.now
  })
  createdAt: Date;

  @Prop()
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Índices
OrderSchema.index({ tenantId: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, status: 1 });
OrderSchema.index({ tenantId: 1, customerPhone: 1 });