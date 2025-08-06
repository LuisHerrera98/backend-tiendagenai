import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SellService } from './sell.service';
import { CreateSellDto } from './dto/create-sell.dto';
import { UpdateSellDto } from './dto/update-sell.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('sell')
@UseGuards(JwtAuthGuard)
export class SellController {
  constructor(private readonly sellService: SellService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() createSellDto: CreateSellDto) {
    return this.sellService.create(tenantId, createSellDto);
  }

  @Post('register')
  registerSell(@TenantId() tenantId: string, @Body() createSellDto: CreateSellDto) {
    return this.sellService.registerSell(tenantId, createSellDto);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sellService.findAll(startDate, endDate);
  }

  @Get('stats')
  getStats(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sellService.getSalesStats(startDate, endDate);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sellService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() updateSellDto: UpdateSellDto) {
    return this.sellService.update(id, updateSellDto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sellService.remove(id);
  }
}