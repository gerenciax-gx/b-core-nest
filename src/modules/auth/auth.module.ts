import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TenantModule } from '../tenant/tenant.module.js';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy.js';
import { AuthService } from './application/services/auth.service.js';
import { AuthController } from './infrastructure/adapters/primary/auth.controller.js';
import { DrizzleUserRepository } from './infrastructure/adapters/secondary/persistence/drizzle-user.repository.js';
import { DrizzleSessionRepository } from './infrastructure/adapters/secondary/persistence/drizzle-session.repository.js';

@Module({
  imports: [
    TenantModule,
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
    AuthService,
    {
      provide: 'UserRepositoryPort',
      useClass: DrizzleUserRepository,
    },
    {
      provide: 'SessionRepositoryPort',
      useClass: DrizzleSessionRepository,
    },
  ],
  exports: [AuthService, 'UserRepositoryPort'],
})
export class AuthModule {}
