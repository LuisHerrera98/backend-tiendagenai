import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { CreateUserTenantDto } from './dto/create-user-tenant.dto';
import { CreateManagedUserDto, UpdateManagedUserDto } from './dto/manage-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole, Permission, DEFAULT_PERMISSIONS } from './entities/role.entity';

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

  // Métodos de gestión de usuarios del tenant
  async getTenantUsers(tenantId: string) {
    const users = await this.userModel.find({
      tenantIds: tenantId
    }).select('-password -resetPasswordToken -emailVerificationToken');

    return users.map(user => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.role === UserRole.CUSTOM ? user.permissions : DEFAULT_PERMISSIONS[user.role],
      active: user.active,
      phone: user.phone,
      address: user.address,
      employeeCode: user.employeeCode,
      lastLogin: user.lastLogin,
      createdAt: user['createdAt'],
      createdBy: user.createdBy
    }));
  }

  async getTenantUser(userId: string, tenantId: string) {
    const user = await this.userModel.findOne({
      _id: userId,
      tenantIds: tenantId
    }).select('-password -resetPasswordToken -emailVerificationToken');

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.role === UserRole.CUSTOM ? user.permissions : DEFAULT_PERMISSIONS[user.role],
      active: user.active,
      phone: user.phone,
      address: user.address,
      employeeCode: user.employeeCode,
      lastLogin: user.lastLogin,
      createdAt: user['createdAt'],
      createdBy: user.createdBy
    };
  }

  async createTenantUser(
    createManagedUserDto: CreateManagedUserDto,
    tenantId: string,
    creatorId: string
  ) {
    // Verificar si el email ya existe
    const existingUser = await this.userModel.findOne({ email: createManagedUserDto.email });
    
    if (existingUser) {
      // Si el usuario ya existe, agregar el tenant a su lista
      if (!existingUser.tenantIds.includes(tenantId)) {
        existingUser.tenantIds.push(tenantId);
        await existingUser.save();
      }
      throw new BadRequestException('Este email ya está registrado. El usuario fue agregado a esta tienda.');
    }

    // Crear nuevo usuario
    const hashedPassword = await bcrypt.hash(createManagedUserDto.password, 10);
    
    const newUser = new this.userModel({
      ...createManagedUserDto,
      password: hashedPassword,
      tenantIds: [tenantId],
      currentTenantId: tenantId,
      emailVerified: true, // Los usuarios creados por admin están verificados
      createdBy: creatorId,
      permissions: createManagedUserDto.role === UserRole.CUSTOM ? createManagedUserDto.permissions : []
    });

    const savedUser = await newUser.save();

    return {
      _id: savedUser._id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
      permissions: savedUser.role === UserRole.CUSTOM ? savedUser.permissions : DEFAULT_PERMISSIONS[savedUser.role],
      active: savedUser.active,
      phone: savedUser.phone,
      address: savedUser.address,
      employeeCode: savedUser.employeeCode
    };
  }

  async updateTenantUser(
    userId: string,
    updateManagedUserDto: UpdateManagedUserDto,
    tenantId: string,
    updaterId: string
  ) {
    const user = await this.userModel.findOne({
      _id: userId,
      tenantIds: tenantId
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No permitir que un usuario se modifique a sí mismo el rol
    if (userId === updaterId && updateManagedUserDto.role) {
      throw new ForbiddenException('No puedes cambiar tu propio rol');
    }

    // Si se está actualizando la contraseña, hashearla
    if (updateManagedUserDto.password) {
      updateManagedUserDto.password = await bcrypt.hash(updateManagedUserDto.password, 10);
    }

    // Si se cambia el rol a algo diferente de CUSTOM, limpiar permisos
    if (updateManagedUserDto.role && updateManagedUserDto.role !== UserRole.CUSTOM) {
      updateManagedUserDto.permissions = [];
    }

    Object.assign(user, updateManagedUserDto);
    const updatedUser = await user.save();

    return {
      _id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      permissions: updatedUser.role === UserRole.CUSTOM ? updatedUser.permissions : DEFAULT_PERMISSIONS[updatedUser.role],
      active: updatedUser.active,
      phone: updatedUser.phone,
      address: updatedUser.address,
      employeeCode: updatedUser.employeeCode
    };
  }

  async deleteTenantUser(userId: string, tenantId: string, deleterId: string) {
    // No permitir que un usuario se elimine a sí mismo
    if (userId === deleterId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    const user = await this.userModel.findOne({
      _id: userId,
      tenantIds: tenantId
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Si el usuario solo pertenece a este tenant, eliminarlo completamente
    if (user.tenantIds.length === 1) {
      await this.userModel.deleteOne({ _id: userId });
    } else {
      // Si pertenece a más tenants, solo remover este tenant
      user.tenantIds = user.tenantIds.filter(id => id.toString() !== tenantId);
      if (user.currentTenantId?.toString() === tenantId) {
        user.currentTenantId = user.tenantIds[0];
      }
      await user.save();
    }

    return { message: 'Usuario eliminado exitosamente' };
  }

  async getAvailablePermissions() {
    return {
      roles: Object.values(UserRole),
      permissions: Object.values(Permission).map(p => ({
        key: p,
        name: p.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        category: p.split('.')[0].toUpperCase()
      })),
      defaultPermissions: DEFAULT_PERMISSIONS
    };
  }
}