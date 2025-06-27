import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class DateSell extends Document {
  @Prop({ required: true, unique: true })
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

@Schema()
export class Sell extends Document {
  @Prop({ type: Types.ObjectId, ref: 'DateSell', required: true })
  dateSell_id: Types.ObjectId;

  @Prop({ required: true })
  product_name: string;

  @Prop({ required: true })
  size_name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  cost: number;

  @Prop({ type: [{}], default: [] })
  images: any[];

  @Prop({
    default: () => {
      const date = new Date();
      date.setHours(date.getHours());
      return date.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
  })
  createdAt: string;
}

export const SellSchema = SchemaFactory.createForClass(Sell);