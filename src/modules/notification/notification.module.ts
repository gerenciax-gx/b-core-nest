import { Module } from '@nestjs/common';
import { NotificationController } from './infrastructure/adapters/primary/notification.controller.js';
import { NotificationService } from './application/services/notification.service.js';
import { DrizzleNotificationRepository } from './infrastructure/adapters/secondary/persistence/drizzle-notification.repository.js';
import { NotificationEventHandlers } from './application/listeners/notification-event.handlers.js';

@Module({
  imports: [],
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
    // Future: { provide: 'EmailSenderPort', useClass: ResendEmailAdapter },
    // Future: { provide: 'PushNotificationPort', useClass: FcmPushAdapter },
  ],
  exports: ['NotificationUseCasePort', 'NotificationRepositoryPort'],
})
export class NotificationModule {}
