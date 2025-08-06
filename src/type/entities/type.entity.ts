import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'types', versionKey: false })
export class Type extends Document {
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
}

export const TypeSchema = SchemaFactory.createForClass(Type);

// Índice compuesto para asegurar unicidad del nombre por tenant
TypeSchema.index({ tenantId: 1, name: 1 }, { unique: true });