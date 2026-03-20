import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TenantModule } from '../tenant/tenant.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy.js';
import { JwtTokenService } from './infrastructure/adapters/secondary/jwt-token.service.js';
import { AuthService } from './application/services/auth.service.js';
import { AuthController } from './infrastructure/adapters/primary/auth.controller.js';
import { DrizzleUserRepository } from './infrastructure/adapters/secondary/persistence/drizzle-user.repository.js';
import { DrizzleSessionRepository } from './infrastructure/adapters/secondary/persistence/drizzle-session.repository.js';
import { DrizzlePasswordResetTokenRepository } from './infrastructure/adapters/secondary/persistence/drizzle-password-reset-token.repository.js';

@Module({
  imports: [
    TenantModule,
    forwardRef(() => NotificationModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: 900, // 15 minutes in seconds
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: 'TokenServicePort',
      useClass: JwtTokenService,
    },
    {
      provide: 'FRONTEND_URL',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('email.frontendUrl') ?? 'http://localhost:8100',
    },
    {
      provide: 'AuthUseCasePort',
      useClass: AuthService,
    },
    {
      provide: 'UserRepositoryPort',
      useClass: DrizzleUserRepository,
    },
    {
      provide: 'SessionRepositoryPort',
      useClass: DrizzleSessionRepository,
    },
    {
      provide: 'PasswordResetTokenRepositoryPort',
      useClass: DrizzlePasswordResetTokenRepository,
    },
  ],
  exports: ['AuthUseCasePort', 'UserRepositoryPort', 'TokenServicePort'],
})
export class AuthModule {}
