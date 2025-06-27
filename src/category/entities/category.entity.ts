import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'categories' })
export class Category extends Document {
  @Prop({
    type: String,
    unique: true,
    required: true,
  })
  name: string;

}

export const CategorySchema = SchemaFactory.createForClass(Category);