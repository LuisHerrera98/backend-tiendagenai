import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './entities/product.entity';
import { Size } from '../size/entities/size.entity';
import { Model, ObjectId } from 'mongoose';
import { SellService } from 'src/sell/sell.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ProductService {

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(Size.name)
    private readonly sizeModel: Model<Size>,
    private readonly sellService: SellService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      // Generar código automático autoincremental
      const lastProduct = await this.productModel.findOne().sort({ code: -1 }).exec();
      let nextCode = 1;
      
      if (lastProduct && lastProduct.code) {
        const lastCodeNumber = parseInt(lastProduct.code);
        nextCode = isNaN(lastCodeNumber) ? 1 : lastCodeNumber + 1;
      }

      const productData = {
        ...createProductDto,
        code: nextCode.toString(),
        name: createProductDto.name?.toUpperCase(),
        model_name: createProductDto.model_name?.toUpperCase(),
        brand_name: createProductDto.brand_name?.toUpperCase(),
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

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findById(id);
    
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
 
    const { name, price, cost, stock, active, model_name, brand_name, category_id, images, discount } = updateProductDto;
 
    const update: any = {};
    if (name) update.name = name.toUpperCase();
    if (price) update.price = price;
    if (cost) update.cost = cost;
    if (stock) update.stock = stock.map(s => ({
      ...s,
      size_name: s.size_name?.toUpperCase()
    }));
    if (active !== undefined) update.active = active;
    if (model_name) update.model_name = model_name.toUpperCase();
    if (brand_name) update.brand_name = brand_name.toUpperCase();
    if (category_id) update.category_id = category_id;
    if (images) update.images = images;
    if (discount !== undefined) update.discount = discount;
 
    return this.productModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );
  }

  async findAllBySizeId(sizeId: string, page: number = 1, limit: number = 8): Promise<any> {
    const skip = (page - 1) * limit;
   
    const [products, total] = await Promise.all([
      this.productModel.find({
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

  async incrementQuantity(productId: string, sizeId: string) {
    const product = await this.productModel.findOneAndUpdate(
      { 
        _id: productId,
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

  async decrementQuantity(productId: string, sizeId: string) {
    const product = await this.productModel.findOne({
      _id: productId,
      'stock.size_id': sizeId,
      'stock.quantity': { $gt: 0 }
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado o sin stock disponible');
    }

    const size = product.stock.find(s => s.size_id === sizeId);

    await this.sellService.registerSell({
      product_id: productId,
      product_name: product.name,
      size_id: sizeId,
      size_name: size.size_name,
      price: product.price,
      cost: product.cost,
      images: product.images
    });

    return this.productModel.findOneAndUpdate(
      { 
        _id: productId,
        'stock.size_id': sizeId,
        'stock.quantity': { $gt: 0 }
      },
      { 
        $inc: { 'stock.$.quantity': -1 }
      },
      { new: true }
    );
  }

  async getInversion(){
    try {
      const products = await this.productModel.find();
      
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

  async delete(id: string | ObjectId) {
    try {
      // Primero obtener el producto para acceder a las imágenes
      const product = await this.productModel.findById(id);
      
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
      await this.productModel.deleteOne({ _id: id });
      
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
  async getFiltersByCategory(categoryId: string) {
    try {
      const filter = categoryId ? { category_id: categoryId, active: true } : { active: true };

      const [brands, models, sizes] = await Promise.all([
        // Marcas únicas
        this.productModel.distinct('brand_name', filter),
        
        // Modelos únicos
        this.productModel.distinct('model_name', filter),
        
        // Tallas de la categoría (todas las tallas registradas para esta categoría)
        categoryId ? 
          this.sizeModel.find({ category_id: categoryId }).sort({ name: 1 }).lean().then(sizes => 
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
    categoryId?: string,
    brandName?: string,
    modelName?: string,
    sizeName?: string,
    page: number = 1,
    limit: number = 8
  ) {
    try {
      const skip = (page - 1) * limit;
      const filter: any = { active: true };

      // Filtro por categoría
      if (categoryId) filter.category_id = categoryId;

      // Filtro por marca
      if (brandName) filter.brand_name = brandName;

      // Filtro por modelo
      if (modelName) filter.model_name = modelName;

      // Filtro por talla (solo productos que soporten esta talla)
      if (sizeName) {
        filter['stock'] = {
          $elemMatch: {
            'size_name': sizeName
          }
        };
      }

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
  async getSizesForCategory(categoryId: string) {
    try {
      const sizes = await this.sizeModel.find({ 
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