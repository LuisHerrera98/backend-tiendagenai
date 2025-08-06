import { Controller, Post, Body, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateTenantDto } from '../tenant/dto/create-tenant.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createTenantDto: CreateTenantDto) {
    return this.authService.registerTenant(createTenantDto);
  }

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: { email: string; tenantId?: string }) {
    return this.authService.requestPasswordReset(body.email, body.tenantId);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('check-subdomain/:subdomain')
  async checkSubdomain(@Param('subdomain') subdomain: string) {
    return this.authService.checkSubdomainAvailability(subdomain);
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body() createTenantDto: CreateTenantDto) {
    return this.authService.sendVerificationCode(createTenantDto);
  }

  @Post('verify-code-and-create-tenant')
  async verifyCodeAndCreateTenant(@Body() body: { 
    email: string; 
    subdomain: string; 
    code: string; 
  }) {
    return this.authService.verifyCodeAndCreateTenant(body.email, body.subdomain, body.code);
  }
}