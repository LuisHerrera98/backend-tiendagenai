import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateModeloDto } from './dto/create-modelo.dto';
import { UpdateModeloDto } from './dto/update-modelo.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Modelo } from './entities/modelo.entity';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { Model } from 'mongoose';

@Injectable()
export class ModeloService {
  constructor(
    @InjectModel(Modelo.name)
    private readonly modeloModel: Model<Modelo>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {}

  async create(tenantId: string, createModeloDto: CreateModeloDto) {
    try {
      // Verificar que la categoría sea padre (no tenga parent_id)
      const category = await this.categoryModel.findOne({
        _id: createModeloDto.category_id,
        tenantId,
      });

      if (!category) {
        throw new BadRequestException({
          message: 'Categoría no encontrada',
          error: 'CATEGORY_NOT_FOUND',
          statusCode: 400,
        });
      }

      if (category.parent_id) {
        throw new BadRequestException({
          message: 'Solo se pueden crear modelos en categorías padre. Las subcategorías heredan los modelos de su categoría padre.',
          error: 'SUBCATEGORY_CANNOT_HAVE_MODELOS',
          statusCode: 400,
        });
      }

      const modeloData = {
        ...createModeloDto,
        name: createModeloDto.name?.trim(),
        tenantId,
      };

      // Verificar si ya existe un modelo con el mismo nombre en la misma categoría
      const existingModelo = await this.modeloModel.findOne({
        name: { $regex: new RegExp(`^${modeloData.name}$`, 'i') },
        category_id: createModeloDto.category_id,
        tenantId,
      });

      if (existingModelo) {
        throw new BadRequestException({
          message: `Ya existe un modelo "${modeloData.name}" en esta categoría`,
          error: 'DUPLICATE_MODELO',
          statusCode: 400,
        });
      }

      const modelo = await this.modeloModel.create(modeloData);
      return modelo;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el modelo: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const modelos = await this.modeloModel
        .find({ tenantId })
        .populate('category_id', 'name')
        .sort({ name: 1 });
      return modelos;
    } catch (error) {
      throw new BadRequestException('Error al obtener los modelos: ' + error.message);
    }
  }

  async findAllByCategory(tenantId: string, categoryId: string) {
    try {
      // Verificar si la categoría existe y si tiene parent_id
      const category = await this.categoryModel.findOne({
        _id: categoryId,
        tenantId,
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      // Si la categoría tiene parent_id, buscar modelos del padre
      const searchCategoryId = category.parent_id || categoryId;

      const modelos = await this.modeloModel
        .find({ category_id: searchCategoryId, tenantId })
        .populate('category_id', 'name')
        .sort({ name: 1 });

      return modelos;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener los modelos por categoría: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const modelo = await this.modeloModel.findOne({ _id: id, tenantId });

      if (!modelo) {
        throw new NotFoundException('Modelo no encontrado');
      }

      return modelo;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener el modelo: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateModeloDto: UpdateModeloDto) {
    try {
      const currentModelo = await this.modeloModel.findOne({ _id: id, tenantId });
      if (!currentModelo) {
        throw new NotFoundException('Modelo no encontrado');
      }

      // Bloquear edición de nombre si tiene productos asignados
      if (updateModeloDto.name && updateModeloDto.name.trim().toLowerCase() !== currentModelo.name.toLowerCase()) {
        const productsWithModelo = await this.productModel.countDocuments({
          modelo_id: id,
          tenantId,
        });

        if (productsWithModelo > 0) {
          throw new ConflictException({
            message: `No se puede editar "${currentModelo.name}": ${productsWithModelo} producto(s) lo usa(n)`,
            error: 'MODELO_IN_USE',
            statusCode: 409,
            productsCount: productsWithModelo,
            canEdit: false,
          });
        }
      }

      // Si se está actualizando el nombre o la categoría, verificar duplicados
      if (updateModeloDto.name || updateModeloDto.category_id) {
        const nameToCheck = updateModeloDto.name?.trim() || currentModelo.name;
        const categoryToCheck = updateModeloDto.category_id || currentModelo.category_id;

        const existingModelo = await this.modeloModel.findOne({
          name: { $regex: new RegExp(`^${nameToCheck}$`, 'i') },
          category_id: categoryToCheck,
          tenantId,
          _id: { $ne: id },
        });

        if (existingModelo) {
          throw new BadRequestException({
            message: `Ya existe un modelo "${nameToCheck}" en esta categoría`,
            error: 'DUPLICATE_MODELO',
            statusCode: 400,
          });
        }
      }

      const updateData = {
        ...updateModeloDto,
        name: updateModeloDto.name?.trim(),
      };

      const modelo = await this.modeloModel.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true },
      );

      if (!modelo) {
        throw new NotFoundException('Modelo no encontrado');
      }

      return modelo;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar el modelo: ' + error.message);
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      const modelo = await this.modeloModel.findOne({ _id: id, tenantId });

      if (!modelo) {
        throw new NotFoundException('Modelo no encontrado');
      }

      // Verificar si existen productos que usan este modelo
      const productsWithModelo = await this.productModel.countDocuments({
        modelo_id: id,
        tenantId,
      });

      if (productsWithModelo > 0) {
        throw new ConflictException({
          message: `No se puede eliminar "${modelo.name}": ${productsWithModelo} producto(s) lo usa(n)`,
          error: 'MODELO_IN_USE',
          statusCode: 409,
          productsCount: productsWithModelo,
          canDelete: false,
        });
      }

      await this.modeloModel.findOneAndDelete({ _id: id, tenantId });

      return {
        success: true,
        canDelete: true,
        message: 'Modelo eliminado exitosamente',
        modelo,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar el modelo: ' + error.message);
    }
  }
}
