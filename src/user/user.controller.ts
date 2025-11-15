import { Controller, Get, Post, Body, UseGuards, Request, Param, Patch, Delete, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { UserManagementService } from './user-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserTenantDto } from './dto/create-user-tenant.dto';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import { CreateManagedUserDto, UpdateManagedUserDto } from './dto/manage-user.dto';
import { RequirePermissions, PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permission } from './entities/role.entity';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userManagementService: UserManagementService
  ) {}

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
    return this.userService.createUserTenant(req.user.sub, createUserTenantDto);
  }

  @Post('check-subdomain')
  async checkSubdomain(@Body('subdomain') subdomain: string) {
    return this.userService.checkSubdomainAvailability(subdomain);
  }

  // Gestión de usuarios del tenant - Nuevos endpoints mejorados
  @Get('management/users')
  @RequirePermissions(Permission.USERS_VIEW)
  async getManagementUsers(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.userManagementService.getTenantUsers(tenantId, user.userId);
  }

  @Get('management/users/:userId')
  @RequirePermissions(Permission.USERS_VIEW)
  async getManagementUser(@Param('userId') userId: string, @TenantId() tenantId: string) {
    return this.userManagementService.getTenantUser(tenantId, userId);
  }

  @Post('management/users')
  @RequirePermissions(Permission.USERS_MANAGE)
  async createManagementUser(
    @Body() createUserDto: CreateTenantUserDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.userManagementService.createTenantUser(tenantId, createUserDto, user.userId);
  }

  @Patch('management/users/:userId')
  @RequirePermissions(Permission.USERS_MANAGE)
  async updateManagementUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateTenantUserDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.userManagementService.updateTenantUser(tenantId, userId, updateUserDto, user.userId);
  }

  @Delete('management/users/:userId')
  @RequirePermissions(Permission.USERS_MANAGE)
  async deleteManagementUser(
    @Param('userId') userId: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.userManagementService.deleteTenantUser(tenantId, userId, user.userId);
  }

  @Post('management/users/:userId/reset-password')
  @RequirePermissions(Permission.USERS_MANAGE)
  async resetUserPassword(
    @Param('userId') userId: string,
    @TenantId() tenantId: string
  ) {
    return this.userManagementService.resetUserPassword(tenantId, userId);
  }

  @Put('management/users/:userId/permissions')
  @RequirePermissions(Permission.USERS_MANAGE)
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body('permissions') permissions: Permission[],
    @TenantId() tenantId: string
  ) {
    return this.userManagementService.updateUserPermissions(tenantId, userId, permissions);
  }

  @Get('management/permissions')
  async getManagementPermissions() {
    return this.userManagementService.getAvailablePermissions();
  }

  // Endpoints originales para compatibilidad
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