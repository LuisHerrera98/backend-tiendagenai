import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { Tenant, TenantDocument } from '../tenant/entities/tenant.entity';
import { CreateTenantDto } from '../tenant/dto/create-tenant.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service';
import { UserRole, Permission, DEFAULT_PERMISSIONS } from '../user/entities/role.entity';

@Injectable()
export class AuthService {
  // Almacén temporal de códigos de verificación
  private verificationCodes = new Map<string, {
    code: string;
    data: CreateTenantDto;
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
      for (const [key, value] of this.verificationCodes.entries()) {
        if (value.expiresAt < now) {
          this.verificationCodes.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async registerTenant(createTenantDto: CreateTenantDto) {
    const { subdomain, email, password, storeName, ownerName, phone } = createTenantDto;

    // Verificar si el subdominio ya existe
    const existingSubdomain = await this.tenantModel.findOne({ subdomain });
    if (existingSubdomain) {
      throw new BadRequestException('Este subdominio ya está en uso');
    }

    // Verificar si el email ya existe
    const existingEmail = await this.tenantModel.findOne({ email });
    if (existingEmail) {
      throw new BadRequestException('Este email ya está registrado');
    }

    // Crear el tenant
    const verificationToken = uuidv4();
    const tenant = new this.tenantModel({
      subdomain,
      storeName,
      email,
      ownerName,
      phone,
      verificationToken,
      status: 'pending_verification',
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

    // Crear el usuario owner
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      email,
      password: hashedPassword,
      name: ownerName,
      role: UserRole.ADMIN,
      tenantId: savedTenant._id,
      emailVerificationToken: verificationToken,
    });

    await user.save();

    // Enviar email de verificación
    await this.emailService.sendVerificationEmail(email, verificationToken, subdomain);

    return {
      message: 'Tienda registrada exitosamente. Revisa tu email para verificar tu cuenta.',
      subdomain,
      verificationRequired: true,
    };
  }

  async verifyEmail(token: string) {
    // Este método está deprecated - usar verifyCodeAndCreateTenant
    throw new BadRequestException('Método de verificación no disponible. Use el código de verificación.');
  }

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.emailVerified && user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Por favor verifica tu email antes de iniciar sesión');
    }

    // Obtener todas las tiendas del usuario
    const tenants = await this.tenantModel.find({
      _id: { $in: user.tenantIds },
      status: 'active'
    });

    // Si no tiene tienda actual seleccionada, usar la primera
    if (!user.currentTenantId && tenants.length > 0) {
      user.currentTenantId = tenants[0]._id.toString();
      await user.save();
    }

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.currentTenantId ? user.currentTenantId.toString() : null,
      currentTenantId: user.currentTenantId ? user.currentTenantId.toString() : null,
      tenantIds: user.tenantIds,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        currentTenantId: user.currentTenantId?.toString(),
        tenants: tenants.map(t => ({
          id: t._id.toString(),
          subdomain: t.subdomain,
          storeName: t.storeName,
          isActive: t._id.toString() === user.currentTenantId?.toString()
        }))
      },
    };
  }

  async requestPasswordReset(email: string, tenantId?: string) {
    const query: any = { email };
    if (tenantId) {
      query.tenantId = tenantId;
    }

    const user = await this.userModel.findOne(query);
    if (!user) {
      // No revelar si el email existe o no
      return { message: 'Si el email existe, recibirás un código para restablecer tu contraseña', success: true };
    }

    // Generar código de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('🔐 Password reset code generated:', resetCode);
    
    user.resetPasswordCode = resetCode;
    user.resetPasswordToken = uuidv4(); // Mantener token para compatibilidad
    user.resetPasswordExpires = new Date(Date.now() + 900000); // 15 minutos
    await user.save();

    console.log('📧 Sending password reset code to:', email);
    await this.emailService.sendPasswordResetCode(email, resetCode, user.name);

    return { message: 'Si el email existe, recibirás un código para restablecer tu contraseña', success: true };
  }

  async verifyResetCode(email: string, code: string) {
    const user = await this.userModel.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Código inválido o expirado');
    }

    return { valid: true, token: user.resetPasswordToken };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.userModel.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Código inválido o expirado');
    }

    // Verificar que la nueva contraseña no sea igual a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña no puede ser igual a la actual');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Contraseña actualizada exitosamente', success: true };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async checkSubdomainAvailability(subdomain: string) {
    const exists = await this.tenantModel.exists({ subdomain });
    return { available: !exists };
  }

  async sendVerificationCode(createTenantDto: CreateTenantDto) {
    const { subdomain, email } = createTenantDto;

    // Verificar si el subdominio ya existe
    const existingSubdomain = await this.tenantModel.findOne({ subdomain });
    if (existingSubdomain) {
      throw new BadRequestException('Este subdominio ya está en uso');
    }

    // Verificar si el email ya existe
    const existingEmail = await this.tenantModel.findOne({ email });
    if (existingEmail) {
      throw new BadRequestException('Este email ya está registrado');
    }

    // Generar código de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Almacenar código temporalmente (expira en 10 minutos)
    const codeKey = `${email}_${subdomain}`;
    this.verificationCodes.set(codeKey, {
      code: verificationCode,
      data: createTenantDto,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    });

    // Enviar email con código
    await this.emailService.sendVerificationCode(email, verificationCode, subdomain);

    return {
      message: 'Código de verificación enviado al email',
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2') // Ocultar parte del email
    };
  }

  async verifyCodeAndCreateTenant(email: string, subdomain: string, code: string) {
    const codeKey = `${email}_${subdomain}`;
    const storedData = this.verificationCodes.get(codeKey);

    if (!storedData) {
      throw new BadRequestException('Código de verificación no encontrado o expirado');
    }

    if (storedData.code !== code) {
      throw new BadRequestException('Código de verificación incorrecto');
    }

    if (storedData.expiresAt < new Date()) {
      this.verificationCodes.delete(codeKey);
      throw new BadRequestException('Código de verificación expirado');
    }

    // Código correcto, crear el tenant
    const createTenantDto = storedData.data;
    
    // Verificar nuevamente que el subdominio siga disponible
    const existingSubdomain = await this.tenantModel.findOne({ subdomain });
    if (existingSubdomain) {
      this.verificationCodes.delete(codeKey);
      throw new BadRequestException('Este subdominio ya no está disponible');
    }

    // Crear el tenant
    const tenant = new this.tenantModel({
      subdomain,
      storeName: createTenantDto.storeName,
      email,
      ownerName: createTenantDto.ownerName,
      phone: createTenantDto.phone,
      status: 'active', // Ya verificado
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

    // Verificar si el usuario ya existe
    let user = await this.userModel.findOne({ email });
    
    if (user) {
      // Si el usuario ya existe, agregar la nueva tienda a su lista
      user.tenantIds.push(savedTenant._id.toString());
      user.currentTenantId = savedTenant._id.toString(); // Establecer como tienda activa
      await user.save();
    } else {
      // Crear nuevo usuario si no existe
      const hashedPassword = await bcrypt.hash(createTenantDto.password, 10);
      user = new this.userModel({
        email,
        password: hashedPassword,
        name: createTenantDto.ownerName,
        role: UserRole.ADMIN,
        tenantIds: [savedTenant._id],
        currentTenantId: savedTenant._id,
        emailVerified: true, // Ya verificado con código
        emailVerifiedAt: new Date(),
      });
      await user.save();
    }

    // Limpiar código usado
    this.verificationCodes.delete(codeKey);

    // Enviar email de bienvenida
    await this.emailService.sendWelcomeEmail(email, createTenantDto.storeName, subdomain);

    // Generar token JWT para login automático
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.currentTenantId ? user.currentTenantId.toString() : null,
      currentTenantId: user.currentTenantId ? user.currentTenantId.toString() : null,
      tenantIds: user.tenantIds,
      name: user.name,
    };

    // Obtener todas las tiendas del usuario para el response
    const userTenants = await this.tenantModel.find({
      _id: { $in: user.tenantIds },
      status: 'active'
    });

    return {
      message: '¡Tienda creada exitosamente!',
      subdomain,
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        currentTenantId: user.currentTenantId?.toString(),
        tenants: userTenants.map(t => ({
          id: t._id.toString(),
          subdomain: t.subdomain,
          storeName: t.storeName,
          isActive: t._id.toString() === user.currentTenantId?.toString()
        }))
      },
    };
  }
}