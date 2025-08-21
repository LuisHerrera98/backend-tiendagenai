import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SizeService } from './size.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { CreateMultipleSizesDto } from './dto/create-multiple-sizes.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('size')
@UseGuards(JwtAuthGuard)
export class SizeController {
  constructor(private readonly sizeService: SizeService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() createSizeDto: CreateSizeDto) {
    return this.sizeService.create(tenantId, createSizeDto);
  }

  @Post('multiple')
  createMultiple(@TenantId() tenantId: string, @Body() createMultipleSizesDto: CreateMultipleSizesDto) {
    return this.sizeService.createMultiple(tenantId, createMultipleSizesDto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.sizeService.findAll(tenantId);
  }

  @Get('category/:categoryId')
  findAllByCategory(@TenantId() tenantId: string, @Param('categoryId') categoryId: string) {
    return this.sizeService.findAllByCategory(tenantId, categoryId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sizeService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() updateSizeDto: UpdateSizeDto) {
    return this.sizeService.update(tenantId, id, updateSizeDto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.sizeService.remove(tenantId, id);
  }
}