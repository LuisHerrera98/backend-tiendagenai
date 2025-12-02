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
      // Normalizar order: si es 0 o undefined, guardar como null
      const order = createCategoryDto.order && createCategoryDto.order >= 1 ? createCategoryDto.order : null;

      // Validar que el orden no esté duplicado (si se proporciona)
      if (order) {
        const existingWithOrder = await this.categoryModel.findOne({ tenantId, order });
        if (existingWithOrder) {
          throw new BadRequestException({
            message: `Ya existe una categoría con el orden ${order}`,
            error: 'DUPLICATE_ORDER',
            statusCode: 400
          });
        }
      }

      const categoryData = {
        ...createCategoryDto,
        name: createCategoryDto.name?.toUpperCase(),
        order,
        tenantId
      };
      const category = await this.categoryModel.create(categoryData);
      return category;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
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
      // Ordenar: primero los que tienen orden > 0 (de menor a mayor), luego los sin orden (alfabéticamente)
      const categories = await this.categoryModel.aggregate([
        { $match: { tenantId } },
        {
          $addFields: {
            hasOrder: { $cond: [{ $and: [{ $ne: ['$order', null] }, { $gt: ['$order', 0] }] }, 0, 1] }
          }
        },
        { $sort: { hasOrder: 1, order: 1, name: 1 } },
        { $project: { hasOrder: 0 } }
      ]);

      // Agregar contador de productos por categoría
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productsCount = await this.productModel.countDocuments({
            category_id: category._id,
            tenantId
          });

          return {
            ...category,
            productsCount
          };
        })
      );

      return categoriesWithCount;
    } catch (error) {
      throw new BadRequestException('Error al obtener las categorías: ' + error.message);
    }
  }

  // Obtener árbol jerárquico para ecommerce público
  async findTree(tenantId: string) {
    try {
      // Ordenar: primero los que tienen orden > 0 (de menor a mayor), luego los sin orden (alfabéticamente)
      const allCategories = await this.categoryModel.aggregate([
        { $match: { tenantId } },
        {
          $addFields: {
            hasOrder: { $cond: [{ $and: [{ $ne: ['$order', null] }, { $gt: ['$order', 0] }] }, 0, 1] }
          }
        },
        { $sort: { hasOrder: 1, order: 1, name: 1 } },
        { $project: { hasOrder: 0 } }
      ]);

      // Separar padres e hijos
      const parents = allCategories.filter(cat => !cat.parent_id);
      const children = allCategories.filter(cat => cat.parent_id);

      // Construir árbol
      const tree = await Promise.all(
        parents.map(async (parent) => {
          const subcategories = children.filter(
            child => child.parent_id?.toString() === parent._id.toString()
          );

          const productsCount = await this.productModel.countDocuments({
            category_id: parent._id,
            tenantId
          });

          const subcategoriesWithCount = await Promise.all(
            subcategories.map(async (sub) => {
              const subProductsCount = await this.productModel.countDocuments({
                category_id: sub._id,
                tenantId
              });

              return {
                ...sub.toObject(),
                productsCount: subProductsCount
              };
            })
          );

          return {
            ...parent.toObject(),
            productsCount,
            subcategories: subcategoriesWithCount
          };
        })
      );

      return tree;
    } catch (error) {
      throw new BadRequestException('Error al obtener el árbol de categorías: ' + error.message);
    }
  }

  // Obtener todas las subcategorías de una categoría (incluyendo la categoría misma)
  async getAllSubcategoryIds(tenantId: string, categoryId: string): Promise<string[]> {
    try {
      const subcategories = await this.categoryModel.find({
        parent_id: categoryId,
        tenantId
      });

      const ids = [categoryId, ...subcategories.map(sub => sub._id.toString())];
      return ids;
    } catch (error) {
      throw new BadRequestException('Error al obtener subcategorías: ' + error.message);
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
      // Normalizar order: si es 0 o undefined, guardar como null
      const order = updateCategoryDto.order && updateCategoryDto.order >= 1 ? updateCategoryDto.order : null;

      // Validar que el orden no esté duplicado (si se proporciona y es diferente)
      if (order) {
        const existingWithOrder = await this.categoryModel.findOne({
          tenantId,
          order,
          _id: { $ne: id } // Excluir la categoría actual
        });
        if (existingWithOrder) {
          throw new BadRequestException({
            message: `Ya existe una categoría con el orden ${order}`,
            error: 'DUPLICATE_ORDER',
            statusCode: 400
          });
        }
      }

      const updateData = {
        ...updateCategoryDto,
        name: updateCategoryDto.name?.toUpperCase(),
        order
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
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
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