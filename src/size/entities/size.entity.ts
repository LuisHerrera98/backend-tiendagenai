import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ versionKey: false })
export class Size extends Document {
  // Campo de identificación del tenant para soporte multi-tenant
  @Prop({
    required: true,
    index: true,
  })
  tenantId: string;

  @Prop({
    index: true,
  })
  name: string;

  @Prop()
  category_id: string;
}

export const SizeSchema = SchemaFactory.createForClass(Size);

// Índice compuesto para asegurar unicidad por tenant
SizeSchema.index({ tenantId: 1, name: 1, category_id: 1 }, { unique: true });