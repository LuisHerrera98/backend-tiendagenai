import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'] || request.tenantId;

    // Super admin puede acceder a todo
    if (user.role === 'super_admin') {
      return true;
    }

    // Verificar que el usuario pertenece al tenant correcto
    if (user.tenantId && tenantId && user.tenantId === tenantId) {
      return true;
    }

    return false;
  }
}