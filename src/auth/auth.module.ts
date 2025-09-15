import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthTenantService } from './auth-tenant.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { Tenant, TenantSchema } from '../tenant/entities/tenant.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailService } from './email.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthTenantService, LocalStrategy, JwtStrategy, EmailService],
  exports: [AuthService, AuthTenantService, JwtModule, EmailService],
})
export class AuthModule {}