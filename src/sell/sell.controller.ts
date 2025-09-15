import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SellService } from './sell.service';
import { CreateSellDto } from './dto/create-sell.dto';
import { UpdateSellDto } from './dto/update-sell.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Permission } from '../user/entities/role.entity';
import { PermissionFilterUtil } from '../common/utils/permission-filter.util';

@Controller('sell')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SellController {
  constructor(private readonly sellService: SellService) {}

  @Post()
  @RequirePermissions(Permission.SALES_CREATE)
  create(@TenantId() tenantId: string, @Body() createSellDto: CreateSellDto) {
    return this.sellService.create(tenantId, createSellDto);
  }

  @Post('register')
  @RequirePermissions(Permission.SALES_CREATE)
  registerSell(@TenantId() tenantId: string, @Body() createSellDto: CreateSellDto) {
    return this.sellService.registerSell(tenantId, createSellDto);
  }

  @Get()
  @RequirePermissions(Permission.SALES_VIEW)
  findAll(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sellService.findAll(tenantId, startDate, endDate);
  }

  @Get('stats')
  @RequirePermissions(Permission.SALES_VIEW)
  async getStats(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.sellService.getSalesStats(tenantId, startDate, endDate);
    
    // Filtrar estadísticas de ganancias según permisos
    return PermissionFilterUtil.filterSalesStats(stats, user);
  }

  @Get(':id')
  @RequirePermissions(Permission.SALES_VIEW)
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sellService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SALES_EDIT)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() updateSellDto: UpdateSellDto) {
    return this.sellService.update(id, updateSellDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.SALES_DELETE)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sellService.remove(id);
  }
}