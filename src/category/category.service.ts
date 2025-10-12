import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './entities/category.entity';
import { Size } from '../size/entities/size.entity';
import { Product } from '../product/entities/product.entity';
import { Model } from 'mongoose';

@Injectable()
export class CategoryService {

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    @InjectModel(Size.name)
    private readonly sizeModel: Model<Size>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>
  ) {}

  async create(tenantId: string, createCategoryDto: CreateCategoryDto) {
    try {
      const categoryData = {
        ...createCategoryDto,
        name: createCategoryDto.name?.toUpperCase(),
        tenantId
      };
      const category = await this.categoryModel.create(categoryData);
      return category;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe una categoría con ese nombre',
          error: 'DUPLICATE_CATEGORY',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al crear la categoría: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const categories = await this.categoryModel.find({ tenantId }).sort({ name: 1 });

      // Agregar contador de productos por categoría
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productsCount = await this.productModel.countDocuments({
            category_id: category._id,
            tenantId
          });

          return {
            ...category.toObject(),
            productsCount
          };
        })
      );

      return categoriesWithCount;
    } catch (error) {
      throw new BadRequestException('Error al obtener las categorías: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const category = await this.categoryModel.findOne({ _id: id, tenantId });
      
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
      
      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener la categoría: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      const updateData = {
        ...updateCategoryDto,
        name: updateCategoryDto.name?.toUpperCase()
      };
      const category = await this.categoryModel.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true }
      );
      
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
      
      return category;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe una categoría con ese nombre',
          error: 'DUPLICATE_CATEGORY',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al actualizar la categoría: ' + error.message);
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      // Verificar que la categoría existe
      const category = await this.categoryModel.findOne({ _id: id, tenantId });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }

      // Verificar si hay productos asociados a esta categoría
      const productsCount = await this.productModel.countDocuments({
        category_id: id,
        tenantId
      });

      if (productsCount > 0) {
        throw new BadRequestException({
          message: `No se puede eliminar la categoría "${category.name}" porque tiene ${productsCount} producto(s) asociado(s)`,
          error: 'CATEGORY_HAS_PRODUCTS',
          statusCode: 400,
          productsCount
        });
      }

      // Si no hay productos, eliminar todas las tallas asociadas a esta categoría
      const deletedSizes = await this.sizeModel.deleteMany({ category_id: id, tenantId });

      // Eliminar la categoría
      await this.categoryModel.findOneAndDelete({ _id: id, tenantId });

      return {
        message: 'Categoría eliminada exitosamente',
        category,
        deletedSizesCount: deletedSizes.deletedCount
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar la categoría: ' + error.message);
    }
  }
}