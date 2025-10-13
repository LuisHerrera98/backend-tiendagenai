import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSizeDto } from './dto/create-size.dto';
import { CreateMultipleSizesDto } from './dto/create-multiple-sizes.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Size } from './entities/size.entity';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { Model } from 'mongoose';

@Injectable()
export class SizeService {

  constructor(
    @InjectModel(Size.name)
    private readonly sizeModel: Model<Size>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>
  ) {}

  async create(tenantId: string, createSizeDto: CreateSizeDto) {
    try {
      // Verificar que la categoría sea padre (no tenga parent_id)
      const category = await this.categoryModel.findOne({
        _id: createSizeDto.category_id,
        tenantId
      });

      if (!category) {
        throw new BadRequestException({
          message: 'Categoría no encontrada',
          error: 'CATEGORY_NOT_FOUND',
          statusCode: 400
        });
      }

      if (category.parent_id) {
        throw new BadRequestException({
          message: 'Solo se pueden crear tallas en categorías padre. Las subcategorías heredan las tallas de su categoría padre.',
          error: 'SUBCATEGORY_CANNOT_HAVE_SIZES',
          statusCode: 400
        });
      }

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
        throw new BadRequestException({
          message: `Ya existe una talla "${sizeData.name}" en esta categoría`,
          error: 'DUPLICATE_SIZE',
          statusCode: 400
        });
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

  async createMultiple(tenantId: string, createMultipleSizesDto: CreateMultipleSizesDto) {
    try {
      const { category_id, sizes } = createMultipleSizesDto;

      // Verificar que la categoría sea padre (no tenga parent_id)
      const category = await this.categoryModel.findOne({
        _id: category_id,
        tenantId
      });

      if (!category) {
        throw new BadRequestException({
          message: 'Categoría no encontrada',
          error: 'CATEGORY_NOT_FOUND',
          statusCode: 400
        });
      }

      if (category.parent_id) {
        throw new BadRequestException({
          message: 'Solo se pueden crear tallas en categorías padre. Las subcategorías heredan las tallas de su categoría padre.',
          error: 'SUBCATEGORY_CANNOT_HAVE_SIZES',
          statusCode: 400
        });
      }

      const createdSizes = [];
      const errors = [];
      const skipped = [];

      // Procesar cada talla
      for (const sizeItem of sizes) {
        const sizeName = sizeItem.name?.trim().toUpperCase();
        
        if (!sizeName) {
          continue; // Saltar nombres vacíos
        }

        // Verificar si ya existe
        const existingSize = await this.sizeModel.findOne({
          name: sizeName,
          category_id,
          tenantId
        });

        if (existingSize) {
          skipped.push({
            name: sizeName,
            reason: 'Ya existe'
          });
          continue;
        }

        try {
          const newSize = await this.sizeModel.create({
            name: sizeName,
            category_id,
            tenantId
          });
          createdSizes.push(newSize);
        } catch (error) {
          errors.push({
            name: sizeName,
            error: error.message
          });
        }
      }

      return {
        success: true,
        created: createdSizes,
        skipped,
        errors,
        summary: {
          total: sizes.length,
          created: createdSizes.length,
          skipped: skipped.length,
          errors: errors.length
        }
      };
    } catch (error) {
      throw new BadRequestException('Error al crear las tallas: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const sizes = await this.sizeModel
        .find({ tenantId })
        .populate('category_id', 'name')
        .sort({ name: 1 });
      return sizes;
    } catch (error) {
      throw new BadRequestException('Error al obtener las tallas: ' + error.message);
    }
  }

  async findAllByCategory(tenantId: string, categoryId: string) {
    try {
      // Verificar si la categoría existe y si tiene parent_id
      const category = await this.categoryModel.findOne({
        _id: categoryId,
        tenantId
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      // Si la categoría tiene parent_id, buscar tallas del padre
      const searchCategoryId = category.parent_id || categoryId;

      const sizes = await this.sizeModel
        .find({ category_id: searchCategoryId, tenantId })
        .populate('category_id', 'name')
        .sort({ name: 1 });

      return sizes;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
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
      const currentSize = await this.sizeModel.findOne({ _id: id, tenantId });
      if (!currentSize) {
        throw new NotFoundException('Talla no encontrada');
      }

      // 🔒 BLOQUEAR edición de nombre si tiene productos asignados
      if (updateSizeDto.name && updateSizeDto.name.toUpperCase() !== currentSize.name) {
        const productsWithSize = await this.productModel.countDocuments({
          'stock.size_id': id,
          tenantId
        });

        if (productsWithSize > 0) {
          throw new ConflictException({
            message: `No se puede editar "${currentSize.name}": ${productsWithSize} producto(s) la usa(n)`,
            error: 'SIZE_IN_USE',
            statusCode: 409,
            productsCount: productsWithSize,
            canEdit: false
          });
        }
      }

      // Si se está actualizando el nombre o la categoría, verificar duplicados
      if (updateSizeDto.name || updateSizeDto.category_id) {
        const nameToCheck = updateSizeDto.name?.toUpperCase() || currentSize.name;
        const categoryToCheck = updateSizeDto.category_id || currentSize.category_id;

        const existingSize = await this.sizeModel.findOne({
          name: nameToCheck,
          category_id: categoryToCheck,
          tenantId,
          _id: { $ne: id } // Excluir el registro actual
        });

        if (existingSize) {
          throw new BadRequestException({
            message: `Ya existe una talla "${nameToCheck}" en esta categoría`,
            error: 'DUPLICATE_SIZE',
            statusCode: 400
          });
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
        // Lanzar excepción 409 Conflict cuando la talla está en uso
        throw new ConflictException({
          message: `No se puede eliminar "${size.name}": ${productsWithSize} producto(s) la usa(n)`,
          error: 'SIZE_IN_USE',
          statusCode: 409,
          productsCount: productsWithSize,
          canDelete: false
        });
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