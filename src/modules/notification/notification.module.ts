import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationController } from './infrastructure/adapters/primary/notification.controller.js';
import { NotificationGateway } from './infrastructure/adapters/primary/notification.gateway.js';
import { NotificationService } from './application/services/notification.service.js';
import { DrizzleNotificationRepository } from './infrastructure/adapters/secondary/persistence/drizzle-notification.repository.js';
import { NotificationEventHandlers } from './application/listeners/notification-event.handlers.js';
import { ResendEmailAdapter } from './infrastructure/adapters/secondary/email/resend-email.adapter.js';

@Module({
  imports: [
    forwardRef(() => AuthModule),
  ],
  controllers: [NotificationController],
  providers: [
    {
      provide: 'NotificationUseCasePort',
      useClass: NotificationService,
    },
    {
      provide: 'NotificationRepositoryPort',
      useClass: DrizzleNotificationRepository,
    },
    NotificationEventHandlers,
    NotificationGateway,
    {
      provide: 'NotificationPushPort',
      useExisting: NotificationGateway,
    },
    {
      provide: 'EmailSenderPort',
      useClass: ResendEmailAdapter,
    },
    {
      provide: 'FRONTEND_URL',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('email.frontendUrl') ?? 'http://localhost:8100',
    },
  ],
  exports: ['NotificationUseCasePort', 'NotificationRepositoryPort', 'EmailSenderPort'],
})
export class NotificationModule {}
