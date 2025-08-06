import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async findBySubdomain(subdomain: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findOne({ 
      subdomain: subdomain.toLowerCase(),
      status: 'active'
    });
    
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    
    return tenant;
  }

  async findById(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantModel.findById(id);
    
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }
    
    return tenant;
  }

  async updateCustomization(tenantId: string, customization: any) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { customization },
      { new: true }
    );
  }

  async updateSettings(tenantId: string, settings: any) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { settings },
      { new: true }
    );
  }

  async incrementProductCount(tenantId: string, increment: number = 1) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { $inc: { productCount: increment } },
      { new: true }
    );
  }

  async incrementSaleCount(tenantId: string, increment: number = 1) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { $inc: { saleCount: increment } },
      { new: true }
    );
  }

  async findAll() {
    return this.tenantModel.find().sort({ createdAt: -1 });
  }

  async updatePlan(tenantId: string, plan: string) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { plan },
      { new: true }
    );
  }

  async suspendTenant(tenantId: string) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { status: 'suspended' },
      { new: true }
    );
  }

  async activateTenant(tenantId: string) {
    return this.tenantModel.findByIdAndUpdate(
      tenantId,
      { status: 'active' },
      { new: true }
    );
  }
}