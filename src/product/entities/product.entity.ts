import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema()
export class Product extends Document{
    @Prop({
        unique: false,
        required: true
    })
    name: string;

    @Prop({
        unique: true,
        required: true
    })
    code: string;

    @Prop({
        unique: false,
        required: false
    })
    category_id: string;
    
    @Prop({
        unique: false,
        required: false
    })
    model_name: string;

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
        type: Array,
        default: []
    })
    images: any[];

    @Prop({
        unique: false,
        required: true,
        default: true
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
        unique: false,
        required: false
    })
    brand_name: string;

    @Prop({
        unique: false,
        required: false,
        default: 0
    })
    discount: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product)