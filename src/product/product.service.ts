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
import { Tenant } from '../tenant/entities/tenant.entity';
import { Modelo } from '../modelo/entities/modelo.entity';
import { Model, ObjectId } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

// Interfaz para los datos de cálculo de precios
interface PriceCalculation {
  cost: number;
  profitPercentage: number;
  cashDiscountPercentage: number;
  transferDiscountPercentage: number;
  discount: number; // Descuento de liquidación
  price: number; // Precio lista
  cashPrice: number; // Precio efectivo
  transferPrice: number; // Precio transferencia
}

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
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<Tenant>,
    @InjectModel(Modelo.name)
    private readonly modeloModel: Model<Modelo>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  // Tipo para el modo de redondeo de precios
  // 'psychological' = Múltiplo de $500 - 1 (ej: $159.999) - DEFAULT
  // 'rounded' = Múltiplo de $500 (ej: $160.000)
  // 'exact' = Sin redondear (números exactos)
  private readonly DEFAULT_ROUNDING_MODE = 'psychological';

  // Obtener defaults de precios del tenant
  private async getTenantPriceDefaults(tenantId: string): Promise<{
    profitPercentage: number;
    cashDiscountPercentage: number;
    transferDiscountPercentage: number;
    priceRoundingMode: 'psychological' | 'rounded' | 'exact';
  }> {
    const tenant = await this.tenantModel.findOne({ subdomain: tenantId });
    return {
      profitPercentage: tenant?.settings?.defaultProfitPercentage ?? 100,
      cashDiscountPercentage: tenant?.settings?.defaultCashDiscountPercentage ?? 25,
      transferDiscountPercentage: tenant?.settings?.defaultTransferDiscountPercentage ?? 10,
      priceRoundingMode: (tenant?.settings?.priceRoundingMode as 'psychological' | 'rounded' | 'exact') ?? 'psychological',
    };
  }

  // ============ FUNCIONES DE REDONDEO POR MODO ============

  // Redondear precio LISTA según el modo
  private roundListPrice(value: number, mode: 'psychological' | 'rounded' | 'exact'): number {
    switch (mode) {
      case 'psychological':
        // Múltiplo de 500 más cercano - 1
        const roundedPsych = Math.round(value / 500) * 500;
        return roundedPsych > 0 ? roundedPsych - 1 : 0;
      case 'rounded':
        // Múltiplo de 500 más cercano
        return Math.round(value / 500) * 500;
      case 'exact':
        // Sin redondear (entero)
        return Math.round(value);
      default:
        return Math.round(value);
    }
  }

  // Redondear precio DESCUENTO (efectivo/transferencia) según el modo
  private roundDiscountPrice(value: number, mode: 'psychological' | 'rounded' | 'exact'): number {
    switch (mode) {
      case 'psychological':
        // Múltiplo de 500 hacia abajo - 1
        const roundedPsych = Math.floor(value / 500) * 500;
        return roundedPsych > 0 ? roundedPsych - 1 : 0;
      case 'rounded':
        // Múltiplo de 500 hacia abajo
        return Math.floor(value / 500) * 500;
      case 'exact':
        // Sin redondear (entero)
        return Math.round(value);
      default:
        return Math.round(value);
    }
  }

  // Calcular precios basado en costo, porcentajes y modo de redondeo
  calculatePrices(
    cost: number,
    profitPercentage: number,
    cashDiscountPercentage: number,
    transferDiscountPercentage: number,
    discount: number = 0,
    roundingMode: 'psychological' | 'rounded' | 'exact' = 'psychological'
  ): { price: number; cashPrice: number; transferPrice: number } {
    // 1. Precio Lista = Costo × (1 + ganancia%)
    const rawPrice = cost * (1 + profitPercentage / 100);
    const priceBeforeDiscount = this.roundListPrice(rawPrice, roundingMode);

    // 2. Si hay descuento de liquidación, aplicarlo al precio lista
    const price = discount > 0
      ? this.roundListPrice(priceBeforeDiscount * (1 - discount / 100), roundingMode)
      : priceBeforeDiscount;

    // 3. Precio Efectivo = Precio Lista × (1 - descuento efectivo%)
    // Para modos con -1, sumar 1 al precio para calcular sobre número redondo
    const priceForDiscount = roundingMode === 'psychological' ? price + 1 : price;
    const rawCashPrice = priceForDiscount * (1 - cashDiscountPercentage / 100);
    const cashPrice = this.roundDiscountPrice(rawCashPrice, roundingMode);

    // 4. Precio Transferencia = Precio Lista × (1 - descuento transferencia%)
    const rawTransferPrice = priceForDiscount * (1 - transferDiscountPercentage / 100);
    const transferPrice = this.roundDiscountPrice(rawTransferPrice, roundingMode);

    return { price, cashPrice, transferPrice };
  }

  // Calcular porcentaje de ganancia a partir del precio lista
  calculateProfitPercentageFromPrice(cost: number, price: number): number {
    if (cost <= 0) return 100;
    return Math.round(((price / cost) - 1) * 100);
  }

  // Calcular porcentaje de descuento a partir de un precio
  calculateDiscountPercentageFromPrice(basePrice: number, discountedPrice: number): number {
    if (basePrice <= 0) return 0;
    return Math.round((1 - (discountedPrice / basePrice)) * 100);
  }

  // Validar que el precio efectivo no sea menor al costo
  private validatePriceAboveCost(cashPrice: number, cost: number): void {
    if (cashPrice < cost) {
      throw new BadRequestException(
        `El precio efectivo ($${cashPrice}) no puede ser menor al costo ($${cost}). ` +
        `Ajusta los porcentajes de ganancia o descuento.`
      );
    }
  }

  async create(tenantId: string, createProductDto: CreateProductDto) {
    try {
      if (!tenantId) {
        throw new BadRequestException('TenantId es requerido');
      }

      if (!createProductDto.name) {
        throw new BadRequestException('El nombre del producto es requerido');
      }

      // Obtener defaults del tenant
      const defaults = await this.getTenantPriceDefaults(tenantId);

      // Determinar porcentajes (usar los proporcionados o defaults)
      const profitPercentage = createProductDto.profitPercentage ?? defaults.profitPercentage;
      const cashDiscountPercentage = createProductDto.cashDiscountPercentage ?? defaults.cashDiscountPercentage;
      const transferDiscountPercentage = createProductDto.transferDiscountPercentage ?? defaults.transferDiscountPercentage;
      const discount = createProductDto.discount ?? 0;

      // Calcular precios
      let price: number;
      let cashPrice: number;
      let transferPrice: number;
      let finalProfitPercentage = profitPercentage;
      let finalCashDiscountPercentage = cashDiscountPercentage;
      let finalTransferDiscountPercentage = transferDiscountPercentage;

      // Si se proporciona precio lista manual, calcular el porcentaje de ganancia
      if (createProductDto.price && !createProductDto.profitPercentage) {
        price = createProductDto.price;
        finalProfitPercentage = this.calculateProfitPercentageFromPrice(createProductDto.cost, price);
      } else {
        // Calcular precio lista desde porcentaje
        const priceBeforeDiscount = Math.round(createProductDto.cost * (1 + profitPercentage / 100));
        price = discount > 0
          ? Math.round(priceBeforeDiscount * (1 - discount / 100))
          : priceBeforeDiscount;
      }

      // Si se proporciona precio efectivo manual, calcular el porcentaje
      if (createProductDto.cashPrice && !createProductDto.cashDiscountPercentage) {
        cashPrice = createProductDto.cashPrice;
        finalCashDiscountPercentage = this.calculateDiscountPercentageFromPrice(price, cashPrice);
      } else {
        cashPrice = Math.round(price * (1 - cashDiscountPercentage / 100));
      }

      // Si se proporciona precio transferencia manual, calcular el porcentaje
      if (createProductDto.transferPrice && !createProductDto.transferDiscountPercentage) {
        transferPrice = createProductDto.transferPrice;
        finalTransferDiscountPercentage = this.calculateDiscountPercentageFromPrice(price, transferPrice);
      } else {
        transferPrice = Math.round(price * (1 - transferDiscountPercentage / 100));
      }

      // Validar que el precio efectivo no sea menor al costo
      this.validatePriceAboveCost(cashPrice, createProductDto.cost);

      // Generar código automático autoincremental
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
        if (typeof img === 'string') {
          const urlParts = img.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          const publicId = lastPart.split('.')[0];
          return { url: img, publicId: publicId };
        }
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

      // Si es tipo 'unit', crear un stock único con talle "unit"
      let processedStock = [];
      if (createProductDto.stockType === 'unit') {
        const unitQuantity = createProductDto.stock?.[0]?.quantity || 0;
        processedStock = [{
          size_id: 'unit',
          size_name: 'unit',
          quantity: unitQuantity,
          available: true
        }];
      } else {
        processedStock = createProductDto.stock?.map(s => ({
          ...s,
          size_name: s.size_name?.toUpperCase()
        })) || [];
      }

      // Obtener nombre del modelo si se proporciona modelo_id
      let modeloName: string | undefined;
      if (createProductDto.modelo_id) {
        const modelo = await this.modeloModel.findOne({
          _id: createProductDto.modelo_id,
          tenantId
        });
        if (modelo) {
          modeloName = modelo.name;
        }
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
        active: true,
        // Precios calculados
        price,
        cashPrice,
        transferPrice,
        // Porcentajes guardados
        profitPercentage: finalProfitPercentage,
        cashDiscountPercentage: finalCashDiscountPercentage,
        transferDiscountPercentage: finalTransferDiscountPercentage,
        discount,
        gender: undefined,
        // Modelo desnormalizado
        modelo_name: modeloName
      };

      const product = await this.productModel.create(productData);
      return product;
    } catch (error) {
      console.error('ProductService.create - Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el producto: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findOne({ _id: id, tenantId });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const {
      name, price, cost, cashPrice, transferPrice, stock, stockType, active,
      type_id, brand_id, category_id, images, discount, gender_id, genders,
      color_id, description, installmentText, withoutStock,
      profitPercentage, cashDiscountPercentage, transferDiscountPercentage,
      modelo_id
    } = updateProductDto;

    const update: any = {};

    // Determinar el costo a usar (nuevo o existente)
    const effectiveCost = cost ?? product.cost;

    // Determinar los porcentajes a usar
    let effectiveProfitPercentage = profitPercentage ?? product.profitPercentage ?? 100;
    let effectiveCashDiscountPercentage = cashDiscountPercentage ?? product.cashDiscountPercentage ?? 25;
    let effectiveTransferDiscountPercentage = transferDiscountPercentage ?? product.transferDiscountPercentage ?? 10;
    const effectiveDiscount = discount ?? product.discount ?? 0;

    // Determinar precios
    let newPrice: number;
    let newCashPrice: number;
    let newTransferPrice: number;

    // Si cambió el costo, recalcular todos los precios con los porcentajes existentes
    if (cost !== undefined) {
      update.cost = cost;

      // Si también se proporciona un nuevo precio lista, usarlo
      if (price !== undefined) {
        newPrice = price;
        effectiveProfitPercentage = this.calculateProfitPercentageFromPrice(cost, price);
      } else {
        // Recalcular precio lista con el nuevo costo
        const priceBeforeDiscount = Math.round(cost * (1 + effectiveProfitPercentage / 100));
        newPrice = effectiveDiscount > 0
          ? Math.round(priceBeforeDiscount * (1 - effectiveDiscount / 100))
          : priceBeforeDiscount;
      }

      // Recalcular precios efectivo y transferencia
      newCashPrice = cashPrice ?? Math.round(newPrice * (1 - effectiveCashDiscountPercentage / 100));
      newTransferPrice = transferPrice ?? Math.round(newPrice * (1 - effectiveTransferDiscountPercentage / 100));

      update.price = newPrice;
      update.cashPrice = newCashPrice;
      update.transferPrice = newTransferPrice;
      update.profitPercentage = effectiveProfitPercentage;
    } else {
      // El costo no cambió, manejar cambios individuales de precio/porcentaje
      const currentPrice = product.price;

      // Si cambió el precio lista
      if (price !== undefined) {
        newPrice = price;
        effectiveProfitPercentage = this.calculateProfitPercentageFromPrice(effectiveCost, price);
        update.price = price;
        update.profitPercentage = effectiveProfitPercentage;

        // Recalcular efectivo y transferencia si no se proporcionaron manualmente
        if (cashPrice === undefined) {
          newCashPrice = Math.round(price * (1 - effectiveCashDiscountPercentage / 100));
          update.cashPrice = newCashPrice;
        }
        if (transferPrice === undefined) {
          newTransferPrice = Math.round(price * (1 - effectiveTransferDiscountPercentage / 100));
          update.transferPrice = newTransferPrice;
        }
      }

      // Si cambió el porcentaje de ganancia
      if (profitPercentage !== undefined && price === undefined) {
        const priceBeforeDiscount = Math.round(effectiveCost * (1 + profitPercentage / 100));
        newPrice = effectiveDiscount > 0
          ? Math.round(priceBeforeDiscount * (1 - effectiveDiscount / 100))
          : priceBeforeDiscount;
        update.price = newPrice;
        update.profitPercentage = profitPercentage;

        // Recalcular efectivo y transferencia
        if (cashPrice === undefined) {
          update.cashPrice = Math.round(newPrice * (1 - effectiveCashDiscountPercentage / 100));
        }
        if (transferPrice === undefined) {
          update.transferPrice = Math.round(newPrice * (1 - effectiveTransferDiscountPercentage / 100));
        }
      }

      // Si cambió el precio efectivo manualmente
      if (cashPrice !== undefined) {
        update.cashPrice = cashPrice;
        const basePrice = update.price ?? currentPrice;
        effectiveCashDiscountPercentage = this.calculateDiscountPercentageFromPrice(basePrice, cashPrice);
        update.cashDiscountPercentage = effectiveCashDiscountPercentage;
      } else if (cashDiscountPercentage !== undefined) {
        const basePrice = update.price ?? currentPrice;
        update.cashPrice = Math.round(basePrice * (1 - cashDiscountPercentage / 100));
        update.cashDiscountPercentage = cashDiscountPercentage;
      }

      // Si cambió el precio transferencia manualmente
      if (transferPrice !== undefined) {
        update.transferPrice = transferPrice;
        const basePrice = update.price ?? currentPrice;
        effectiveTransferDiscountPercentage = this.calculateDiscountPercentageFromPrice(basePrice, transferPrice);
        update.transferDiscountPercentage = effectiveTransferDiscountPercentage;
      } else if (transferDiscountPercentage !== undefined) {
        const basePrice = update.price ?? currentPrice;
        update.transferPrice = Math.round(basePrice * (1 - transferDiscountPercentage / 100));
        update.transferDiscountPercentage = transferDiscountPercentage;
      }
    }

    // Manejar descuento de liquidación
    if (discount !== undefined) {
      update.discount = discount;
      // Recalcular precio lista con el nuevo descuento
      const priceBeforeDiscount = Math.round(effectiveCost * (1 + effectiveProfitPercentage / 100));
      const newPriceWithDiscount = discount > 0
        ? Math.round(priceBeforeDiscount * (1 - discount / 100))
        : priceBeforeDiscount;
      update.price = newPriceWithDiscount;

      // Recalcular efectivo y transferencia
      update.cashPrice = Math.round(newPriceWithDiscount * (1 - effectiveCashDiscountPercentage / 100));
      update.transferPrice = Math.round(newPriceWithDiscount * (1 - effectiveTransferDiscountPercentage / 100));
    }

    // Validar que el precio efectivo no sea menor al costo
    const finalCashPrice = update.cashPrice ?? product.cashPrice;
    const finalCost = update.cost ?? product.cost;
    this.validatePriceAboveCost(finalCashPrice, finalCost);

    // Otros campos
    if (name) update.name = name.toUpperCase();
    if (description !== undefined) update.description = description;
    if (installmentText !== undefined) update.installmentText = installmentText;
    if (withoutStock !== undefined) update.withoutStock = withoutStock;

    // Manejar stock según el tipo
    if (stock) {
      if (stockType === 'unit' || product.stockType === 'unit') {
        const unitQuantity = stock[0]?.quantity || 0;
        update.stock = [{
          size_id: 'unit',
          size_name: 'unit',
          quantity: unitQuantity,
          available: true
        }];
      } else {
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
      update.images = images.map((img: any) => {
        if (typeof img === 'string') {
          const urlParts = img.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          const publicId = lastPart.split('.')[0];
          return { url: img, publicId: publicId };
        }
        return img;
      });
    }

    // Manejar modelo_id
    if (modelo_id !== undefined) {
      if (modelo_id === '' || modelo_id === null) {
        // Si se envía vacío, limpiar el modelo
        update.modelo_id = null;
        update.modelo_name = null;
      } else {
        // Obtener el nombre del modelo
        const modelo = await this.modeloModel.findOne({
          _id: modelo_id,
          tenantId
        });
        if (modelo) {
          update.modelo_id = modelo_id;
          update.modelo_name = modelo.name;
        }
      }
    }

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

      // Filtro por nombre O código (búsqueda parcial, case insensitive)
      if (name) {
        filter.$or = [
          { name: { $regex: name.toUpperCase(), $options: 'i' } },
          { code: { $regex: name, $options: 'i' } }
        ];
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

  // Aumento masivo de costos
  async bulkUpdateCosts(
    tenantId: string,
    productIds: string[],
    increasePercentage: number
  ): Promise<{ updated: number; products: any[] }> {
    try {
      if (!productIds || productIds.length === 0) {
        throw new BadRequestException('Debe seleccionar al menos un producto');
      }

      if (increasePercentage <= 0) {
        throw new BadRequestException('El porcentaje de aumento debe ser mayor a 0');
      }

      const updatedProducts: any[] = [];

      for (const productId of productIds) {
        const product = await this.productModel.findOne({ _id: productId, tenantId });

        if (!product) {
          continue; // Saltar productos no encontrados
        }

        // Calcular nuevo costo
        const newCost = Math.round(product.cost * (1 + increasePercentage / 100));

        // Usar los porcentajes guardados del producto
        const profitPercentage = product.profitPercentage ?? 100;
        const cashDiscountPercentage = product.cashDiscountPercentage ?? 25;
        const transferDiscountPercentage = product.transferDiscountPercentage ?? 10;
        const discount = product.discount ?? 0;

        // Calcular nuevos precios
        const priceBeforeDiscount = Math.round(newCost * (1 + profitPercentage / 100));
        const newPrice = discount > 0
          ? Math.round(priceBeforeDiscount * (1 - discount / 100))
          : priceBeforeDiscount;
        const newCashPrice = Math.round(newPrice * (1 - cashDiscountPercentage / 100));
        const newTransferPrice = Math.round(newPrice * (1 - transferDiscountPercentage / 100));

        // Validar que el precio efectivo no sea menor al costo
        if (newCashPrice < newCost) {
          throw new BadRequestException(
            `El producto "${product.name}" tendría un precio efectivo ($${newCashPrice}) menor al costo ($${newCost}). ` +
            `Ajusta los porcentajes del producto antes de aplicar el aumento.`
          );
        }

        // Actualizar producto
        await this.productModel.findOneAndUpdate(
          { _id: productId, tenantId },
          {
            $set: {
              cost: newCost,
              price: newPrice,
              cashPrice: newCashPrice,
              transferPrice: newTransferPrice
            }
          }
        );

        updatedProducts.push({
          _id: productId,
          name: product.name,
          oldCost: product.cost,
          newCost,
          oldPrice: product.price,
          newPrice,
          oldCashPrice: product.cashPrice,
          newCashPrice,
          oldTransferPrice: product.transferPrice,
          newTransferPrice
        });
      }

      return {
        updated: updatedProducts.length,
        products: updatedProducts
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar costos: ' + error.message);
    }
  }

  // Obtener productos para aumento masivo (con filtros)
  async getProductsForBulkUpdate(
    tenantId: string,
    categoryId?: string,
    search?: string,
    page: number = 1,
    limit: number = 50
  ) {
    try {
      const skip = (page - 1) * limit;
      const filter: any = { tenantId, active: true };

      // Filtro por categoría
      if (categoryId) {
        const subcategories = await this.categoryModel.find({
          parent_id: categoryId,
          tenantId
        }).lean();

        if (subcategories.length > 0) {
          const categoryIds = [categoryId, ...subcategories.map(sub => sub._id.toString())];
          filter.category_id = { $in: categoryIds };
        } else {
          filter.category_id = categoryId;
        }
      }

      // Filtro por búsqueda
      if (search) {
        filter.$or = [
          { name: { $regex: search.toUpperCase(), $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ];
      }

      const [products, total] = await Promise.all([
        this.productModel.find(filter)
          .select('_id name code cost price cashPrice transferPrice images')
          .skip(skip)
          .limit(limit)
          .sort({ name: 1 })
          .lean(),
        this.productModel.countDocuments(filter)
      ]);

      return {
        data: products.map(product => ({
          ...product,
          images: product.images?.map((img: any) => {
            if (typeof img === 'string') return img;
            return img.url || img;
          }).slice(0, 1) || [] // Solo primera imagen para la lista
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new BadRequestException('Error al obtener productos: ' + error.message);
    }
  }

  // Preview de aumento masivo (sin aplicar cambios)
  async previewBulkUpdate(
    tenantId: string,
    productIds: string[],
    increasePercentage: number
  ) {
    try {
      if (!productIds || productIds.length === 0) {
        return { products: [] };
      }

      const products = await this.productModel.find({
        _id: { $in: productIds },
        tenantId
      }).lean();

      const preview = products.map(product => {
        const newCost = Math.round(product.cost * (1 + increasePercentage / 100));
        const profitPercentage = product.profitPercentage ?? 100;
        const cashDiscountPercentage = product.cashDiscountPercentage ?? 25;
        const transferDiscountPercentage = product.transferDiscountPercentage ?? 10;
        const discount = product.discount ?? 0;

        const priceBeforeDiscount = Math.round(newCost * (1 + profitPercentage / 100));
        const newPrice = discount > 0
          ? Math.round(priceBeforeDiscount * (1 - discount / 100))
          : priceBeforeDiscount;
        const newCashPrice = Math.round(newPrice * (1 - cashDiscountPercentage / 100));
        const newTransferPrice = Math.round(newPrice * (1 - transferDiscountPercentage / 100));

        return {
          _id: product._id,
          name: product.name,
          code: product.code,
          currentCost: product.cost,
          newCost,
          costDiff: newCost - product.cost,
          currentPrice: product.price,
          newPrice,
          priceDiff: newPrice - product.price,
          currentCashPrice: product.cashPrice,
          newCashPrice,
          cashPriceDiff: newCashPrice - (product.cashPrice || 0),
          isValid: newCashPrice >= newCost
        };
      });

      const invalidProducts = preview.filter(p => !p.isValid);

      return {
        products: preview,
        totalIncrease: preview.reduce((sum, p) => sum + p.costDiff, 0),
        invalidCount: invalidProducts.length,
        invalidProducts: invalidProducts.map(p => p.name)
      };
    } catch (error) {
      throw new BadRequestException('Error al generar preview: ' + error.message);
    }
  }
}