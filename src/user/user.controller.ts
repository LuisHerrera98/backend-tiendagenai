import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserTenantDto } from './dto/create-user-tenant.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('switch-tenant')
  async switchTenant(@Request() req, @Body('tenantId') tenantId: string) {
    return this.userService.switchTenant(req.user.sub, tenantId);
  }

  @Get('tenants')
  async getUserTenants(@Request() req) {
    return this.userService.getUserTenants(req.user.sub);
  }

  @Get('current-tenant')
  async getCurrentTenant(@Request() req) {
    return this.userService.getCurrentTenant(req.user.sub);
  }

  @Post('create-tenant')
  async createTenant(@Request() req, @Body() createUserTenantDto: CreateUserTenantDto) {
    console.log('UserController.createTenant - userId:', req.user.sub);
    console.log('UserController.createTenant - data:', createUserTenantDto);
    return this.userService.createUserTenant(req.user.sub, createUserTenantDto);
  }

  @Post('check-subdomain')
  async checkSubdomain(@Body('subdomain') subdomain: string) {
    return this.userService.checkSubdomainAvailability(subdomain);
  }
}