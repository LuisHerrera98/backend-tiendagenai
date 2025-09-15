import { Controller, Post, Body, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthTenantService } from './auth-tenant.service';
import { CreateTenantDto } from '../tenant/dto/create-tenant.dto';
import { 
  LoginTenantDto, 
  SetupPasswordDto, 
  RequestPasswordResetDto, 
  ResetPasswordWithCodeDto 
} from './dto/login-tenant.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTenantService: AuthTenantService
  ) {}

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

  @Post('verify-reset-code')
  async verifyResetCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetCode(body.email, body.code);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
  }

  @Get('check-subdomain/:subdomain')
  async checkSubdomain(@Param('subdomain') subdomain: string) {
    return this.authService.checkSubdomainAvailability(subdomain);
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body() createTenantDto: CreateTenantDto) {
    return this.authService.sendVerificationCode(createTenantDto);
  }

  // Nuevos endpoints para login con tenant
  @Post('tenant/login')
  async tenantLogin(@Body() loginDto: LoginTenantDto) {
    return this.authTenantService.loginWithTenantEmail(loginDto);
  }

  @Post('tenant/setup-password')
  async setupPassword(@Body() setupDto: SetupPasswordDto) {
    return this.authTenantService.setupPassword(setupDto);
  }

  @Post('tenant/request-reset')
  async requestTenantPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    return this.authTenantService.requestPasswordReset(requestDto);
  }

  @Post('tenant/reset-password')
  async resetTenantPassword(@Body() resetDto: ResetPasswordWithCodeDto) {
    return this.authTenantService.resetPasswordWithCode(resetDto);
  }

  @Get('tenant/check-email')
  async checkEmailStatus(@Query('email') email: string) {
    return this.authTenantService.checkEmailStatus(email);
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