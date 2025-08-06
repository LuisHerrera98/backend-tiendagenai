import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './entities/tenant.entity';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: TenantDocument;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Obtener el host
    const host = req.get('host');
    
    // Extraer el subdominio
    const subdomain = this.extractSubdomain(host);
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      try {
        // Buscar el tenant por subdominio
        const tenant = await this.tenantModel.findOne({ 
          subdomain: subdomain.toLowerCase(),
          status: 'active'
        });
        
        if (tenant) {
          req.tenantId = tenant._id.toString();
          req.tenant = tenant;
        }
      } catch (error) {
        console.error('Error finding tenant:', error);
      }
    }

    // También verificar el header x-tenant-id (útil para desarrollo)
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdHeader && !req.tenantId) {
      req.tenantId = tenantIdHeader;
    }

    next();
  }

  private extractSubdomain(host: string): string | null {
    if (!host) return null;

    // Remover el puerto si existe
    const hostname = host.split(':')[0];
    
    // Para desarrollo local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }

    // Extraer el subdominio
    const parts = hostname.split('.');
    
    // Si tiene al menos 3 partes, el primero es el subdominio
    if (parts.length >= 3) {
      return parts[0];
    }

    return null;
  }
}