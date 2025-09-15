import { Controller, Get, Put, Post, Body, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../user/entities/role.entity';
import { UpdateMercadoPagoConfigDto, ValidateCredentialsDto } from '../payment/dto/mercadopago-config.dto';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentTenant(@Request() req) {
    if (!req.user.tenantId) {
      return null;
    }
    return this.tenantService.findById(req.user.tenantId);
  }

  @Get('by-subdomain/:subdomain')
  async getBySubdomain(@Param('subdomain') subdomain: string) {
    return this.tenantService.findBySubdomain(subdomain);
  }

  @Put('customization')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async updateCustomization(@Request() req, @Body() customization: any) {
    return this.tenantService.updateCustomization(req.user.tenantId, customization);
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async updateSettings(@Request() req, @Body() settings: any) {
    return this.tenantService.updateSettings(req.user.tenantId, settings);
  }

  // MercadoPago Configuration Endpoints
  @Get('mercadopago/config')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getMercadoPagoConfig(@Headers('x-tenant-id') tenantId: string) {
    return this.tenantService.getMercadoPagoConfig(tenantId);
  }

  @Put('mercadopago/config')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async updateMercadoPagoConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Body() config: UpdateMercadoPagoConfigDto,
  ) {
    return this.tenantService.updateMercadoPagoConfig(tenantId, config);
  }

  @Post('mercadopago/validate')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async validateMercadoPagoCredentials(@Body() credentials: ValidateCredentialsDto) {
    return this.tenantService.validateMercadoPagoCredentials(credentials);
  }

  // Admin endpoints
  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllTenants(@Request() req) {
    // Solo super admin puede ver todas las tiendas
    if (req.user.role !== UserRole.ADMIN) {
      return [];
    }
    return this.tenantService.findAll();
  }

  @Put(':id/plan')
  @UseGuards(JwtAuthGuard)
  async updatePlan(@Request() req, @Param('id') id: string, @Body('plan') plan: string) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new Error('No autorizado');
    }
    return this.tenantService.updatePlan(id, plan);
  }

  @Put(':id/suspend')
  @UseGuards(JwtAuthGuard)
  async suspendTenant(@Request() req, @Param('id') id: string) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new Error('No autorizado');
    }
    return this.tenantService.suspendTenant(id);
  }

  @Put(':id/activate')
  @UseGuards(JwtAuthGuard)
  async activateTenant(@Request() req, @Param('id') id: string) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new Error('No autorizado');
    }
    return this.tenantService.activateTenant(id);
  }
}