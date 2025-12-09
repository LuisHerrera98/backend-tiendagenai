import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ versionKey: false, timestamps: true, collection: 'models' })
export class Modelo extends Document {
  @Prop({
    required: true,
    index: true,
  })
  tenantId: string;

  @Prop({
    required: true,
    index: true,
  })
  name: string;

  @Prop({
    required: true,
    index: true,
  })
  category_id: string;
}

export const ModeloSchema = SchemaFactory.createForClass(Modelo);

// Índice compuesto para asegurar unicidad por tenant y categoría
ModeloSchema.index({ tenantId: 1, name: 1, category_id: 1 }, { unique: true });
