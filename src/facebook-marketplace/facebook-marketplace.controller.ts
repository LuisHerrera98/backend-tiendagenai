import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FacebookMarketplaceService } from './facebook-marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateFacebookCredentialsDto } from './dto/update-facebook-credentials.dto';
import { PublishProductDto, UnpublishProductDto } from './dto/publish-product.dto';

@Controller('facebook-marketplace')
@UseGuards(JwtAuthGuard)
export class FacebookMarketplaceController {
  constructor(
    private readonly facebookMarketplaceService: FacebookMarketplaceService,
  ) {}

  // Obtener configuración actual
  @Get('credentials')
  async getCredentials(@Request() req) {
    const tenantId = req.user.tenants[0];
    const credentials = await this.facebookMarketplaceService.getCredentials(tenantId);

    // No enviar el token encriptado al frontend por seguridad
    return {
      businessId: credentials.businessId || '',
      catalogId: credentials.catalogId || '',
      hasAccessToken: !!credentials.accessToken,
      isEnabled: credentials.isEnabled,
      autoPublish: credentials.autoPublish,
      totalPublished: credentials.totalPublished,
      lastSyncAt: credentials.lastSyncAt,
    };
  }

  // Actualizar credenciales
  @Put('credentials')
  async updateCredentials(
    @Request() req,
    @Body() updateDto: UpdateFacebookCredentialsDto,
  ) {
    const tenantId = req.user.tenants[0];
    await this.facebookMarketplaceService.updateCredentials(tenantId, updateDto);

    return {
      success: true,
      message: 'Credenciales actualizadas correctamente',
    };
  }

  // Probar conexión con Facebook
  @Post('test-connection')
  async testConnection(@Request() req) {
    const tenantId = req.user.tenants[0];
    return this.facebookMarketplaceService.testConnection(tenantId);
  }

  // Publicar productos seleccionados
  @Post('publish')
  async publishProducts(@Request() req, @Body() publishDto: PublishProductDto) {
    const tenantId = req.user.tenants[0];
    return this.facebookMarketplaceService.publishProducts(tenantId, publishDto);
  }

  // Despublicar productos
  @Post('unpublish')
  async unpublishProducts(@Request() req, @Body() unpublishDto: UnpublishProductDto) {
    const tenantId = req.user.tenants[0];
    return this.facebookMarketplaceService.unpublishProducts(tenantId, unpublishDto);
  }

  // Sincronizar todos los productos activos
  @Post('sync-all')
  async syncAllProducts(@Request() req) {
    const tenantId = req.user.tenants[0];
    return this.facebookMarketplaceService.syncAllProducts(tenantId);
  }

  // Obtener estadísticas
  @Get('stats')
  async getStats(@Request() req) {
    const tenantId = req.user.tenants[0];
    return this.facebookMarketplaceService.getStats(tenantId);
  }

  // Obtener productos publicados vs no publicados
  @Get('published-status')
  async getPublishedStatus(@Request() req) {
    const tenantId = req.user.tenants[0];
    return this.facebookMarketplaceService.getPublishedStatus(tenantId);
  }
}
