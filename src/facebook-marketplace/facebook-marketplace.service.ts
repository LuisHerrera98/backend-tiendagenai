import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import * as crypto from 'crypto';
import { FacebookCredentials } from './entities/facebook-credentials.entity';
import { UpdateFacebookCredentialsDto } from './dto/update-facebook-credentials.dto';
import { PublishProductDto, UnpublishProductDto } from './dto/publish-product.dto';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { Brand } from '../brand/entities/brand.entity';
import { Type } from '../type/entities/type.entity';

@Injectable()
export class FacebookMarketplaceService {
  private readonly FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';
  private readonly ENCRYPTION_IV_LENGTH = 16;

  constructor(
    @InjectModel(FacebookCredentials.name)
    private facebookCredentialsModel: Model<FacebookCredentials>,
    @InjectModel(Product.name)
    private productModel: Model<Product>,
    @InjectModel(Category.name)
    private categoryModel: Model<Category>,
    @InjectModel(Brand.name)
    private brandModel: Model<Brand>,
    @InjectModel(Type.name)
    private typeModel: Model<Type>,
  ) {}

  // Encriptar access token
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.ENCRYPTION_KEY.slice(0, 32)),
      iv,
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  // Desencriptar access token
  private decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.ENCRYPTION_KEY.slice(0, 32)),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // Obtener o crear credenciales
  async getCredentials(tenantId: string): Promise<FacebookCredentials> {
    let credentials = await this.facebookCredentialsModel.findOne({ tenantId });

    if (!credentials) {
      credentials = await this.facebookCredentialsModel.create({
        tenantId,
        isEnabled: false,
        autoPublish: false,
        publishedProducts: {},
        totalPublished: 0,
      });
    }

    return credentials;
  }

  // Actualizar credenciales
  async updateCredentials(
    tenantId: string,
    updateDto: UpdateFacebookCredentialsDto,
  ): Promise<FacebookCredentials> {
    let credentials = await this.getCredentials(tenantId);

    if (updateDto.businessId !== undefined) {
      credentials.businessId = updateDto.businessId;
    }
    if (updateDto.catalogId !== undefined) {
      credentials.catalogId = updateDto.catalogId;
    }
    if (updateDto.accessToken !== undefined) {
      // Encriptar el token antes de guardarlo
      credentials.accessToken = this.encrypt(updateDto.accessToken);
    }
    if (updateDto.isEnabled !== undefined) {
      credentials.isEnabled = updateDto.isEnabled;
    }
    if (updateDto.autoPublish !== undefined) {
      credentials.autoPublish = updateDto.autoPublish;
    }

    await credentials.save();
    return credentials;
  }

  // Verificar si las credenciales son válidas
  async testConnection(tenantId: string): Promise<{ success: boolean; message: string }> {
    const credentials = await this.getCredentials(tenantId);

    if (!credentials.accessToken || !credentials.catalogId) {
      return {
        success: false,
        message: 'Configuración incompleta. Agrega Access Token y Catalog ID.',
      };
    }

    try {
      const decryptedToken = this.decrypt(credentials.accessToken);
      const response = await axios.get(
        `${this.FACEBOOK_GRAPH_API}/${credentials.catalogId}`,
        {
          params: { access_token: decryptedToken },
        },
      );

      return {
        success: true,
        message: `Conexión exitosa con catálogo: ${response.data.name}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Error al conectar con Facebook',
      };
    }
  }

  // Publicar productos en Facebook
  async publishProducts(
    tenantId: string,
    publishDto: PublishProductDto,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const credentials = await this.getCredentials(tenantId);

    if (!credentials.isEnabled) {
      throw new BadRequestException('La integración con Facebook no está habilitada');
    }

    if (!credentials.accessToken || !credentials.catalogId) {
      throw new BadRequestException('Configuración incompleta de Facebook');
    }

    const decryptedToken = this.decrypt(credentials.accessToken);
    const products = await this.productModel
      .find({
        _id: { $in: publishDto.productIds },
        tenantId,
      })
      .lean();

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const product of products) {
      try {
        // Obtener información adicional
        const category = product.category_id
          ? await this.categoryModel.findById(product.category_id).lean()
          : null;
        const brand = product.brand_id
          ? await this.brandModel.findById(product.brand_id).lean()
          : null;
        const type = product.type_id
          ? await this.typeModel.findById(product.type_id).lean()
          : null;

        // Preparar datos para Facebook
        const facebookProduct = {
          retailer_id: product._id.toString(), // ID único del producto
          availability: product.active && this.hasStock(product) ? 'in stock' : 'out of stock',
          condition: 'new',
          description: product.description || product.name,
          image_url: product.images?.[0] || '',
          name: product.name,
          price: `${product.price} ARS`, // Formato: "1000 ARS"
          brand: brand?.name || 'Sin marca',
          url: `https://${tenantId}.tudominio.com/producto/${product._id}`, // URL de tu tienda
          additional_image_urls: product.images?.slice(1, 10) || [],
          category: category?.name || 'General',
          custom_label_0: type?.name || '',
          custom_label_1: product.gender_id || '',
        };

        // Publicar en Facebook
        const response = await axios.post(
          `${this.FACEBOOK_GRAPH_API}/${credentials.catalogId}/products`,
          facebookProduct,
          {
            params: { access_token: decryptedToken },
          },
        );

        // Guardar el ID de Facebook
        credentials.publishedProducts[product._id.toString()] = response.data.id;
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          productId: product._id,
          productName: product.name,
          error: error.response?.data?.error?.message || error.message,
        });
      }
    }

    // Actualizar estadísticas
    credentials.totalPublished = Object.keys(credentials.publishedProducts).length;
    credentials.lastSyncAt = new Date();
    await credentials.save();

    return results;
  }

  // Despublicar productos de Facebook
  async unpublishProducts(
    tenantId: string,
    unpublishDto: UnpublishProductDto,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const credentials = await this.getCredentials(tenantId);

    if (!credentials.accessToken || !credentials.catalogId) {
      throw new BadRequestException('Configuración incompleta de Facebook');
    }

    const decryptedToken = this.decrypt(credentials.accessToken);
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const productId of unpublishDto.productIds) {
      const facebookProductId = credentials.publishedProducts[productId];

      if (!facebookProductId) {
        results.failed++;
        results.errors.push({
          productId,
          error: 'Producto no publicado en Facebook',
        });
        continue;
      }

      try {
        await axios.delete(`${this.FACEBOOK_GRAPH_API}/${facebookProductId}`, {
          params: { access_token: decryptedToken },
        });

        delete credentials.publishedProducts[productId];
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          productId,
          error: error.response?.data?.error?.message || error.message,
        });
      }
    }

    credentials.totalPublished = Object.keys(credentials.publishedProducts).length;
    credentials.lastSyncAt = new Date();
    await credentials.save();

    return results;
  }

  // Sincronizar todos los productos activos
  async syncAllProducts(tenantId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    const products = await this.productModel
      .find({ tenantId, active: true })
      .select('_id')
      .lean();

    const productIds = products.map(p => p._id.toString());

    return this.publishProducts(tenantId, { productIds });
  }

  // Obtener estadísticas
  async getStats(tenantId: string): Promise<any> {
    const credentials = await this.getCredentials(tenantId);
    const totalProducts = await this.productModel.countDocuments({ tenantId });
    const activeProducts = await this.productModel.countDocuments({ tenantId, active: true });

    return {
      isConfigured: !!(credentials.accessToken && credentials.catalogId),
      isEnabled: credentials.isEnabled,
      autoPublish: credentials.autoPublish,
      totalPublished: credentials.totalPublished,
      totalProducts,
      activeProducts,
      lastSyncAt: credentials.lastSyncAt,
      publishedProductIds: Object.keys(credentials.publishedProducts || {}),
    };
  }

  // Helper: verificar si tiene stock
  private hasStock(product: any): boolean {
    if (!product.stock || product.stock.length === 0) return false;
    return product.stock.some(s => s.quantity > 0);
  }

  // Obtener productos publicados vs no publicados
  async getPublishedStatus(tenantId: string): Promise<{
    published: any[];
    notPublished: any[];
  }> {
    const credentials = await this.getCredentials(tenantId);
    const publishedIds = Object.keys(credentials.publishedProducts || {});

    const products = await this.productModel
      .find({ tenantId })
      .populate('category_id')
      .populate('brand_id')
      .lean();

    const published = products.filter(p =>
      publishedIds.includes(p._id.toString()),
    );

    const notPublished = products.filter(
      p => !publishedIds.includes(p._id.toString()),
    );

    return { published, notPublished };
  }
}
