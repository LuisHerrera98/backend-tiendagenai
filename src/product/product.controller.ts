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
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileService } from 'src/file/file.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ObjectId } from 'mongoose';

@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 4))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() images: Express.Multer.File[],
  ) {

    if (typeof createProductDto.stock === 'string') {
      createProductDto.stock = JSON.parse(createProductDto.stock);
    }

    createProductDto.stock = createProductDto.stock.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    }));

    // Primero crear el producto para obtener el código generado
    const product = await this.productService.create(createProductDto);
    
    // Si hay imágenes, subirlas con el código generado
    if (images && images.length > 0) {
      try {
        const imagesArray = await this.fileService.uploadImageToCloudinary(
          images,
          product.code,
        );
        
        // Actualizar el producto con las imágenes
        return this.productService.update(product._id.toString(), { images: imagesArray });
      } catch (error) {
        // Si falla la subida de imágenes, eliminar el producto creado
        await this.productService.delete(product._id.toString());
        throw new BadRequestException(`Error uploading images: ${error.message}`);
      }
    }

    return product;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {

    return this.productService.update(id, updateProductDto);
  }

  @Get('by-size/:sizeId')
  async getAllBySizeId(
    @Param('sizeId') sizeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 8,
  ) {
    return this.productService.findAllBySizeId(sizeId, page, limit);
  }

  @Patch(':id/increment/:sizeId')
  async incrementQuantity(
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
  ) {
    return this.productService.incrementQuantity(id, sizeId);
  }

  @Patch(':id/decrement/:sizeId')
  async decrementQuantity(
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
  ) {
    return this.productService.decrementQuantity(id, sizeId);
  }

  @Get('inversion')
  async getInversion() {
    return this.productService.getInversion();
  }

  @Delete(':id')
  async delete( @Param('id') id: string, ) {
    console.log(id);
    
    return this.productService.delete(id);
  }

  @Get('filters/:categoryId')
  async getFiltersByCategory(@Param('categoryId') categoryId: string) {
    return this.productService.getFiltersByCategory(categoryId);
  }

  @Get('filters/all/options')
  async getAllFilters() {
    return this.productService.getFiltersByCategory('');
  }

  @Get('search/filtered')
  async getProductsWithFilters(
    @Query('categoryId') categoryId?: string,
    @Query('brandName') brandName?: string,
    @Query('modelName') modelName?: string,
    @Query('sizeName') sizeName?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 8,
  ) {
    return this.productService.getProductsWithFilters(
      categoryId,
      brandName,
      modelName,
      sizeName,
      page,
      limit
    );
  }

  @Get('sizes-for-category/:categoryId')
  async getSizesForCategory(@Param('categoryId') categoryId: string) {
    return this.productService.getSizesForCategory(categoryId);
  }
}