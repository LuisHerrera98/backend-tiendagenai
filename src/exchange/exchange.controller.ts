import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { CreateMassiveExchangeDto } from './dto/create-massive-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { Permission } from '../user/entities/role.entity';

@Controller('exchange')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  @RequirePermissions(Permission.SALES_EDIT)
  create(@TenantId() tenantId: string, @Body() createExchangeDto: CreateExchangeDto) {
    return this.exchangeService.create(tenantId, createExchangeDto);
  }

  @Post('massive')
  @RequirePermissions(Permission.SALES_EDIT)
  createMassive(@TenantId() tenantId: string, @Body() createMassiveExchangeDto: CreateMassiveExchangeDto) {
    return this.exchangeService.createMassiveExchange(tenantId, createMassiveExchangeDto);
  }

  @Get()
  @RequirePermissions(Permission.SALES_VIEW)
  findAll(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.exchangeService.findAll(tenantId, startDate, endDate);
  }

  @Get('stats')
  @RequirePermissions(Permission.SALES_VIEW)
  getStats(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.exchangeService.getExchangeStats(tenantId, startDate, endDate);
  }

  @Get(':id')
  @RequirePermissions(Permission.SALES_VIEW)
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.exchangeService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SALES_EDIT)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() updateExchangeDto: UpdateExchangeDto) {
    return this.exchangeService.update(tenantId, id, updateExchangeDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.SALES_DELETE)
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.exchangeService.remove(tenantId, id);
  }
}