import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ColorService } from './color.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('color')
@UseGuards(JwtAuthGuard)
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() createColorDto: CreateColorDto) {
    return this.colorService.create(tenantId, createColorDto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.colorService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.colorService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() updateColorDto: UpdateColorDto) {
    return this.colorService.update(tenantId, id, updateColorDto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.colorService.remove(tenantId, id);
  }
}