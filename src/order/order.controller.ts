import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { OrderStatus } from './entities/order.entity';

@Controller('order')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    const tenantId = req.user.tenantId;
    return this.orderService.create(tenantId, createOrderDto);
  }

  @Get()
  findAll(@Req() req, @Query('status') status?: OrderStatus) {
    const tenantId = req.user.tenantId;
    return this.orderService.findAll(tenantId, status);
  }

  @Get('stats')
  getStats(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.orderService.getStats(tenantId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.orderService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req, 
    @Param('id') id: string,
    @Body('status') status: OrderStatus
  ) {
    const tenantId = req.user.tenantId;
    return this.orderService.updateStatus(tenantId, id, status);
  }
}
