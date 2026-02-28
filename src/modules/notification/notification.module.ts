import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [
    // Port → Adapter bindings go here
    // { provide: 'EmailSenderPort', useClass: ResendEmailAdapter },
    // { provide: 'PushNotificationPort', useClass: FcmPushAdapter },
  ],
  exports: [],
})
export class NotificationModule {}
