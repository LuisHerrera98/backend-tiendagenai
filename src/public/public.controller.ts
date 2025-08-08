import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('store/:subdomain')
  async getStoreBySubdomain(@Param('subdomain') subdomain: string) {
    const store = await this.publicService.getStoreBySubdomain(subdomain);
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }
    return store;
  }

  @Get('products/:subdomain')
  async getStoreProducts(
    @Param('subdomain') subdomain: string,
    @Query('featured') featured?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('gender') gender?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const store = await this.publicService.getStoreBySubdomain(subdomain);
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    return this.publicService.getStoreProducts(store.id, {
      featured: featured === 'true',
      category,
      brand,
      gender,
      limit: limit ? parseInt(limit) : 20,
      page: page ? parseInt(page) : 1,
    });
  }

  @Get('product/:subdomain/:productId')
  async getProductDetail(
    @Param('subdomain') subdomain: string,
    @Param('productId') productId: string,
  ) {
    const store = await this.publicService.getStoreBySubdomain(subdomain);
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    return this.publicService.getProductDetail(store.id, productId);
  }

  @Get('categories/:subdomain')
  async getStoreCategories(@Param('subdomain') subdomain: string) {
    const store = await this.publicService.getStoreBySubdomain(subdomain);
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    return this.publicService.getStoreCategories(store.id);
  }

  @Get('filters/:subdomain')
  async getStoreFilters(@Param('subdomain') subdomain: string) {
    const store = await this.publicService.getStoreBySubdomain(subdomain);
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    return this.publicService.getStoreFilters(store.id);
  }

  @Post('order/:subdomain')
  async createOrder(
    @Param('subdomain') subdomain: string,
    @Body() createOrderDto: CreateOrderDto
  ) {
    const store = await this.publicService.getStoreBySubdomain(subdomain);
    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    return this.publicService.createOrder(store.id, createOrderDto);
  }
}
