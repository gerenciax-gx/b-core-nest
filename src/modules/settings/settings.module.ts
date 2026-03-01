import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TenantModule } from '../tenant/tenant.module.js';
import { UploadModule } from '../upload/upload.module.js';
import { SettingsService } from './application/services/settings.service.js';
import { SettingsController } from './infrastructure/adapters/primary/settings.controller.js';
import { DrizzleSessionRepository } from '../auth/infrastructure/adapters/secondary/persistence/drizzle-session.repository.js';
import { DrizzleUserSettingsRepository } from './infrastructure/adapters/secondary/persistence/drizzle-user-settings.repository.js';
import { DrizzleNotificationPreferencesRepository } from './infrastructure/adapters/secondary/persistence/drizzle-notification-preferences.repository.js';

@Module({
  imports: [AuthModule, TenantModule, UploadModule],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    {
      provide: 'SessionRepositoryPort',
      useClass: DrizzleSessionRepository,
    },
    {
      provide: 'UserSettingsRepositoryPort',
      useClass: DrizzleUserSettingsRepository,
    },
    {
      provide: 'NotificationPreferencesRepositoryPort',
      useClass: DrizzleNotificationPreferencesRepository,
    },
  ],
})
export class SettingsModule {}
