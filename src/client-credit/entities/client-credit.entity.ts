import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ versionKey: false })
export class ClientCredit extends Document {
  @Prop({ required: true, index: true })
  document_number: string; // DNI, CI, etc.

  @Prop({ default: '' })
  phone: string; // Teléfono alternativo para búsqueda

  @Prop({ default: '' })
  client_name: string; // Nombre del cliente (opcional)

  @Prop({ required: true })
  amount: number; // Monto del crédito

  @Prop({ required: true })
  original_sale_amount: number; // Monto original de la venta que generó el crédito

  @Prop({ required: true })
  reason: string; // Motivo del crédito (ej: "Cambio de producto - diferencia a favor")

  @Prop({ type: Types.ObjectId, ref: 'Exchange' })
  related_exchange_id: Types.ObjectId; // Referencia al intercambio que generó el crédito

  @Prop({ 
    enum: ['active', 'used', 'expired'],
    default: 'active'
  })
  status: string;

  @Prop({ default: null })
  used_in_sale_id: string; // ID de la venta donde se usó el crédito

  @Prop({ default: null })
  used_at: Date; // Cuándo se usó el crédito

  @Prop({
    default: () => {
      const date = new Date();
      date.setHours(date.getHours() - 3);
      return date;
    }
  })
  created_at: Date;

  @Prop({ default: null })
  expires_at: Date; // Solo se establece cuando se usa el crédito

  @Prop({ default: '' })
  notes: string; // Notas adicionales
}

export const ClientCreditSchema = SchemaFactory.createForClass(ClientCredit);