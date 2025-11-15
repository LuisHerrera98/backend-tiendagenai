import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './entities/product.entity';
import { Size } from '../size/entities/size.entity';
import { Brand } from '../brand/entities/brand.entity';
import { Type } from '../type/entities/type.entity';
import { Gender } from '../gender/entities/gender.entity';
import { Category } from '../category/entities/category.entity';
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
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async create(tenantId: string, createProductDto: CreateProductDto) {
    try {
 

      if (!tenantId) {
        throw new BadRequestException('TenantId es requerido');
      }

      if (!createProductDto.name) {
        throw new BadRequestException('El nombre del producto es requerido');
      }

      // Generar código automático autoincremental
      // Buscar todos los productos del tenant y obtener el código más alto
      const products = await this.productModel.find({ tenantId }).select('code').exec();
      let maxCode = 0;
      
      for (const product of products) {
        if (product.code) {
          const codeNumber = parseInt(product.code);
          if (!isNaN(codeNumber) && codeNumber > maxCode) {
            maxCode = codeNumber;
          }
        }
      }
      
      let nextCode = maxCode + 1;
      
      // Verificar que el código no exista (por si acaso)
      let codeExists = true;
      let attempts = 0;
      while (codeExists && attempts < 10) {
        const existingProduct = await this.productModel.findOne({ 
          tenantId, 
          code: nextCode.toString() 
        }).exec();
        
        if (!existingProduct) {
          codeExists = false;
        } else {
          nextCode++;
          attempts++;
         
        }
      }
      
      if (attempts >= 10) {
        throw new BadRequestException('No se pudo generar un código único para el producto');
      }

      // Procesar imágenes: aceptar tanto strings como objetos
      const processedImages = createProductDto.images?.map((img: any) => {
        // Si ya es un string (URL de Cloudinary), extraer el publicId
        if (typeof img === 'string') {
          // Extraer publicId de la URL de Cloudinary
          // Formato: https://res.cloudinary.com/[cloud]/image/upload/v[version]/[publicId].[ext]
          const urlParts = img.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          const publicId = lastPart.split('.')[0]; // Quitar la extensión
          
          return {
            url: img,
            publicId: publicId
          };
        }
        // Si ya es un objeto, mantenerlo como está
        return img;
      }) || [];

      // Validar que los gender IDs existen si se proporcionan
      if (createProductDto.genders && createProductDto.genders.length > 0) {
        const genderIds = createProductDto.genders;
        const existingGenders = await this.genderModel.find({
          _id: { $in: genderIds },
          tenantId
        });

        if (existingGenders.length !== genderIds.length) {
          throw new BadRequestException('Uno o más IDs de género no son válidos');
        }
      }

      // Forzar active a true si no viene o viene como false
      // Esto asegura que SIEMPRE los productos nuevos estén activos
      const isActive = createProductDto.active === true ? true : true; // Siempre true para nuevos productos

      // Si es tipo 'unit', crear un stock único con talle "unit"
      let processedStock = [];
      if (createProductDto.stockType === 'unit') {
        // Para productos por unidades, usar el primer elemento del stock o crear uno por defecto
        const unitQuantity = createProductDto.stock?.[0]?.quantity || 0;
        processedStock = [{
          size_id: 'unit',
          size_name: 'unit',
          quantity: unitQuantity,
          available: true
        }];
      } else {
        // Para productos con talles, procesar normalmente
        processedStock = createProductDto.stock?.map(s => ({
          ...s,
          size_name: s.size_name?.toUpperCase()
        })) || [];
      }

      const productData = {
        ...createProductDto,
        tenantId,
        code: nextCode.toString(),
        name: createProductDto.name?.toUpperCase(),
        images: processedImages,
        stock: processedStock,
        stockType: createProductDto.stockType || 'sizes',
        genders: createProductDto.genders || [],
        // SIEMPRE crear productos como activos
        active: true,
        // Eliminar el campo gender si existe (legacy)
        gender: undefined
      };

      const product = await this.productModel.create(productData);
      return product;
    } catch (error) {
      console.error('ProductService.create - Error:', error);
      throw new BadRequestException('Error al crear el producto: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findOne({ _id: id, tenantId });
    
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
 
    const { name, price, cost, cashPrice, stock, stockType, active, type_id, brand_id, category_id, images, discount, gender_id, genders, color_id, description, installmentText, withoutStock } = updateProductDto;

    const update: any = {};
    if (name) update.name = name.toUpperCase();
    if (price) update.price = price;
    if (cost) update.cost = cost;
    if (cashPrice !== undefined) update.cashPrice = cashPrice;
    if (description !== undefined) update.description = description;
    if (installmentText !== undefined) update.installmentText = installmentText;
    if (withoutStock !== undefined) update.withoutStock = withoutStock;
    
    // Manejar stock según el tipo
    if (stock) {
      if (stockType === 'unit' || product.stockType === 'unit') {
        // Para productos por unidades
        const unitQuantity = stock[0]?.quantity || 0;
        update.stock = [{
          size_id: 'unit',
          size_name: 'unit',
          quantity: unitQuantity,
          available: true
        }];
      } else {
        // Para productos con talles
        update.stock = stock.map(s => ({
          ...s,
          size_name: s.size_name?.toUpperCase()
        }));
      }
    }
    
    if (stockType !== undefined) update.stockType = stockType;
    if (active !== undefined) update.active = active;
    if (type_id) update.type_id = type_id;
    if (brand_id) update.brand_id = brand_id;
    if (gender_id) update.gender_id = gender_id;

    // Validar gender IDs si se proporcionan
    if (genders) {
      const existingGenders = await this.genderModel.find({
        _id: { $in: genders },
        tenantId
      });

      if (existingGenders.length !== genders.length) {
        throw new BadRequestException('Uno o más IDs de género no son válidos');
      }

      update.genders = genders;
    }

    if (color_id !== undefined) update.color_id = color_id;
    if (category_id) update.category_id = category_id;
    if (images) {
      // Procesar imágenes: aceptar tanto strings como objetos
      update.images = images.map((img: any) => {
        // Si ya es un string (URL de Cloudinary), extraer el publicId
        if (typeof img === 'string') {
          // Extraer publicId de la URL de Cloudinary
          const urlParts = img.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          const publicId = lastPart.split('.')[0]; // Quitar la extensión
          
          return {
            url: img,
            publicId: publicId
          };
        }
        // Si ya es un objeto, mantenerlo como está
        return img;
      });
    }
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
        images: product.images?.map((img: any) => {
          // Si es un string directo (nuevo formato), devolver como está
          if (typeof img === 'string') {
            return img;
          }
          // Si es un objeto con url (formato antiguo), devolver solo la url
          return img.url || img;
        }) || []
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
    colorId?: string,
    active?: boolean,
    page: number = 1,
    limit: number = 8,
    showAll: boolean = false // Nuevo parámetro para mostrar todos los productos
  ) {
    try {
      const skip = (page - 1) * limit;
      const filter: any = { tenantId };
      
      // Manejo del filtro de estado activo/inactivo
      if (active !== undefined) {
        // Si se especifica explícitamente el filtro active, usarlo
        filter.active = active;
      } else if (!showAll) {
        // Si no se especifica y no es showAll, mostrar solo activos
        filter.active = true;
      }

      // Filtro por categoría (incluyendo subcategorías)
      if (categoryId) {
        // Buscar todas las subcategorías de esta categoría
        const subcategories = await this.categoryModel.find({
          parent_id: categoryId,
          tenantId
        }).lean();

        // Si tiene subcategorías, buscar productos en la categoría padre Y en todas las subcategorías
        if (subcategories.length > 0) {
          const categoryIds = [categoryId, ...subcategories.map(sub => sub._id.toString())];
          filter.category_id = { $in: categoryIds };
        } else {
          // Si no tiene subcategorías, filtrar solo por la categoría
          filter.category_id = categoryId;
        }
      }

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

      // Filtro por género - ahora busca en el array de géneros
      if (gender) {
        filter.genders = gender; // MongoDB automáticamente busca si el valor está en el array
      }

      // Filtro por color
      if (colorId) filter.color_id = colorId;

      const [products, total] = await Promise.all([
        this.productModel.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1, _id: -1 })
          .lean(),

        this.productModel.countDocuments(filter)
      ]);

      return {
        data: products.map(product => ({
          ...product,
          images: product.images?.map((img: any) => {
            // Si es un string directo (nuevo formato), devolver como está
            if (typeof img === 'string') {
              return img;
            }
            // Si es un objeto con url (formato antiguo), devolver solo la url
            return img.url || img;
          }) || []
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

  // Método para eliminar una imagen de un producto y de Cloudinary
  async deleteProductImage(tenantId: string, productId: string, imageUrl: string) {
    try {
      // Buscar el producto
      const product = await this.productModel.findOne({ _id: productId, tenantId });
      
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Buscar la imagen en el array de imágenes
      const imageIndex = product.images.findIndex((img: any) => {
        if (typeof img === 'string') {
          return img === imageUrl;
        }
        return img.url === imageUrl;
      });

      if (imageIndex === -1) {
        throw new NotFoundException('Imagen no encontrada en el producto');
      }

      // Obtener el publicId para borrar de Cloudinary
      let publicId: string | null = null;
      const imageData = product.images[imageIndex];
      
      if (typeof imageData === 'object' && imageData.publicId) {
        publicId = imageData.publicId;
      } else if (typeof imageData === 'string' || (typeof imageData === 'object' && imageData.url)) {
        // Extraer publicId de la URL
        const url = typeof imageData === 'string' ? imageData : imageData.url;
        const urlParts = url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        publicId = lastPart.split('.')[0];
      }

      // Intentar borrar de Cloudinary si tenemos publicId
      if (publicId) {
        try {
          await this.cloudinaryService.deleteImage(publicId);
        } catch (cloudinaryError) {
          console.error('Error al borrar imagen de Cloudinary:', cloudinaryError);
          // Continuar aunque falle el borrado de Cloudinary
        }
      }

      // Remover la imagen del array
      product.images.splice(imageIndex, 1);

      // Actualizar el producto
      await this.productModel.findOneAndUpdate(
        { _id: productId, tenantId },
        { $set: { images: product.images } },
        { new: true }
      );

      return {
        message: 'Imagen eliminada exitosamente',
        remainingImages: product.images.length
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar imagen: ' + error.message);
    }
  }
}