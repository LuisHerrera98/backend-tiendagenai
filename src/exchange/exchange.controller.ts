import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { CreateMassiveExchangeDto } from './dto/create-massive-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';

@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  create(@Body() createExchangeDto: CreateExchangeDto) {
    return this.exchangeService.create(createExchangeDto);
  }

  @Post('massive')
  createMassive(@Body() createMassiveExchangeDto: CreateMassiveExchangeDto) {
    return this.exchangeService.createMassiveExchange(createMassiveExchangeDto);
  }

  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.exchangeService.findAll(startDate, endDate);
  }

  @Get('stats')
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.exchangeService.getExchangeStats(startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exchangeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExchangeDto: UpdateExchangeDto) {
    return this.exchangeService.update(id, updateExchangeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exchangeService.remove(id);
  }
}