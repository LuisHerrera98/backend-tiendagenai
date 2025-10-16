import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import * as mongoose from 'mongoose';

@Schema({ versionKey: false })
export class Product extends Document{
    @Prop({
        unique: false,
        required: true
    })
    name: string;

    @Prop({
        unique: false,
        required: true,
        index: true
    })
    code: string;

    @Prop({
        unique: false,
        required: false,
        index: true
    })
    category_id: string;
    
    @Prop({
        unique: false,
        required: false,
        index: true
    })
    type_id: string;

    @Prop({
        unique: false,
        required: true
    })
    cost: number;

    @Prop({
        unique: false,
        required: true
    })
    price: number;

    @Prop({
        unique: false,
        required: false
    })
    cashPrice: number;

    @Prop({
        unique: false,
        type: Array,
        default: []
    })
    images: any[];

    @Prop({
        unique: false,
        required: true,
        default: true,
        index: true
    })
    active: boolean;

    @Prop({
        unique: false,
        required: false,
        type: Array,
        default: []
    })
    stock: any[];

    @Prop({
        required: false,
        type: String,
        enum: ['sizes', 'unit'],
        default: 'sizes'
    })
    stockType: string;

    @Prop({
        unique: false,
        required: false,
        index: true
    })
    brand_id: string;

    @Prop({
        unique: false,
        required: false,
        default: 0
    })
    discount: number;

    @Prop({
        unique: false,
        required: false,
        index: true
    })
    gender_id: string;

    @Prop({
        unique: false,
        required: false,
        index: true
    })
    color_id: string;

    @Prop({
        required: true,
        index: true
    })
    tenantId: string;

    @Prop({
        required: false
    })
    description: string;

    @Prop({
        required: false
    })
    installmentText: string;

    @Prop({
        required: false,
        default: false
    })
    withoutStock: boolean;

    @Prop({
        required: false
    })
    brand_name: string;

    @Prop({
        required: false
    })
    model_name: string;

    @Prop({
        required: false,
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Gender' }],
        default: []
    })
    genders: mongoose.Schema.Types.ObjectId[];
}

export const ProductSchema = SchemaFactory.createForClass(Product)

// Add compound indexes for common filter combinations
ProductSchema.index({ category_id: 1, brand_id: 1 });
ProductSchema.index({ category_id: 1, gender_id: 1 });
ProductSchema.index({ category_id: 1, color_id: 1 });
ProductSchema.index({ active: 1, category_id: 1 });
ProductSchema.index({ brand_id: 1, type_id: 1 });
ProductSchema.index({ tenantId: 1, code: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, active: 1 });