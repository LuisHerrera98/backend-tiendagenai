import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';

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

  // Admin endpoints
  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllTenants(@Request() req) {
    // Solo super admin puede ver todas las tiendas
    if (req.user.role !== 'super_admin') {
      return [];
    }
    return this.tenantService.findAll();
  }

  @Put(':id/plan')
  @UseGuards(JwtAuthGuard)
  async updatePlan(@Request() req, @Param('id') id: string, @Body('plan') plan: string) {
    if (req.user.role !== 'super_admin') {
      throw new Error('No autorizado');
    }
    return this.tenantService.updatePlan(id, plan);
  }

  @Put(':id/suspend')
  @UseGuards(JwtAuthGuard)
  async suspendTenant(@Request() req, @Param('id') id: string) {
    if (req.user.role !== 'super_admin') {
      throw new Error('No autorizado');
    }
    return this.tenantService.suspendTenant(id);
  }

  @Put(':id/activate')
  @UseGuards(JwtAuthGuard)
  async activateTenant(@Request() req, @Param('id') id: string) {
    if (req.user.role !== 'super_admin') {
      throw new Error('No autorizado');
    }
    return this.tenantService.activateTenant(id);
  }
}