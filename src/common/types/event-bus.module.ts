import { Global, Module } from '@nestjs/common';
import { NestEventBus } from './nest-event-bus.adapter.js';

@Global()
@Module({
  providers: [
    {
      provide: 'EventBusPort',
      useClass: NestEventBus,
    },
  ],
  exports: ['EventBusPort'],
})
export class EventBusModule {}
