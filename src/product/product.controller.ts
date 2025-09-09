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
  ForbiddenException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FileService } from 'src/file/file.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Permission } from '../user/entities/role.entity';
import { PermissionFilterUtil } from '../common/utils/permission-filter.util';

@Controller('product')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  @RequirePermissions(Permission.PRODUCTS_CREATE)
  @UseInterceptors(FilesInterceptor('images', 4))
  async create(
    @TenantId() tenantId: string,
    @Body() createProductDto: any,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    try {
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
      
      // Handle cashPrice when it comes from FormData
      if (createProductDto.cashPrice !== undefined && createProductDto.cashPrice !== null && createProductDto.cashPrice !== '') {
        createProductDto.cashPrice = Number(createProductDto.cashPrice);
      } else {
        delete createProductDto.cashPrice;
      }
    
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
  @RequirePermissions(Permission.PRODUCTS_EDIT)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    // Validar permisos específicos para campos sensibles
    if (updateProductDto.stock && !PermissionFilterUtil.hasPermission(user, Permission.PRODUCTS_STOCK)) {
      throw new ForbiddenException('No tienes permisos para editar el stock de productos');
    }

    if (updateProductDto.discount !== undefined && !PermissionFilterUtil.hasPermission(user, Permission.PRODUCTS_DISCOUNTS)) {
      throw new ForbiddenException('No tienes permisos para editar los descuentos de productos');
    }

    return this.productService.update(tenantId, id, updateProductDto);
  }

  @Get('by-size/:sizeId')
  @RequirePermissions(Permission.PRODUCTS_VIEW)
  async getAllBySizeId(
    @TenantId() tenantId: string,
    @Param('sizeId') sizeId: string,
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 8,
  ) {
    const result = await this.productService.findAllBySizeId(tenantId, sizeId, page, limit);
    
    // Filtrar datos sensibles según permisos
    if (result && result.data) {
      result.data = PermissionFilterUtil.filterProductList(result.data, user);
    }
    
    return result;
  }

  @Patch(':id/increment/:sizeId')
  @RequirePermissions(Permission.PRODUCTS_STOCK)
  async incrementQuantity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
  ) {
    return this.productService.incrementQuantity(tenantId, id, sizeId);
  }

  @Patch(':id/decrement/:sizeId')
  @RequirePermissions(Permission.PRODUCTS_STOCK)
  async decrementQuantity(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
  ) {
    return this.productService.decrementQuantity(tenantId, id, sizeId);
  }

  @Get('inversion')
  @RequirePermissions(Permission.PRODUCTS_COSTS)
  async getInversion(@TenantId() tenantId: string) {
    return this.productService.getInversion(tenantId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PRODUCTS_DELETE)
  async delete( @TenantId() tenantId: string, @Param('id') id: string, ) {
    return this.productService.delete(tenantId, id);
  }

  @Get('filters/:categoryId')
  @RequirePermissions(Permission.PRODUCTS_VIEW)
  async getFiltersByCategory(@TenantId() tenantId: string, @Param('categoryId') categoryId: string) {
    return this.productService.getFiltersByCategory(tenantId, categoryId);
  }

  @Get('filters/all/options')
  @RequirePermissions(Permission.PRODUCTS_VIEW)
  async getAllFilters(@TenantId() tenantId: string) {
    return this.productService.getFiltersByCategory(tenantId, '');
  }

  @Get('search/filtered')
  @RequirePermissions(Permission.PRODUCTS_VIEW)
  async getProductsWithFilters(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('categoryId') categoryId?: string,
    @Query('brandName') brandName?: string,
    @Query('modelName') modelName?: string,
    @Query('sizeName') sizeName?: string,
    @Query('name') name?: string,
    @Query('gender') gender?: string,
    @Query('colorId') colorId?: string,
    @Query('active') active?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 8,
    @Query('showAll') showAll: boolean = false,
  ) {
    // Convert active string to boolean if provided
    const activeFilter = active !== undefined ? active === 'true' : undefined;
    
    const result = await this.productService.getProductsWithFilters(
      tenantId,
      categoryId,
      brandName,
      modelName,
      sizeName,
      name,
      gender,
      colorId,
      activeFilter,
      page,
      limit,
      showAll
    );
    
    // Filtrar datos sensibles según permisos
    if (result && result.data) {
      result.data = PermissionFilterUtil.filterProductList(result.data, user);
    }
    
    return result;
  }

  @Get('sizes-for-category/:categoryId')
  @RequirePermissions(Permission.PRODUCTS_VIEW)
  async getSizesForCategory(@TenantId() tenantId: string, @Param('categoryId') categoryId: string) {
    return this.productService.getSizesForCategory(tenantId, categoryId);
  }

  @Delete('image/:productId')
  @RequirePermissions(Permission.PRODUCTS_EDIT)
  async deleteProductImage(
    @TenantId() tenantId: string,
    @Param('productId') productId: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.productService.deleteProductImage(tenantId, productId, imageUrl);
  }
}