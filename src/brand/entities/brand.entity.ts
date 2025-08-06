import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'brands', versionKey: false })
export class Brand extends Document {
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

export const BrandSchema = SchemaFactory.createForClass(Brand);

// Índice compuesto para asegurar unicidad del nombre por tenant
BrandSchema.index({ tenantId: 1, name: 1 }, { unique: true });