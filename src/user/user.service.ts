import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { CreateUserTenantDto } from './dto/create-user-tenant.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private jwtService: JwtService,
  ) {}

  async switchTenant(userId: string, tenantId: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el usuario tenga acceso a esta tienda
    if (!user.tenantIds.includes(tenantId)) {
      throw new NotFoundException('No tienes acceso a esta tienda');
    }

    // Actualizar la tienda activa
    user.currentTenantId = tenantId;
    await user.save();

    // Obtener información de la tienda
    const tenant = await this.tenantModel.findById(tenantId);

    return {
      message: 'Tienda cambiada exitosamente',
      currentTenant: {
        id: tenant._id,
        subdomain: tenant.subdomain,
        storeName: tenant.storeName,
      }
    };
  }

  async getUserTenants(userId: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const tenants = await this.tenantModel.find({
      _id: { $in: user.tenantIds },
      status: 'active'
    });

    return tenants.map(t => ({
      id: t._id,
      subdomain: t.subdomain,
      storeName: t.storeName,
      isActive: t._id.toString() === user.currentTenantId?.toString()
    }));
  }

  async getCurrentTenant(userId: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user || !user.currentTenantId) {
      return null;
    }

    const tenant = await this.tenantModel.findById(user.currentTenantId);
    
    return {
      id: tenant._id,
      subdomain: tenant.subdomain,
      storeName: tenant.storeName,
    };
  }

  async createUserTenant(userId: string, createUserTenantDto: CreateUserTenantDto) {
    const { subdomain, storeName, phone } = createUserTenantDto;

    // Verificar que el usuario existe
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si el subdominio ya existe
    const existingSubdomain = await this.tenantModel.findOne({ subdomain });
    if (existingSubdomain) {
      throw new BadRequestException('Este subdominio ya está en uso');
    }

    // Crear la nueva tienda
    const tenant = new this.tenantModel({
      subdomain,
      storeName,
      email: user.email,
      ownerName: user.name,
      phone: phone || '',
      status: 'active', // La tienda se crea activa directamente
      plan: 'free',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días de prueba
      customization: {},
      settings: {
        currency: 'ARS',
        timezone: 'America/Argentina/Buenos_Aires',
        language: 'es',
      },
    });

    const savedTenant = await tenant.save();

    // Agregar la nueva tienda al usuario
    user.tenantIds.push(savedTenant._id.toString());
    user.currentTenantId = savedTenant._id.toString(); // Establecer como tienda activa
    await user.save();

    // Generar nuevo token JWT con la nueva tienda
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      tenantId: savedTenant._id.toString(),
      currentTenantId: savedTenant._id.toString(),
      tenantIds: user.tenantIds,
      name: user.name,
    };

    const access_token = this.jwtService.sign(payload);

    // Obtener todas las tiendas actualizadas del usuario
    const allTenants = await this.tenantModel.find({
      _id: { $in: user.tenantIds },
      status: 'active'
    });

    return {
      message: 'Tienda creada exitosamente',
      access_token,
      tenant: {
        id: savedTenant._id,
        subdomain: savedTenant.subdomain,
        storeName: savedTenant.storeName,
      },
      tenants: allTenants.map(t => ({
        id: t._id.toString(),
        subdomain: t.subdomain,
        storeName: t.storeName,
        isActive: t._id.toString() === savedTenant._id.toString()
      }))
    };
  }

  async checkSubdomainAvailability(subdomain: string) {
    // Validar formato del subdominio
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return {
        available: false,
        message: 'El subdominio solo puede contener letras minúsculas, números y guiones'
      };
    }

    // Verificar longitud
    if (subdomain.length < 3) {
      return {
        available: false,
        message: 'El subdominio debe tener al menos 3 caracteres'
      };
    }

    // Lista de subdominios reservados
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store', 'tienda'];
    if (reservedSubdomains.includes(subdomain)) {
      return {
        available: false,
        message: 'Este subdominio está reservado'
      };
    }

    // Verificar si ya existe
    const existing = await this.tenantModel.findOne({ subdomain });
    if (existing) {
      return {
        available: false,
        message: 'Este subdominio ya está en uso'
      };
    }

    return {
      available: true,
      message: 'Subdominio disponible'
    };
  }
}