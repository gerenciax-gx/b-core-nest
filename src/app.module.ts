import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// ── Common ────────────────────────────────────────────────
import {
  appConfig,
  authConfig,
  databaseConfig,
  redisConfig,
  asaasConfig,
} from './common/config/index.js';
import { DatabaseModule } from './common/database/index.js';
import { LoggingModule } from './common/logging/index.js';
import { HealthController } from './common/health/health.controller.js';
import {
  JwtAuthGuard,
  ForcePasswordResetGuard,
  RolesGuard,
  TenantGuard,
} from './common/guards/index.js';
import {
  CorrelationIdMiddleware,
  ClientTypeMiddleware,
} from './common/middleware/index.js';

// ── Feature modules ───────────────────────────────────────
import { AuthModule } from './modules/auth/auth.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { ServiceModule } from './modules/service/service.module.js';
import { CollaboratorModule } from './modules/collaborator/collaborator.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { QueueModule } from './modules/queue/queue.module.js';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [`.env.${process.env['NODE_ENV'] ?? 'dev'}`, '.env'],
      load: [appConfig, authConfig, databaseConfig, redisConfig, asaasConfig],
    }),

    // ── Infrastructure ─────────────────────────────────────
    LoggingModule,
    DatabaseModule,

    // ── Rate limiting ──────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 5,
      },
      {
        name: 'medium',
        ttl: 10_000,
        limit: 30,
      },
      {
        name: 'long',
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // ── Events & Scheduling ────────────────────────────────
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    // ── Feature modules ────────────────────────────────────
    AuthModule,
    TenantModule,
    ProductModule,
    ServiceModule,
    CollaboratorModule,
    MarketplaceModule,
    BillingModule,
    NotificationModule,
    SettingsModule,
    DashboardModule,
    UploadModule,
    QueueModule,
  ],

  controllers: [HealthController],

  providers: [
    // Guard execution order: Throttler → JWT → ForcePasswordReset → Roles → Tenant
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ForcePasswordResetGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, ClientTypeMiddleware)
      .forRoutes('*path');
  }
}
