import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Prioridad: 1. User's tenantId (desde JWT), 2. User's currentTenantId (legacy), 3. Header
    return request.user?.tenantId || 
           request.user?.currentTenantId ||
           request.headers['x-tenant-id'] ||
           request.tenantId;
  },
);