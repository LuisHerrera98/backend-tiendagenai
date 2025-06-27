import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Size extends Document {
  @Prop({
    index: true,
  })
  name: string;

  @Prop()
  category_id: string;
}

export const SizeSchema = SchemaFactory.createForClass(Size);