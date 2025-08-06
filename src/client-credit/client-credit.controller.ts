import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ClientCreditService } from './client-credit.service';
import { CreateClientCreditDto } from './dto/create-client-credit.dto';

@Controller('client-credit')
export class ClientCreditController {
  constructor(private readonly clientCreditService: ClientCreditService) {}

  @Post()
  create(@Body() createClientCreditDto: CreateClientCreditDto) {
    return this.clientCreditService.create(createClientCreditDto);
  }

  @Get()
  findAll() {
    return this.clientCreditService.findAll();
  }

  @Get('active/:documentNumber')
  getActiveCredits(@Param('documentNumber') documentNumber: string) {
    return this.clientCreditService.getActiveCredits(documentNumber);
  }

  @Get('total/:documentNumber')
  getTotalActiveCredits(@Param('documentNumber') documentNumber: string) {
    return this.clientCreditService.getTotalActiveCredits(documentNumber);
  }

  @Get('history/:documentNumber')
  getClientHistory(@Param('documentNumber') documentNumber: string) {
    return this.clientCreditService.getClientCreditsHistory(documentNumber);
  }

  @Post('use')
  useCredits(@Body() body: { documentNumber: string; amount: number; saleId: string }) {
    return this.clientCreditService.useCredits(body.documentNumber, body.amount, body.saleId);
  }
}