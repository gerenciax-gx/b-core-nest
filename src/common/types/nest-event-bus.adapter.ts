import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EventBusPort } from './event-bus.port.js';

@Injectable()
export class NestEventBus implements EventBusPort {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit(event: string, payload: Record<string, unknown>): void {
    this.eventEmitter.emit(event, payload);
  }
}
