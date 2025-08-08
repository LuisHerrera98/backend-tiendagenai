import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { GenderService } from './gender.service';
import { CreateGenderDto } from './dto/create-gender.dto';
import { UpdateGenderDto } from './dto/update-gender.dto';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id/parse-mongo-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';

@Controller('gender')
@UseGuards(JwtAuthGuard, TenantGuard)
export class GenderController {
  constructor(private readonly genderService: GenderService) {}

  @Post()
  create(@Req() req, @Body() createGenderDto: CreateGenderDto) {
    const tenantId = req.user.tenantId;
    return this.genderService.create(tenantId, createGenderDto);
  }

  @Get()
  findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.genderService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id', ParseMongoIdPipe) id: string) {
    const tenantId = req.user.tenantId;
    return this.genderService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id', ParseMongoIdPipe) id: string, @Body() updateGenderDto: UpdateGenderDto) {
    const tenantId = req.user.tenantId;
    return this.genderService.update(tenantId, id, updateGenderDto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id', ParseMongoIdPipe) id: string) {
    const tenantId = req.user.tenantId;
    return this.genderService.remove(tenantId, id);
  }
}
