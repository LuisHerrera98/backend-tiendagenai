import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ versionKey: false })
export class DateSell extends Document {
  // Campo de identificación del tenant para soporte multi-tenant
  @Prop({
    required: true,
    index: true,
  })
  tenantId: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    default: () => {
      const date = new Date();
      date.setHours(date.getHours() - 3);
      return date;
    }
  })
  date: Date;
}

export const DateSellSchema = SchemaFactory.createForClass(DateSell);

@Schema({ versionKey: false })
export class Sell extends Document {
  // Campo de identificación del tenant para soporte multi-tenant
  @Prop({
    required: true,
    index: true,
  })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: 'DateSell', required: true })
  dateSell_id: Types.ObjectId;

  @Prop({ required: true })
  product_name: string;

  @Prop({ required: true })
  size_name: string;

  @Prop({ required: true })
  price: number; // Precio de venta real (efectivo/transferencia)

  @Prop({ required: false })
  listPrice: number; // Precio de lista original (opcional, para referencia)

  @Prop({ required: true })
  cost: number;

  @Prop({ type: [{}], default: [] })
  images: any[];

  @Prop({ 
    required: true,
    enum: ['efectivo', 'transferencia', 'qr', 'tarjeta', 'no_aplica'],
    default: 'efectivo'
  })
  method_payment: string;

  @Prop({ 
    enum: ['normal', 'anulada_por_cambio', 'nueva_por_cambio'],
    default: 'normal'
  })
  exchange_type: string;

  @Prop({ type: Types.ObjectId, ref: 'Exchange', default: null })
  related_exchange_id: Types.ObjectId;

  @Prop({ type: [{}], default: [] })
  original_product_info: any[]; // Para mostrar info del producto cambiado

  @Prop({ type: [{}], default: [] })
  new_product_info: any[]; // Para mostrar info del producto nuevo (en ventas anuladas)

  @Prop({ type: {}, default: null })
  size_change_info: {
    original_size: string;
    new_size: string;
    changed_at: Date;
  }; // Para mostrar info del cambio de talle

  @Prop({ default: 0 })
  exchange_count: number; // Contador de cuántos cambios ha tenido esta venta

  @Prop({ default: null })
  transaction_id: string; // Identificador único para agrupar ventas de la misma transacción

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  registered_by: Types.ObjectId; // Usuario que registró la venta

  @Prop({ default: null })
  registered_by_name: string; // Nombre del usuario (desnormalizado para consultas rápidas)

  // Datos del producto desnormalizados para consultas rápidas
  @Prop({ default: null })
  category_id: string;

  @Prop({ default: null })
  category_name: string;

  @Prop({ default: null })
  color_id: string;

  @Prop({ default: null })
  color_name: string;

  @Prop({ type: [String], default: [] })
  genders: string[]; // Array de ObjectIds de géneros

  @Prop({ default: null })
  gender_names: string; // Nombres concatenados "Hombre, Mujer"

  @Prop({
    default: () => {
      const date = new Date();
      date.setHours(date.getHours() - 3); // UTC-3
      return date;
    }
  })
  createdAt: Date;
}

export const SellSchema = SchemaFactory.createForClass(Sell);

// Índice compuesto para asegurar unicidad del nombre de fecha por tenant
DateSellSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// Índices para mejorar las consultas por tenant en ventas
SellSchema.index({ tenantId: 1, dateSell_id: 1 });
SellSchema.index({ tenantId: 1, transaction_id: 1 });
SellSchema.index({ tenantId: 1, createdAt: -1 });