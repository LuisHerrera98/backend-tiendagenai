import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Prioridad: 1. User's currentTenantId (tienda activa), 2. Request tenantId, 3. Header
    return request.user?.currentTenantId || 
           request.tenantId || 
           request.headers['x-tenant-id'];
  },
);