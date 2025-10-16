import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { Brand } from '../brand/entities/brand.entity';
import { Gender } from '../gender/entities/gender.entity';
import { Size } from '../size/entities/size.entity';
import { Color } from '../color/entities/color.entity';
import { Order, PaymentMethod } from '../order/entities/order.entity';
import { OrderService } from '../order/order.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../payment/payment.service';
import { EncryptionService } from '../common/services/encryption.service';

@Injectable()
export class PublicService {
  private encryptionService: EncryptionService;

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Brand.name) private brandModel: Model<Brand>,
    @InjectModel(Gender.name) private genderModel: Model<Gender>,
    @InjectModel(Size.name) private sizeModel: Model<Size>,
    @InjectModel(Color.name) private colorModel: Model<Color>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private orderService: OrderService,
    private emailService: EmailService,
    private paymentService: PaymentService,
  ) {
    this.encryptionService = new EncryptionService();
  }

  async getPaymentConfig(subdomain: string) {
    const store = await this.tenantModel.findOne({ 
      subdomain, 
      status: 'active' 
    }).select('mercadoPagoConfig');
    
    if (!store || !store.mercadoPagoConfig) {
      return { enabled: false, available: false };
    }

    const config = store.mercadoPagoConfig;
    const mode = config.mode || 'test';
    const credentials = config[mode];
    
    // Solo retornar información pública (no las credenciales sensibles)
    return {
      enabled: config.enabled || false,
      available: !!(config.enabled && credentials?.publicKey),
      mode: mode,
      publicKey: credentials?.publicKey || null,
      // No enviar access token ni webhook secret al frontend
    };
  }

  async getStoreBySubdomain(subdomain: string) {
    const store = await this.tenantModel.findOne({ 
      subdomain, 
      status: 'active' 
    }).select('id subdomain storeName customization settings');
    
    if (!store) {
      return null;
    }

    return {
      id: store._id.toString(),
      subdomain: store.subdomain,
      storeName: store.storeName,
      customization: store.customization || {},
      settings: store.settings || {},
    };
  }

  async getStoreProducts(
    tenantId: string,
    filters: {
      featured?: boolean;
      category?: string;
      brand?: string;
      brands?: string[];
      gender?: string;
      sizes?: string[];
      colors?: string[];
      limit: number;
      page: number;
    },
  ) {
    const query: any = {
      tenantId,
      active: true
    };

    if (filters.category) {
      // Buscar subcategorías de esta categoría
      const subcategories = await this.categoryModel
        .find({ parent_id: filters.category, tenantId })
        .select('_id')
        .lean();

      if (subcategories.length > 0) {
        // Si tiene subcategorías, incluir la categoría padre + subcategorías
        const categoryIds = [
          filters.category,
          ...subcategories.map(sub => sub._id.toString())
        ];
        query.category_id = { $in: categoryIds };
      } else {
        // Si no tiene subcategorías, buscar solo por esa categoría
        query.category_id = filters.category;
      }
    }

    if (filters.brand) {
      query.brand_id = filters.brand;
    }

    // Filtro por múltiples marcas
    if (filters.brands && filters.brands.length > 0) {
      query.brand_name = { $in: filters.brands };
    }

    if (filters.gender) {
      query.gender_id = filters.gender;
    }

    // Filtro por colores
    if (filters.colors && filters.colors.length > 0) {
      query.color_id = { $in: filters.colors };
    }

    // Para filtrar por tallas, necesitamos productos que tengan stock en las tallas seleccionadas
    if (filters.sizes && filters.sizes.length > 0) {
      query['stock'] = {
        $elemMatch: {
          size_id: { $in: filters.sizes },
          quantity: { $gt: 0 }
        }
      };
    }

    // Por ahora simular productos destacados con los primeros productos
    const skip = (filters.page - 1) * filters.limit;
    
    const products = await this.productModel
      .find(query)
      .populate('category_id', 'name')
      .populate('brand_id', 'name')
      .skip(skip)
      .limit(filters.limit)
      .sort({ createdAt: -1 });

    const total = await this.productModel.countDocuments(query);

    return {
      products: products.map(p => ({
        id: p._id.toString(),
        name: p.name,
        description: p.description || '',
        price: p.price,
        cashPrice: p.cashPrice || null,
        installmentText: p.installmentText || null,
        withoutStock: p.withoutStock || false,
        discount: p.discount || 0,
        images: p.images?.map(img => typeof img === 'string' ? img : img.url) || [],
        category: p.category_id && typeof p.category_id === 'object' ? {
          id: (p.category_id as any)._id?.toString() || '',
          name: (p.category_id as any).name || '',
        } : null,
        brand: {
          id: p.brand_id?.toString() || '',
          name: p.brand_name || '',
        },
        gender: p.genders?.length > 0 ? p.genders[0] : '', // Por compatibilidad, usar el primer género
        genders: p.genders || [],
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getProductDetail(tenantId: string, productId: string) {
    const product = await this.productModel
      .findOne({ _id: productId, tenantId, active: true })
      .populate('category_id', 'name')
      .populate('stock.size_id', 'name');

    if (!product) {
      return null;
    }

    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description || '',
      price: product.price,
      cashPrice: product.cashPrice || null,
      installmentText: product.installmentText || null,
      withoutStock: product.withoutStock || false,
      cost: product.cost,
      discount: product.discount || 0,
      code: product.code,
      stockType: product.stockType || 'sizes',
      gender: product.genders?.length > 0 ? product.genders[0] : '', // Por compatibilidad
      genders: product.genders || [],
      images: product.images?.map(img => typeof img === 'string' ? img : img.url) || [],
      category: product.category_id && typeof product.category_id === 'object' ? {
        id: (product.category_id as any)._id?.toString() || '',
        name: (product.category_id as any).name || '',
      } : null,
      brand: {
        id: product.brand_id?.toString() || '',
        name: product.brand_name || '',
      },
      model: product.model_name || '',
      stock: product.stock.map(s => {
        // Manejar diferentes formatos de size_id
        let sizeId = '';
        let sizeName = '';
        
        if (s.size_id) {
          if (typeof s.size_id === 'object' && s.size_id._id) {
            // Si está poblado como objeto
            sizeId = s.size_id._id.toString();
            sizeName = s.size_id.name || '';
          } else if (typeof s.size_id === 'string') {
            // Si es solo el ID como string
            sizeId = s.size_id;
            sizeName = s.size_name || '';
          }
        }
        
        return {
          size: {
            id: sizeId,
            name: sizeName || s.size_name || 'Único',
          },
          quantity: s.quantity || 0,
        };
      }).filter(s => s.size.id), // Filtrar los que no tienen ID válido
    };
  }

  async getStoreCategories(tenantId: string) {
    const categories = await this.categoryModel
      .find({ tenantId })
      .sort({ name: 1 });

    return categories.map(c => ({
      id: c._id.toString(),
      name: c.name,
    }));
  }

  async getStoreCategoriesTree(tenantId: string) {
    // Obtener todas las categorías
    const allCategories = await this.categoryModel
      .find({ tenantId })
      .sort({ name: 1 })
      .lean();

    // Separar padres e hijos
    const parents = allCategories.filter(cat => !cat.parent_id);
    const children = allCategories.filter(cat => cat.parent_id);

    // Construir el árbol
    return parents.map(parent => ({
      id: parent._id.toString(),
      _id: parent._id.toString(),
      name: parent.name,
      subcategories: children
        .filter(child => child.parent_id?.toString() === parent._id.toString())
        .map(child => ({
          id: child._id.toString(),
          _id: child._id.toString(),
          name: child.name,
        }))
    }));
  }

  async getStoreFilters(tenantId: string) {
    // Obtener todas las marcas del tenant
    const brandsData = await this.brandModel
      .find({ tenantId })
      .sort({ name: 1 });
    
    const brands = brandsData.map(b => ({
      id: b._id.toString(),
      name: b.name
    }));
    
    // Obtener todos los géneros del tenant
    const gendersData = await this.genderModel
      .find({ tenantId })
      .sort({ name: 1 });
    
    const genders = gendersData.map(g => ({
      id: g._id.toString(),
      name: g.name
    }));

    return {
      brands,
      genders
    };
  }

  async getStoreFiltersByCategory(tenantId: string, categoryId: string) {
    // Obtener productos de la categoría específica
    const products = await this.productModel
      .find({ 
        tenantId, 
        category_id: categoryId, 
        active: true 
      })
      .populate('stock.size_id', 'name')
      .select('brand_name color_id stock');

    // Extraer marcas únicas
    const brandsSet = new Set<string>();
    const colorsSet = new Set<string>();
    const sizesMap = new Map<string, string>();

    products.forEach(product => {
      // Marcas
      if (product.brand_name) {
        brandsSet.add(product.brand_name);
      }

      // Colores
      if (product.color_id) {
        colorsSet.add(product.color_id.toString());
      }

      // Tallas
      if (product.stock && Array.isArray(product.stock)) {
        product.stock.forEach(item => {
          if (item.size_id && item.quantity > 0) {
            // Verificar si size_id es un objeto poblado o solo un ID
            if (typeof item.size_id === 'object' && item.size_id._id) {
              sizesMap.set(item.size_id._id.toString(), item.size_id.name);
            } else if (typeof item.size_id === 'string' && item.size_name) {
              sizesMap.set(item.size_id, item.size_name);
            }
          }
        });
      }
    });

    // Obtener información de colores
    const colorIds = Array.from(colorsSet);
    const colors = await this.colorModel
      .find({ _id: { $in: colorIds } })
      .select('name');

    // Formatear respuesta
    return {
      sizes: Array.from(sizesMap.entries()).map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      colors: colors.map(c => ({ 
        id: c._id.toString(), 
        name: c.name 
      })).sort((a, b) => a.name.localeCompare(b.name)),
      brands: Array.from(brandsSet).map(name => ({ 
        id: name.toLowerCase().replace(/\s+/g, '-'), 
        name 
      })).sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  async createOrder(tenantId: string, createOrderDto: CreateOrderDto) {
    // Crear el pedido
    const result = await this.orderService.create(tenantId, createOrderDto);
    
    // Obtener información de la tienda
    const store = await this.tenantModel.findById(tenantId);
    
    if (store && result.order) {
      // Preparar datos para los emails
      const emailData = {
        orderNumber: result.order._id.toString(),
        customerName: createOrderDto.customerName,
        customerPhone: createOrderDto.customerPhone,
        customerEmail: createOrderDto.customerEmail,
        storeName: store.storeName,
        total: createOrderDto.items.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity;
          const discount = (itemTotal * (item.discount || 0)) / 100;
          return sum + (itemTotal - discount);
        }, 0),
        items: createOrderDto.items.map(item => ({
          ...item,
          subtotal: item.price * item.quantity,
        })),
        notes: createOrderDto.notes,
      };
      
      // Enviar email al cliente si tiene email
      if (createOrderDto.customerEmail) {
        await this.emailService.sendOrderConfirmationToCustomer(
          createOrderDto.customerEmail,
          emailData,
        );
      }
      
      // Enviar email al dueño de la tienda si tiene email configurado
      if (store.settings?.email) {
        await this.emailService.sendNewOrderNotificationToOwner(
          store.settings.email,
          emailData,
        );
      }
    }
    
    return result;
  }

  async createPaymentPreference(tenantId: string, orderId: string) {
    try {
      // Crear la preferencia usando el PaymentService
      const preference = await this.paymentService.createPaymentPreference(tenantId, orderId);
      
      return preference;
    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw error;
    }
  }
}