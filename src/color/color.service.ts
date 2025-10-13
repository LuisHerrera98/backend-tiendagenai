import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Color } from './entities/color.entity';
import { Product } from '../product/entities/product.entity';
import { Model } from 'mongoose';

@Injectable()
export class ColorService {

  constructor(
    @InjectModel(Color.name)
    private readonly colorModel: Model<Color>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>
  ) {}

  async create(tenantId: string, createColorDto: CreateColorDto) {
    try {
      const colorData = {
        ...createColorDto,
        name: createColorDto.name?.toUpperCase(),
        tenantId
      };
      const color = await this.colorModel.create(colorData);
      return color;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe un color con ese nombre',
          error: 'DUPLICATE_COLOR',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al crear el color: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const colors = await this.colorModel.find({ tenantId }).sort({ name: 1 });

      // Agregar contador de productos por color
      const colorsWithCount = await Promise.all(
        colors.map(async (color) => {
          const productsCount = await this.productModel.countDocuments({
            color_name: color.name,
            tenantId
          });

          return {
            ...color.toObject(),
            productsCount
          };
        })
      );

      return colorsWithCount;
    } catch (error) {
      throw new BadRequestException('Error al obtener los colores: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const color = await this.colorModel.findOne({ _id: id, tenantId });
      
      if (!color) {
        throw new NotFoundException('Color no encontrado');
      }
      
      return color;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener el color: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateColorDto: UpdateColorDto) {
    try {
      const updateData = {
        ...updateColorDto,
        name: updateColorDto.name?.toUpperCase()
      };
      const color = await this.colorModel.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true }
      );
      
      if (!color) {
        throw new NotFoundException('Color no encontrado');
      }
      
      return color;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe un color con ese nombre',
          error: 'DUPLICATE_COLOR',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al actualizar el color: ' + error.message);
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      // Verificar que el color existe
      const color = await this.colorModel.findOne({ _id: id, tenantId });

      if (!color) {
        throw new NotFoundException('Color no encontrado');
      }

      // Verificar si hay productos asociados a este color
      const productsCount = await this.productModel.countDocuments({
        color_name: color.name,
        tenantId
      });

      if (productsCount > 0) {
        throw new BadRequestException({
          message: `No se puede eliminar el color "${color.name}" porque tiene ${productsCount} producto(s) asociado(s)`,
          error: 'COLOR_HAS_PRODUCTS',
          statusCode: 400,
          productsCount
        });
      }

      // Eliminar el color
      await this.colorModel.findOneAndDelete({ _id: id, tenantId });

      return {
        message: 'Color eliminado exitosamente',
        color
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar el color: ' + error.message);
    }
  }
}