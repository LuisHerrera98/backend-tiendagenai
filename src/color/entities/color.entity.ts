import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'colors', versionKey: false })
export class Color extends Document {
  // Campo de identificación del tenant para soporte multi-tenant
  @Prop({
    required: true,
    index: true,
  })
  tenantId: string;

  @Prop({
    type: String,
    required: true,
  })
  name: string;

  @Prop({
    type: String,
    required: false,
  })
  hex_code: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  active: boolean;
}

export const ColorSchema = SchemaFactory.createForClass(Color);

// Índice compuesto para asegurar unicidad del nombre por tenant
ColorSchema.index({ tenantId: 1, name: 1 }, { unique: true });