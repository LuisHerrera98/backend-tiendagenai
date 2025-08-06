import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'categories', versionKey: false })
export class Category extends Document {
  @Prop({
    type: String,
    unique: false,
    required: true,
  })
  name: string;

  @Prop({
    required: true,
    index: true
  })
  tenantId: string;

}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Índice único compuesto para que cada tenant pueda tener sus propias categorías
CategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });