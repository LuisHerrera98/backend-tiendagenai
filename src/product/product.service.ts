import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './entities/product.entity';
import { Size } from '../size/entities/size.entity';
import { Brand } from '../brand/entities/brand.entity';
import { Type } from '../type/entities/type.entity';
import { Gender } from '../gender/entities/gender.entity';
import { Model, ObjectId } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ProductService {

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(Size.name)
    private readonly sizeModel: Model<Size>,
    @InjectModel(Brand.name)
    private readonly brandModel: Model<Brand>,
    @InjectModel(Type.name)
    private readonly typeModel: Model<Type>,
    @InjectModel(Gender.name)
    private readonly genderModel: Model<Gender>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async create(tenantId: string, createProductDto: CreateProductDto) {
    try {
      // Generar código automático autoincremental
      const lastProduct = await this.productModel.findOne({ tenantId }).sort({ code: -1 }).exec();
      let nextCode = 1;
      
      if (lastProduct && lastProduct.code) {
        const lastCodeNumber = parseInt(lastProduct.code);
        nextCode = isNaN(lastCodeNumber) ? 1 : lastCodeNumber + 1;
      }

      const productData = {
        ...createProductDto,
        tenantId,
        code: nextCode.toString(),
        name: createProductDto.name?.toUpperCase(),
        stock: createProductDto.stock?.map(s => ({
          ...s,
          size_name: s.size_name?.toUpperCase()
        }))
      };

      const product = await this.productModel.create(productData);
      return product;
    } catch (error) {
      throw new BadRequestException('Error al crear el producto: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findOne({ _id: id, tenantId });
    
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
 
    const { name, price, cost, stock, active, type_id, brand_id, category_id, images, discount, gender_id } = updateProductDto;
 
    const update: any = {};
    if (name) update.name = name.toUpperCase();
    if (price) update.price = price;
    if (cost) update.cost = cost;
    if (stock) update.stock = stock.map(s => ({
      ...s,
      size_name: s.size_name?.toUpperCase()
    }));
    if (active !== undefined) update.active = active;
    if (type_id) update.type_id = type_id;
    if (brand_id) update.brand_id = brand_id;
    if (gender_id) update.gender_id = gender_id;
    if (category_id) update.category_id = category_id;
    if (images) update.images = images;
    if (discount !== undefined) update.discount = discount;
 
    return this.productModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: update },
      { new: true }
    );
  }

  async findAllBySizeId(tenantId: string, sizeId: string, page: number = 1, limit: number = 8): Promise<any> {
    const skip = (page - 1) * limit;
   
    const [products, total] = await Promise.all([
      this.productModel.find({
        tenantId,
        'stock': {
          $elemMatch: {
            'size_id': sizeId
          }
        },
        'active': true
      })
      .skip(skip)
      .limit(limit)
      .sort({ _id: -1 })
      .lean(),
      
      this.productModel.countDocuments({
        tenantId,
        'stock': {
          $elemMatch: {
            'size_id': sizeId
          }
        },
        'active': true
      })
    ]);
   
    return {
      data: products.map(product => ({
        ...product,
        images: product.images.map((img: any) => ({
          url: img.url,
          publicId: img.publicId
        }))
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
   }

  async incrementQuantity(tenantId: string, productId: string, sizeId: string) {
    const product = await this.productModel.findOneAndUpdate(
      { 
        _id: productId,
        tenantId,
        'stock.size_id': sizeId
      },
      { 
        $inc: { 'stock.$.quantity': 1 }
      },
      { new: true }
    );

    if (!product) {
      throw new NotFoundException('Producto o talla no encontrada');
    }

    return product;
  }

  async decrementQuantity(tenantId: string, productId: string, sizeId: string) {
    const product = await this.productModel.findOne({
      _id: productId,
      tenantId,
      'stock.size_id': sizeId,
      'stock.quantity': { $gt: 0 }
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado o sin stock disponible');
    }

    return this.productModel.findOneAndUpdate(
      { 
        _id: productId,
        tenantId,
        'stock.size_id': sizeId,
        'stock.quantity': { $gt: 0 }
      },
      { 
        $inc: { 'stock.$.quantity': -1 }
      },
      { new: true }
    );
  }

  async getInversion(tenantId: string){
    try {
      const products = await this.productModel.find({ tenantId });
      
      const totalInversion = products.reduce((total, product) => {
        const stockValue = product.stock.reduce((acc, item) => {
          return acc + (item.quantity * product.cost);
        }, 0);
        return total + stockValue;
      }, 0);
   
      return {
        totalInversion,
        message: 'Cálculo exitoso'
      };
    } catch (error) {
      throw new BadRequestException('Error al calcular la inversión: ' + error.message);
    }
  }

  async delete(tenantId: string, id: string | ObjectId) {
    try {
      // Primero obtener el producto para acceder a las imágenes
      const product = await this.productModel.findOne({ _id: id, tenantId });
      
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Eliminar imágenes de Cloudinary si existen
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          if (image.publicId) {
            try {
              await this.cloudinaryService.deleteImage(image.publicId);
            } catch (cloudinaryError) {
              console.error(`Error eliminando imagen ${image.publicId} de Cloudinary:`, cloudinaryError);
              // Continúa aunque falle la eliminación de una imagen
            }
          }
        }
      }

      // Eliminar el producto de la base de datos
      await this.productModel.deleteOne({ _id: id, tenantId });
      
      return { 
        message: 'Producto eliminado exitosamente',
        deletedImagesCount: product.images?.length || 0
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('No se pudo eliminar el producto: ' + error.message);
    }
  }

  // Métodos para obtener filtros únicos por categoría
  async getFiltersByCategory(tenantId: string, categoryId: string) {
    try {
      const filter = categoryId ? { tenantId, category_id: categoryId, active: true } : { tenantId, active: true };

      const [brands, models, sizes] = await Promise.all([
        // Marcas únicas
        this.productModel.distinct('brand_id', filter),
        
        // Modelos únicos
        this.productModel.distinct('type_id', filter),
        
        // Tallas de la categoría (todas las tallas registradas para esta categoría)
        categoryId ? 
          this.sizeModel.find({ tenantId, category_id: categoryId }).sort({ name: 1 }).lean().then(sizes => 
            sizes.map(size => ({ size_name: size.name }))
          ) :
          this.productModel.aggregate([
            { $match: filter },
            { $unwind: '$stock' },
            { $group: { _id: '$stock.size_name' } },
            { $project: { _id: 0, size_name: '$_id' } },
            { $sort: { size_name: 1 } }
          ])
      ]);

      return {
        brands: brands.filter(brand => brand).sort(),
        models: models.filter(model => model).sort(),
        sizes: sizes.map(s => s.size_name).filter(size => size).sort()
      };
    } catch (error) {
      throw new BadRequestException('Error al obtener filtros: ' + error.message);
    }
  }

  async getProductsWithFilters(
    tenantId: string,
    categoryId?: string,
    brandName?: string,
    modelName?: string,
    sizeName?: string,
    name?: string,
    gender?: string,
    page: number = 1,
    limit: number = 8,
    showAll: boolean = false // Nuevo parámetro para mostrar todos los productos
  ) {
    try {
      const skip = (page - 1) * limit;
      const filter: any = { tenantId };
      
      // Solo filtrar por activos si no se especifica mostrar todos (para admin)
      if (!showAll) {
        filter.active = true;
      }

      // Filtro por categoría
      if (categoryId) filter.category_id = categoryId;

      // Filtro por marca
      if (brandName) filter.brand_id = brandName;

      // Filtro por modelo
      if (modelName) filter.type_id = modelName;

      // Filtro por nombre (búsqueda parcial, case insensitive)
      if (name) {
        filter.name = {
          $regex: name.toUpperCase(),
          $options: 'i'
        };
      }

      // Filtro por talla (solo productos que soporten esta talla)
      if (sizeName) {
        filter['stock'] = {
          $elemMatch: {
            'size_name': sizeName
          }
        };
      }

      // Filtro por género
      if (gender) filter.gender_id = gender;

      const [products, total] = await Promise.all([
        this.productModel.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ _id: -1 })
          .lean(),
        
        this.productModel.countDocuments(filter)
      ]);

      return {
        data: products.map(product => ({
          ...product,
          images: product.images?.map((img: any) => ({
            url: img.url,
            publicId: img.publicId
          })) || []
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        filters: {
          categoryId,
          brandName,
          modelName,
          sizeName
        }
      };
    } catch (error) {
      throw new BadRequestException('Error al filtrar productos: ' + error.message);
    }
  }

  // Método para obtener todos los talles disponibles para una categoría
  async getSizesForCategory(tenantId: string, categoryId: string) {
    try {
      const sizes = await this.sizeModel.find({ 
        tenantId,
        category_id: categoryId 
      }).sort({ name: 1 });

      return sizes.map(size => ({
        id: size._id,
        name: size.name,
        category_id: size.category_id
      }));
    } catch (error) {
      throw new BadRequestException('Error al obtener talles de la categoría: ' + error.message);
    }
  }
}