import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from './email.service';
import { 
  LoginTenantDto, 
  SetupPasswordDto, 
  RequestPasswordResetDto, 
  ResetPasswordWithCodeDto 
} from './dto/login-tenant.dto';
import { UserRole, Permission, DEFAULT_PERMISSIONS } from '../user/entities/role.entity';

@Injectable()
export class AuthTenantService {
  // Almacén temporal de códigos de recuperación
  private passwordResetCodes = new Map<string, {
    code: string;
    userId: string;
    expiresAt: Date;
  }>();

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {
    // Limpiar códigos expirados cada 5 minutos
    setInterval(() => {
      const now = new Date();
      for (const [key, value] of this.passwordResetCodes.entries()) {
        if (value.expiresAt < now) {
          this.passwordResetCodes.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Login con email del tenant (jose@mitienda.com)
   */
  async loginWithTenantEmail(loginDto: LoginTenantDto) {
    const { email, password } = loginDto;

    // Extraer el username y dominio del email
    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      throw new BadRequestException('Formato de email inválido');
    }

    const [username, domain] = emailParts;
    
    // Extraer el subdominio del dominio (mitienda.com -> mitienda)
    const subdomain = domain.split('.')[0];

    // Buscar el tenant por subdominio
    const tenant = await this.tenantModel.findOne({ subdomain });
    if (!tenant) {
      throw new NotFoundException('Tienda no encontrada');
    }

    // Buscar el usuario en ese tenant (no eliminado)
    const user = await this.userModel.findOne({
      $or: [
        { email: email, primaryTenantId: tenant._id },
        { username: username, primaryTenantId: tenant._id }
      ],
      deleted: { $ne: true }
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el usuario está activo
    if (!user.active) {
      throw new UnauthorizedException('Tu cuenta está desactivada');
    }

    // Si el usuario no ha configurado su contraseña
    if (!user.passwordSet || !user.password) {
      // Generar un token de configuración si no existe
      if (!user.setupToken || user.setupTokenExpires < new Date()) {
        user.setupToken = this.generateSetupToken();
        user.setupTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
        await user.save();

        // Enviar email con instrucciones
        await this.emailService.sendFirstLoginEmail(
          user.email,
          user.name,
          tenant.storeName,
          user.setupToken
        );
      }

      return {
        requiresPasswordSetup: true,
        setupToken: user.setupToken,
        email: user.email,
        message: 'Debes configurar tu contraseña. Revisa tu email para las instrucciones.'
      };
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último login
    user.lastLogin = new Date();
    if (!user.loginHistory) user.loginHistory = [];
    user.loginHistory.push({
      date: new Date(),
      ip: '', // Se puede obtener del request en el controller
      userAgent: '' // Se puede obtener del request en el controller
    });
    await user.save();

    // Obtener permisos del usuario
    let userPermissions = user.permissions || [];
    // Si es ADMIN, darle todos los permisos
    if (user.role === UserRole.ADMIN) {
      userPermissions = Object.values(Permission);
    } else if (user.role !== UserRole.CUSTOM) {
      // Para otros roles no-custom, usar permisos por defecto
      userPermissions = DEFAULT_PERMISSIONS[user.role] || [];
    }

    // Generar token JWT
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: userPermissions,
      tenantId: tenant._id.toString(),
      tenantSubdomain: tenant.subdomain
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: userPermissions
      },
      tenant: {
        id: tenant._id,
        subdomain: tenant.subdomain,
        storeName: tenant.storeName
      }
    };
  }

  /**
   * Configurar contraseña en el primer login
   */
  async setupPassword(setupDto: SetupPasswordDto) {
    const { email, setupToken, newPassword } = setupDto;

    // Buscar el usuario por email y token (no eliminado)
    const user = await this.userModel.findOne({
      email,
      setupToken,
      setupTokenExpires: { $gt: new Date() },
      deleted: { $ne: true }
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar el usuario
    user.password = hashedPassword;
    user.passwordSet = true;
    user.setupToken = undefined;
    user.setupTokenExpires = undefined;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();

    await user.save();

    // Obtener información del tenant
    const tenant = await this.tenantModel.findById(user.primaryTenantId);

    // Generar token JWT para login automático
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || DEFAULT_PERMISSIONS[user.role],
      tenantId: tenant._id.toString(),
      tenantSubdomain: tenant.subdomain
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Contraseña configurada exitosamente',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || DEFAULT_PERMISSIONS[user.role]
      },
      tenant: {
        id: tenant._id,
        subdomain: tenant.subdomain,
        storeName: tenant.storeName
      }
    };
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async requestPasswordReset(requestDto: RequestPasswordResetDto) {
    const { email } = requestDto;

    // Extraer el username y dominio del email
    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      throw new BadRequestException('Formato de email inválido');
    }

    const [username, domain] = emailParts;
    const subdomain = domain.split('.')[0];

    // Buscar el tenant
    const tenant = await this.tenantModel.findOne({ subdomain });
    if (!tenant) {
      // No revelar si el tenant existe o no por seguridad
      return { message: 'Si el email existe, recibirás un código de recuperación' };
    }

    // Buscar el usuario (no eliminado)
    const user = await this.userModel.findOne({
      $or: [
        { email: email, primaryTenantId: tenant._id },
        { username: username, primaryTenantId: tenant._id }
      ],
      deleted: { $ne: true }
    });

    if (!user) {
      // No revelar si el usuario existe o no por seguridad
      return { message: 'Si el email existe, recibirás un código de recuperación' };
    }

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Almacenar el código
    this.passwordResetCodes.set(email, {
      code,
      userId: user._id.toString(),
      expiresAt
    });

    // Enviar email con el código
    await this.emailService.sendPasswordResetCode(
      user.email,
      user.name,
      tenant.storeName,
      code
    );

    return { 
      message: 'Si el email existe, recibirás un código de recuperación',
      expiresIn: 900 // 15 minutos en segundos
    };
  }

  /**
   * Resetear contraseña con código de 6 dígitos
   */
  async resetPasswordWithCode(resetDto: ResetPasswordWithCodeDto) {
    const { email, code, newPassword } = resetDto;

    // Verificar el código
    const storedData = this.passwordResetCodes.get(email);
    
    if (!storedData || storedData.code !== code) {
      throw new BadRequestException('Código inválido');
    }

    if (storedData.expiresAt < new Date()) {
      this.passwordResetCodes.delete(email);
      throw new BadRequestException('El código ha expirado');
    }

    // Buscar el usuario
    const user = await this.userModel.findById(storedData.userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar el usuario
    user.password = hashedPassword;
    user.passwordSet = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Eliminar el código usado
    this.passwordResetCodes.delete(email);

    // Obtener información del tenant
    const tenant = await this.tenantModel.findById(user.primaryTenantId);

    return {
      message: 'Contraseña restablecida exitosamente',
      tenant: {
        subdomain: tenant.subdomain,
        storeName: tenant.storeName
      }
    };
  }

  /**
   * Verificar si un email existe y necesita configurar contraseña
   */
  async checkEmailStatus(email: string) {
    // Extraer el username y dominio del email
    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      return { exists: false };
    }

    const [username, domain] = emailParts;
    const subdomain = domain.split('.')[0];

    // Buscar el tenant
    const tenant = await this.tenantModel.findOne({ subdomain });
    if (!tenant) {
      return { exists: false };
    }

    // Buscar el usuario (no eliminado)
    const user = await this.userModel.findOne({
      $or: [
        { email: email, primaryTenantId: tenant._id },
        { username: username, primaryTenantId: tenant._id }
      ],
      deleted: { $ne: true }
    });

    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      passwordSet: user.passwordSet,
      active: user.active,
      tenant: {
        subdomain: tenant.subdomain,
        storeName: tenant.storeName
      }
    };
  }

  private generateSetupToken(): string {
    // Generar un código alfanumérico de 8 caracteres
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}