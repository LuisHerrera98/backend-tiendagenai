import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import { EmailService } from '../auth/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, Permission, DEFAULT_PERMISSIONS } from './entities/role.entity';

@Injectable()
export class UserManagementService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private emailService: EmailService,
  ) {}

  /**
   * Crear un nuevo usuario para un tenant
   */
  async createTenantUser(
    tenantId: string,
    createUserDto: CreateTenantUserDto,
    createdByUserId: string
  ) {
    // Verificar que el tenant existe
    const tenant = await this.tenantModel.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    // Generar username desde el nombre si no se proporciona
    const username = createUserDto.username || createUserDto.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    
    // Usar el nombre proporcionado
    const fullName = createUserDto.name;
    
    // Construir el email completo con el subdominio del tenant
    const fullEmail = createUserDto.email || `${username}@${tenant.subdomain}.com`;

    // Verificar si el usuario ya existe en este tenant (no eliminado)
    const existingUser = await this.userModel.findOne({
      email: fullEmail,
      primaryTenantId: tenantId,
      deleted: { $ne: true }
    });

    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario con este email en esta tienda');
    }

    // Generar token de configuración
    const setupToken = this.generateSetupToken();
    const setupTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Determinar permisos según el rol
    let permissions = createUserDto.permissions || [];
    if (createUserDto.role !== UserRole.CUSTOM) {
      permissions = DEFAULT_PERMISSIONS[createUserDto.role];
    }

    // Crear el usuario con o sin contraseña según se proporcione
    const userData: any = {
      email: fullEmail,
      username,
      name: fullName,
      role: createUserDto.role,
      permissions,
      phone: createUserDto.phone,
      address: createUserDto.address,
      employeeCode: createUserDto.employeeCode,
      primaryTenantId: tenantId,
      tenantIds: [tenantId],
      currentTenantId: tenantId,
      createdBy: createdByUserId,
      active: true,
    };

    // Si se proporciona contraseña, hashearla y marcar como configurada
    if (createUserDto.password) {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      userData.password = hashedPassword;
      userData.passwordSet = true;
    } else {
      // Si no hay contraseña, configurar token para primer login
      userData.passwordSet = false;
      userData.setupToken = setupToken;
      userData.setupTokenExpires = setupTokenExpires;
    }

    const newUser = new this.userModel(userData);

    await newUser.save();

    // Enviar email de invitación si se solicita
    if (createUserDto.sendInviteEmail) {
      await this.emailService.sendUserInviteEmail(
        fullEmail,
        fullName,
        tenant.storeName,
        tenant.subdomain,
        setupToken
      );
    }

    return {
      id: newUser._id,
      email: fullEmail,
      username,
      name: newUser.name,
      role: newUser.role,
      permissions: newUser.permissions,
      setupToken: createUserDto.sendInviteEmail ? undefined : setupToken, // Solo devolver el token si no se envió email
      active: newUser.active,
    };
  }

  /**
   * Obtener todos los usuarios de un tenant
   */
  async getTenantUsers(tenantId: string, requestingUserId: string) {
    const users = await this.userModel.find({
      primaryTenantId: tenantId,
      deleted: { $ne: true }, // Excluir usuarios eliminados
      _id: { $ne: requestingUserId } // Excluir al usuario que hace la petición
    }).select('-password -setupToken -resetPasswordToken -resetPasswordCode');

    return users.map(user => ({
      _id: user._id,  // Cambiar id por _id para compatibilidad con frontend
      id: user._id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      phone: user.phone,
      employeeCode: user.employeeCode,
      active: user.active,
      passwordSet: user.passwordSet,
      lastLogin: user.lastLogin,
      createdAt: user['createdAt'],
    }));
  }

  /**
   * Obtener un usuario específico
   */
  async getTenantUser(tenantId: string, userId: string) {
    const user = await this.userModel.findOne({
      _id: userId,
      primaryTenantId: tenantId,
      deleted: { $ne: true }
    }).select('-password -setupToken -resetPasswordToken -resetPasswordCode');

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user._id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      phone: user.phone,
      address: user.address,
      employeeCode: user.employeeCode,
      active: user.active,
      passwordSet: user.passwordSet,
      lastLogin: user.lastLogin,
      loginHistory: user.loginHistory?.slice(-10), // Últimos 10 logins
      createdAt: user['createdAt'],
    };
  }

  /**
   * Actualizar un usuario
   */
  async updateTenantUser(
    tenantId: string,
    userId: string,
    updateUserDto: UpdateTenantUserDto,
    updatingUserId: string
  ) {
    // No permitir que un usuario se modifique a sí mismo ciertos campos
    if (userId === updatingUserId && (updateUserDto.role || updateUserDto.active !== undefined)) {
      throw new ForbiddenException('No puedes modificar tu propio rol o estado');
    }

    const user = await this.userModel.findOne({
      _id: userId,
      primaryTenantId: tenantId,
      deleted: { $ne: true }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Actualizar campos permitidos
    if (updateUserDto.name !== undefined) user.name = updateUserDto.name;
    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
      // Actualizar permisos según el nuevo rol
      if (updateUserDto.role !== UserRole.CUSTOM) {
        user.permissions = DEFAULT_PERMISSIONS[updateUserDto.role];
      }
    }
    if (updateUserDto.permissions !== undefined && user.role === UserRole.CUSTOM) {
      user.permissions = updateUserDto.permissions;
    }
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;
    if (updateUserDto.address !== undefined) user.address = updateUserDto.address;
    if (updateUserDto.employeeCode !== undefined) user.employeeCode = updateUserDto.employeeCode;
    if (updateUserDto.active !== undefined) user.active = updateUserDto.active;

    await user.save();

    return {
      id: user._id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      active: user.active,
      message: 'Usuario actualizado exitosamente'
    };
  }

  /**
   * Eliminar un usuario (soft delete)
   */
  async deleteTenantUser(tenantId: string, userId: string, deletingUserId: string) {
    if (userId === deletingUserId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    const user = await this.userModel.findOne({
      _id: userId,
      primaryTenantId: tenantId,
      deleted: false
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que no sea el único admin de la tienda
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userModel.countDocuments({
        primaryTenantId: tenantId,
        role: UserRole.ADMIN,
        active: true,
        deleted: false,
        _id: { $ne: userId }
      });

      if (adminCount === 0) {
        throw new ForbiddenException('No se puede eliminar el único administrador de la tienda');
      }
    }

    // Soft delete: marcar como eliminado y liberar el email
    const timestamp = Date.now();
    user.originalEmail = user.email; // Guardar email original
    user.email = `${user.email}_deleted_${timestamp}`; // Liberar email agregando timestamp
    user.deleted = true;
    user.deletedAt = new Date();
    user.active = false; // También desactivar el usuario

    await user.save();

    return {
      message: 'Usuario eliminado exitosamente'
    };
  }

  /**
   * Resetear la contraseña de un usuario (por admin)
   */
  async resetUserPassword(tenantId: string, userId: string) {
    const user = await this.userModel.findOne({
      _id: userId,
      primaryTenantId: tenantId,
      deleted: { $ne: true }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Generar nuevo token de configuración
    const setupToken = this.generateSetupToken();
    const setupTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    user.setupToken = setupToken;
    user.setupTokenExpires = setupTokenExpires;
    user.passwordSet = false;
    user.password = undefined;

    await user.save();

    // Obtener información del tenant
    const tenant = await this.tenantModel.findById(tenantId);

    // Enviar email con el nuevo token
    await this.emailService.sendPasswordResetByAdminEmail(
      user.email,
      user.name,
      tenant.storeName,
      tenant.subdomain,
      setupToken
    );

    return {
      message: 'Se ha enviado un email al usuario para restablecer su contraseña',
      setupToken // También devolver el token para mostrarlo al admin
    };
  }

  /**
   * Cambiar permisos de un usuario
   */
  async updateUserPermissions(
    tenantId: string,
    userId: string,
    permissions: Permission[]
  ) {
    const user = await this.userModel.findOne({
      _id: userId,
      primaryTenantId: tenantId,
      deleted: { $ne: true },
      role: UserRole.CUSTOM // Solo usuarios con rol CUSTOM pueden tener permisos personalizados
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado o no tiene rol personalizado');
    }

    user.permissions = permissions;
    await user.save();

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      permissions: user.permissions,
      message: 'Permisos actualizados exitosamente'
    };
  }

  /**
   * Obtener lista de permisos disponibles
   */
  getAvailablePermissions() {
    return {
      permissions: Object.values(Permission).map(p => ({
        key: p,
        name: this.getPermissionName(p),
        category: this.getPermissionCategory(p)
      })),
      roles: Object.values(UserRole).map(r => ({
        key: r,
        name: this.getRoleName(r),
        defaultPermissions: DEFAULT_PERMISSIONS[r] || []
      }))
    };
  }

  private generateSetupToken(): string {
    // Generar un código alfanumérico de 8 caracteres
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private getPermissionName(permission: Permission): string {
    const names = {
      [Permission.PRODUCTS_VIEW]: 'Ver productos',
      [Permission.PRODUCTS_EDIT]: 'Editar productos',
      [Permission.PRODUCTS_CREATE]: 'Crear productos',
      [Permission.PRODUCTS_DELETE]: 'Eliminar productos',
      [Permission.PRODUCTS_VIEW_COSTS]: 'Ver costos de productos',
      [Permission.PRODUCTS_MANAGE_STOCK]: 'Modificar stock',
      [Permission.PRODUCTS_MANAGE_DISCOUNTS]: 'Gestionar descuentos',
      [Permission.SALES_VIEW]: 'Ver ventas',
      [Permission.SALES_CREATE]: 'Registrar ventas',
      [Permission.SALES_EDIT]: 'Editar ventas',
      [Permission.SALES_DELETE]: 'Eliminar ventas',
      [Permission.SALES_VIEW_STATS]: 'Ver estadísticas de ventas',
      [Permission.ORDERS_VIEW]: 'Ver pedidos',
      [Permission.ORDERS_MANAGE]: 'Gestionar pedidos',
      [Permission.CATEGORIES_VIEW]: 'Ver categorías',
      [Permission.CATEGORIES_MANAGE]: 'Gestionar categorías',
      [Permission.SIZES_VIEW]: 'Ver tallas',
      [Permission.SIZES_MANAGE]: 'Gestionar tallas',
      [Permission.BRANDS_VIEW]: 'Ver marcas',
      [Permission.BRANDS_MANAGE]: 'Gestionar marcas',
      [Permission.TYPES_VIEW]: 'Ver tipos',
      [Permission.TYPES_MANAGE]: 'Gestionar tipos',
      [Permission.GENDERS_VIEW]: 'Ver géneros',
      [Permission.GENDERS_MANAGE]: 'Gestionar géneros',
      [Permission.COLORS_VIEW]: 'Ver colores',
      [Permission.COLORS_MANAGE]: 'Gestionar colores',
      [Permission.USERS_VIEW]: 'Ver usuarios',
      [Permission.USERS_MANAGE]: 'Gestionar usuarios',
      [Permission.SETTINGS_VIEW]: 'Ver configuración',
      [Permission.SETTINGS_MANAGE]: 'Modificar configuración',
      [Permission.DASHBOARD_VIEW]: 'Ver dashboard',
    };
    return names[permission] || permission;
  }

  private getPermissionCategory(permission: Permission): string {
    if (permission.startsWith('products.')) return 'Productos';
    if (permission.startsWith('sales.')) return 'Ventas';
    if (permission.startsWith('orders.')) return 'Pedidos';
    if (permission.startsWith('categories.')) return 'Categorías';
    if (permission.startsWith('sizes.')) return 'Tallas';
    if (permission.startsWith('brands.')) return 'Marcas';
    if (permission.startsWith('types.')) return 'Tipos';
    if (permission.startsWith('genders.')) return 'Géneros';
    if (permission.startsWith('colors.')) return 'Colores';
    if (permission.startsWith('users.')) return 'Usuarios';
    if (permission.startsWith('settings.')) return 'Configuración';
    if (permission.startsWith('dashboard.')) return 'Dashboard';
    return 'General';
  }

  private getRoleName(role: UserRole): string {
    const names = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.VENDEDOR]: 'Vendedor',
      [UserRole.CUSTOM]: 'Personalizado',
    };
    return names[role] || role;
  }
}