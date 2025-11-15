import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMercadoPagoConfigDto, ValidateCredentialsDto } from './dto/mercadopago-config.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Obtiene la configuración de MercadoPago del tenant
   */
  @UseGuards(JwtAuthGuard)
  @Get('mercadopago/config')
  async getMercadoPagoConfig(@Headers('x-tenant-id') tenantId: string) {
    return await this.paymentService.getMercadoPagoConfig(tenantId);
  }

  /**
   * Actualiza la configuración de MercadoPago del tenant
   */
  @UseGuards(JwtAuthGuard)
  @Put('mercadopago/config')
  async updateMercadoPagoConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Body() updateConfigDto: UpdateMercadoPagoConfigDto,
  ) {
    return await this.paymentService.updateMercadoPagoConfig(tenantId, updateConfigDto);
  }

  /**
   * Valida las credenciales de MercadoPago
   */
  @UseGuards(JwtAuthGuard)
  @Post('mercadopago/validate')
  async validateCredentials(
    @Headers('x-tenant-id') tenantId: string,
    @Body() validateDto: ValidateCredentialsDto,
  ) {
    return await this.paymentService.validateMercadoPagoCredentials(tenantId, validateDto);
  }

  /**
   * Crea una preferencia de pago para una orden
   */
  @UseGuards(JwtAuthGuard)
  @Post('preference/:orderId')
  async createPreference(
    @Param('orderId') orderId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return await this.paymentService.createPaymentPreference(tenantId, orderId);
  }

  /**
   * Webhook para recibir notificaciones de MercadoPago
   * Este endpoint debe ser público (sin autenticación)
   */
  @Post('webhook/:tenantId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('tenantId') tenantId: string,
    @Headers('x-signature') signature: string,
    @Query('type') type: string,
    @Query('data.id') dataId: string,
    @Body() body: any,
  ) {
    // MercadoPago envía el tipo y el ID en query params
    await this.paymentService.processWebhookNotification(
      tenantId,
      type || body.type,
      dataId || body.data?.id,
      signature,
    );
    
    return { received: true };
  }

  /**
   * Obtiene el estado de pago de una orden
   */
  @UseGuards(JwtAuthGuard)
  @Get('status/:orderId')
  async getPaymentStatus(
    @Param('orderId') orderId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return await this.paymentService.getPaymentStatus(tenantId, orderId);
  }

  /**
   * Cancela un pago pendiente
   */
  @UseGuards(JwtAuthGuard)
  @Post('cancel/:orderId')
  async cancelPayment(
    @Param('orderId') orderId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    await this.paymentService.cancelPayment(tenantId, orderId);
    return { message: 'Payment cancelled successfully' };
  }

  /**
   * Procesa un reembolso total o parcial
   */
  @UseGuards(JwtAuthGuard)
  @Post('refund/:orderId')
  async refundPayment(
    @Param('orderId') orderId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body('amount') amount?: number,
  ) {
    return await this.paymentService.refundPayment(tenantId, orderId, amount);
  }
}