import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',    // Pedido nuevo, esperando ser armado
  READY = 'armado',       // Pedido armado, listo para entregar
  DELIVERED = 'entregado', // Pedido entregado al cliente
  CANCELLED = 'cancelado'  // Pedido cancelado
}

export enum PaymentStatus {
  PENDING = 'pending',           // Pago pendiente
  PROCESSING = 'processing',     // Procesando pago
  APPROVED = 'approved',         // Pago aprobado
  REJECTED = 'rejected',         // Pago rechazado
  REFUNDED = 'refunded',         // Pago reembolsado
  CANCELLED = 'cancelled',       // Pago cancelado
  IN_PROCESS = 'in_process',     // En proceso (MP)
  IN_MEDIATION = 'in_mediation', // En mediación (MP)
  CHARGED_BACK = 'charged_back'  // Contracargo (MP)
}

export enum PaymentMethod {
  CASH = 'cash',                 // Efectivo
  TRANSFER = 'transfer',         // Transferencia
  MERCADO_PAGO = 'mercado_pago', // Mercado Pago
  QR = 'qr',                     // QR
  CARD = 'card'                  // Tarjeta (manual)
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

  // Campos de pago
  @Prop({
    type: String,
    enum: PaymentMethod,
    default: PaymentMethod.CASH
  })
  paymentMethod: PaymentMethod;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  // Campos específicos de Mercado Pago
  @Prop({ type: Object })
  mercadoPagoData?: {
    preferenceId?: string;
    paymentId?: string;
    merchantOrderId?: string;
    collectionId?: string;
    collectionStatus?: string;
    externalReference?: string;
    paymentType?: string;
    processingMode?: string;
    merchantAccountId?: string;
    payer?: {
      id?: string;
      email?: string;
      identification?: {
        type?: string;
        number?: string;
      };
    };
    transactionDetails?: {
      netReceivedAmount?: number;
      totalPaidAmount?: number;
      installmentAmount?: number;
      overpaidAmount?: number;
    };
    feeDetails?: Array<{
      type?: string;
      amount?: number;
      feePayer?: string;
    }>;
    lastFourDigits?: string;
    statementDescriptor?: string;
    dateApproved?: Date;
    dateCreated?: Date;
    lastModified?: Date;
  };

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