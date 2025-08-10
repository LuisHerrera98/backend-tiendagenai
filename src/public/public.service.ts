import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { Brand } from '../brand/entities/brand.entity';
import { Gender } from '../gender/entities/gender.entity';
import { OrderService } from '../order/order.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';

@Injectable()
export class PublicService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Brand.name) private brandModel: Model<Brand>,
    @InjectModel(Gender.name) private genderModel: Model<Gender>,
    private orderService: OrderService,
  ) {}

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
      gender?: string;
      limit: number;
      page: number;
    },
  ) {
    const query: any = { 
      tenantId, 
      active: true 
    };

    if (filters.category) {
      query.category_id = filters.category;
    }

    if (filters.brand) {
      query.brand_id = filters.brand;
    }

    if (filters.gender) {
      query.gender_id = filters.gender;
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
      cost: product.cost,
      discount: product.discount || 0,
      code: product.code,
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

  async createOrder(tenantId: string, createOrderDto: CreateOrderDto) {
    return this.orderService.create(tenantId, createOrderDto);
  }
}