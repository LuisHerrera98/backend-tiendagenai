import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { TypeService } from './type.service';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id/parse-mongo-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';

@Controller('type')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TypeController {
  constructor(private readonly typeService: TypeService) {}

  @Post()
  create(@Req() req, @Body() createTypeDto: CreateTypeDto) {
    const tenantId = req.user.tenantId;
    return this.typeService.create(tenantId, createTypeDto);
  }

  @Get()
  findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.typeService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id', ParseMongoIdPipe) id: string) {
    const tenantId = req.user.tenantId;
    return this.typeService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id', ParseMongoIdPipe) id: string, @Body() updateTypeDto: UpdateTypeDto) {
    const tenantId = req.user.tenantId;
    return this.typeService.update(tenantId, id, updateTypeDto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id', ParseMongoIdPipe) id: string) {
    const tenantId = req.user.tenantId;
    return this.typeService.remove(tenantId, id);
  }
}
