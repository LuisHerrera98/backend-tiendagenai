import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileService } from 'src/file/file.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('product')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 4))
  async create(
    @TenantId() tenantId: string,
    @Body() createProductDto: any,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    try {
      console.log('Creating product with tenantId:', tenantId);
      console.log('Product data received:', createProductDto);
      
      if (!tenantId) {
        throw new BadRequestException('TenantId is required');
      }
      // Parse stock if it comes as string from FormData
      if (typeof createProductDto.stock === 'string') {
        createProductDto.stock = JSON.parse(createProductDto.stock);
      }

      // Convert stock quantities to numbers
      createProductDto.stock = createProductDto.stock.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
      }));

      // Convert FormData strings to proper types
      createProductDto.cost = Number(createProductDto.cost);
      createProductDto.price = Number(createProductDto.price);
      createProductDto.discount = Number(createProductDto.discount);
      createProductDto.active = createProductDto.active === 'true';

    // Primero crear el producto para obtener el código generado
    const product = await this.productService.create(tenantId, createProductDto);
    
    // Si hay imágenes, subirlas con el código generado
    if (images && images.length > 0) {
      try {
        const imagesArray = await this.fileService.uploadImageToCloudinary(
          images,
          product.code,
        );
        
        // Actualizar el producto con las imágenes
        return this.productService.update(tenantId, product._id.toString(), { images: imagesArray });
      } catch (error) {
        // Si falla la subida de imágenes, eliminar el producto creado
        await this.productService.delete(tenantId, product._id.toString());
        throw new BadRequestException(`Error uploading images: ${error.message}`);
      }
    }

    return product;
    } catch (error) {
      console.error('Error in product creation:', error);
      throw error;
    }
  }

  @Patch(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {

    return this.productService.update(tenantId, id, updateProductDto);
  }

  @Get('by-size/:sizeId')
  async getAllBySizeId(
    @TenantId() tenantId: string,
    @Param('sizeId') sizeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 8,
  ) {
    return this.productService.findAllBySizeId(tenantId, sizeId, page, limit);
  }

  @Patch(':id/increment/:sizeId')
  async incrementQuantity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
  ) {
    return this.productService.incrementQuantity(tenantId, id, sizeId);
  }

  @Patch(':id/decrement/:sizeId')
  async decrementQuantity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
  ) {
    return this.productService.decrementQuantity(tenantId, id, sizeId);
  }

  @Get('inversion')
  async getInversion(@TenantId() tenantId: string) {
    return this.productService.getInversion(tenantId);
  }

  @Delete(':id')
  async delete( @TenantId() tenantId: string, @Param('id') id: string, ) {
    return this.productService.delete(tenantId, id);
  }

  @Get('filters/:categoryId')
  async getFiltersByCategory(@TenantId() tenantId: string, @Param('categoryId') categoryId: string) {
    return this.productService.getFiltersByCategory(tenantId, categoryId);
  }

  @Get('filters/all/options')
  async getAllFilters(@TenantId() tenantId: string) {
    return this.productService.getFiltersByCategory(tenantId, '');
  }

  @Get('search/filtered')
  async getProductsWithFilters(
    @TenantId() tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandName') brandName?: string,
    @Query('modelName') modelName?: string,
    @Query('sizeName') sizeName?: string,
    @Query('name') name?: string,
    @Query('gender') gender?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 8,
    @Query('showAll') showAll: boolean = false,
  ) {
    return this.productService.getProductsWithFilters(
      tenantId,
      categoryId,
      brandName,
      modelName,
      sizeName,
      name,
      gender,
      page,
      limit,
      showAll
    );
  }

  @Get('sizes-for-category/:categoryId')
  async getSizesForCategory(@TenantId() tenantId: string, @Param('categoryId') categoryId: string) {
    return this.productService.getSizesForCategory(tenantId, categoryId);
  }
}