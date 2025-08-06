import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}