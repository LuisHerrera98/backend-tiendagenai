import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '../../user/entities/role.entity';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'] || request.tenantId;

    // Admin puede acceder a todo
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Verificar que el usuario pertenece al tenant correcto
    if (user.tenantId && tenantId && user.tenantId === tenantId) {
      return true;
    }

    return false;
  }
}