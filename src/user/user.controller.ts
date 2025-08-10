import { Controller, Get, Post, Body, UseGuards, Request, Param, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserTenantDto } from './dto/create-user-tenant.dto';
import { CreateManagedUserDto, UpdateManagedUserDto } from './dto/manage-user.dto';
import { RequirePermissions, PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permission } from './entities/role.entity';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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

  // Gestión de usuarios del tenant
  @Get('tenant-users')
  @RequirePermissions(Permission.USERS_VIEW)
  async getTenantUsers(@TenantId() tenantId: string) {
    return this.userService.getTenantUsers(tenantId);
  }

  @Get('tenant-users/:userId')
  @RequirePermissions(Permission.USERS_VIEW)
  async getTenantUser(@Param('userId') userId: string, @TenantId() tenantId: string) {
    return this.userService.getTenantUser(userId, tenantId);
  }

  @Post('tenant-users')
  @RequirePermissions(Permission.USERS_MANAGE)
  async createTenantUser(
    @Body() createManagedUserDto: CreateManagedUserDto,
    @TenantId() tenantId: string,
    @Request() req
  ) {
    return this.userService.createTenantUser(createManagedUserDto, tenantId, req.user.userId);
  }

  @Patch('tenant-users/:userId')
  @RequirePermissions(Permission.USERS_MANAGE)
  async updateTenantUser(
    @Param('userId') userId: string,
    @Body() updateManagedUserDto: UpdateManagedUserDto,
    @TenantId() tenantId: string,
    @Request() req
  ) {
    return this.userService.updateTenantUser(userId, updateManagedUserDto, tenantId, req.user.userId);
  }

  @Delete('tenant-users/:userId')
  @RequirePermissions(Permission.USERS_MANAGE)
  async deleteTenantUser(
    @Param('userId') userId: string,
    @TenantId() tenantId: string,
    @Request() req
  ) {
    return this.userService.deleteTenantUser(userId, tenantId, req.user.userId);
  }

  @Get('permissions')
  async getAvailablePermissions() {
    return this.userService.getAvailablePermissions();
  }
}