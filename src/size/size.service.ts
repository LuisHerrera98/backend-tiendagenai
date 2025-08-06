import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Size } from './entities/size.entity';
import { Product } from '../product/entities/product.entity';
import { Model } from 'mongoose';

@Injectable()
export class SizeService {

  constructor(
    @InjectModel(Size.name)
    private readonly sizeModel: Model<Size>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>
  ) {}

  async create(tenantId: string, createSizeDto: CreateSizeDto) {
    try {
      const sizeData = {
        ...createSizeDto,
        name: createSizeDto.name?.toUpperCase(),
        tenantId
      };

      // Verificar si ya existe una talla con el mismo nombre en la misma categoría
      const existingSize = await this.sizeModel.findOne({
        name: sizeData.name,
        category_id: createSizeDto.category_id,
        tenantId
      });

      if (existingSize) {
        throw new BadRequestException(`Ya existe una talla "${sizeData.name}" en esta categoría`);
      }

      const size = await this.sizeModel.create(sizeData);
      return size;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la talla: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const sizes = await this.sizeModel.find({ tenantId }).sort({ name: 1 });
      return sizes;
    } catch (error) {
      throw new BadRequestException('Error al obtener las tallas: ' + error.message);
    }
  }

  async findAllByCategory(tenantId: string, categoryId: string) {
    try {
      const sizes = await this.sizeModel.find({ category_id: categoryId, tenantId }).sort({ name: 1 });
      return sizes;
    } catch (error) {
      throw new BadRequestException('Error al obtener las tallas por categoría: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const size = await this.sizeModel.findOne({ _id: id, tenantId });
      
      if (!size) {
        throw new NotFoundException('Talla no encontrada');
      }
      
      return size;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener la talla: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateSizeDto: UpdateSizeDto) {
    try {
      // Si se está actualizando el nombre o la categoría, verificar duplicados
      if (updateSizeDto.name || updateSizeDto.category_id) {
        const currentSize = await this.sizeModel.findOne({ _id: id, tenantId });
        if (!currentSize) {
          throw new NotFoundException('Talla no encontrada');
        }

        const nameToCheck = updateSizeDto.name?.toUpperCase() || currentSize.name;
        const categoryToCheck = updateSizeDto.category_id || currentSize.category_id;

        const existingSize = await this.sizeModel.findOne({
          name: nameToCheck,
          category_id: categoryToCheck,
          tenantId,
          _id: { $ne: id } // Excluir el registro actual
        });

        if (existingSize) {
          throw new BadRequestException(`Ya existe una talla "${nameToCheck}" en esta categoría`);
        }
      }

      const updateData = {
        ...updateSizeDto,
        name: updateSizeDto.name?.toUpperCase()
      };

      const size = await this.sizeModel.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true }
      );
      
      if (!size) {
        throw new NotFoundException('Talla no encontrada');
      }
      
      return size;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar la talla: ' + error.message);
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      const size = await this.sizeModel.findOne({ _id: id, tenantId });
      
      if (!size) {
        throw new NotFoundException('Talla no encontrada');
      }

      // Verificar si existen productos que usan esta talla
      const productsWithSize = await this.productModel.countDocuments({
        'stock.size_id': id,
        tenantId
      });

      if (productsWithSize > 0) {
        // En lugar de lanzar error, devolver respuesta con información
        return {
          success: false,
          canDelete: false,
          message: `No se puede eliminar la talla "${size.name}" porque hay ${productsWithSize} producto(s) que la están usando. Primero debes eliminar o modificar esos productos.`,
          productsCount: productsWithSize,
          size
        };
      }
      
      await this.sizeModel.findOneAndDelete({ _id: id, tenantId });
      
      return { 
        success: true,
        canDelete: true,
        message: 'Talla eliminada exitosamente', 
        size 
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar la talla: ' + error.message);
    }
  }
}