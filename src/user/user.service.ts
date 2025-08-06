import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
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
}