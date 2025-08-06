import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ versionKey: false })
export class Exchange extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Sell', required: true })
  original_sell_id: Types.ObjectId;

  @Prop({ required: true })
  original_product_name: string;

  @Prop({ required: true })
  original_size_name: string;

  @Prop({ required: true })
  original_price: number;

  @Prop({ required: true })
  original_cost: number;

  @Prop({ type: [{}], default: [] })
  original_images: any[];

  @Prop({ required: true })
  new_product_id: string;

  @Prop({ required: true })
  new_product_name: string;

  @Prop({ required: true })
  new_size_id: string;

  @Prop({ required: true })
  new_size_name: string;

  @Prop({ required: true })
  new_price: number;

  @Prop({ required: true })
  new_cost: number;

  @Prop({ type: [{}], default: [] })
  new_images: any[];

  @Prop({ required: true })
  price_difference: number; // Positivo = cliente debe pagar, Negativo = a favor del cliente

  @Prop({ 
    required: true,
    enum: ['efectivo', 'transferencia', 'qr', 'tarjeta', 'no_aplica'],
    default: 'no_aplica'
  })
  payment_method_difference: string; // Para la diferencia de precio

  @Prop({ 
    required: true,
    enum: ['completado', 'pendiente', 'cancelado'],
    default: 'completado'
  })
  status: string;

  @Prop({
    default: () => {
      const date = new Date();
      date.setHours(date.getHours() - 3);
      return date.toISOString().split('T')[0];
    }
  })
  exchange_date: string;

  @Prop({
    default: () => {
      const date = new Date();
      return date.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
  })
  exchange_time: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ 
    enum: ['individual', 'massive'],
    default: 'individual'
  })
  exchange_type: string;
}

export const ExchangeSchema = SchemaFactory.createForClass(Exchange);