import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ModeloService } from './modelo.service';
import { CreateModeloDto } from './dto/create-modelo.dto';
import { UpdateModeloDto } from './dto/update-modelo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('modelo')
@UseGuards(JwtAuthGuard)
export class ModeloController {
  constructor(private readonly modeloService: ModeloService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() createModeloDto: CreateModeloDto) {
    return this.modeloService.create(tenantId, createModeloDto);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.modeloService.findAll(tenantId);
  }

  @Get('category/:categoryId')
  findAllByCategory(@TenantId() tenantId: string, @Param('categoryId') categoryId: string) {
    return this.modeloService.findAllByCategory(tenantId, categoryId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.modeloService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() updateModeloDto: UpdateModeloDto) {
    return this.modeloService.update(tenantId, id, updateModeloDto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.modeloService.remove(tenantId, id);
  }
}
