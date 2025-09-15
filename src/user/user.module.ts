import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { UserManagementService } from './user-management.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './entities/user.entity';
import { Tenant, TenantSchema } from '../tenant/entities/tenant.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserManagementService, PermissionsGuard],
  exports: [UserService, UserManagementService],
})
export class UserModule {}