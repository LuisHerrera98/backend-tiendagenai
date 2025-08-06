import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'genders', versionKey: false })
export class Gender extends Document {
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

export const GenderSchema = SchemaFactory.createForClass(Gender);

// Índice compuesto para asegurar unicidad del nombre por tenant
GenderSchema.index({ tenantId: 1, name: 1 }, { unique: true });