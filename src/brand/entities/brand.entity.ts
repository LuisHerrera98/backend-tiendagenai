import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'brands' })
export class Brand extends Document {
  @Prop({
    type: String,
    unique: true,
    required: true,
  })
  name: string;

}

export const BrandSchema = SchemaFactory.createForClass(Brand);