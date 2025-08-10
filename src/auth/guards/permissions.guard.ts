import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, Permission, DEFAULT_PERMISSIONS } from '../../user/entities/role.entity';

export const RequirePermissions = (...permissions: Permission[]) => 
  Reflect.metadata('permissions', permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<Permission[]>(
      'permissions',
      context.getHandler()
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Super admin siempre tiene acceso
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Obtener permisos del usuario
    let userPermissions: Permission[] = [];

    if (user.role === UserRole.CUSTOM) {
      // Usuario custom usa sus permisos específicos
      userPermissions = user.permissions || [];
    } else {
      // Otros roles usan permisos por defecto
      userPermissions = DEFAULT_PERMISSIONS[user.role] || [];
    }

    // Verificar si el usuario tiene al menos uno de los permisos requeridos
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes permisos para realizar esta acción. Se requiere: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}