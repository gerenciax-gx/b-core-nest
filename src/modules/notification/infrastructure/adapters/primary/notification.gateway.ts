import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import type { TokenServicePort } from '../../../../auth/domain/ports/output/token-service.port.js';
import type { Server, Socket } from 'socket.io';
import type { NotificationSummary } from '../../../domain/ports/input/notification.usecase.port.js';
import type { NotificationPushPort } from '../../../domain/ports/output/notification-push.port.js';

interface AuthPayload {
  sub: string;
  tenantId: string;
  role: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env['CORS_ORIGINS']?.split(',').map((s) => s.trim()) ?? ['http://localhost:4200'],
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, NotificationPushPort
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    @Inject('TokenServicePort')
    private readonly tokenService: TokenServicePort,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`WS client ${client.id} rejected — no token`);
        client.disconnect();
        return;
      }

      const payload = this.tokenService.verify<AuthPayload>(token);

      // Attach user data
      client.data.userId = payload.sub;
      client.data.tenantId = payload.tenantId;
      client.data.role = payload.role;

      // Join tenant room for multi-tenant isolation
      await client.join(`tenant:${payload.tenantId}`);

      this.logger.log(
        `WS client ${client.id} connected — tenant ${payload.tenantId}`,
      );
    } catch {
      this.logger.warn(`WS client ${client.id} rejected — invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`WS client ${client.id} disconnected`);
  }

  /** Push a notification to all connected clients of a tenant */
  pushNotification(tenantId: string, notification: NotificationSummary): void {
    this.server
      .to(`tenant:${tenantId}`)
      .emit('notification:new', notification);
  }

  /** Push unread count update to a tenant */
  pushUnreadCount(tenantId: string, count: number): void {
    this.server
      .to(`tenant:${tenantId}`)
      .emit('notification:unread-count', { count });
  }

  /** Broadcast to ALL connected clients (system-wide) */
  broadcastAll(notification: NotificationSummary): void {
    const { tenantId, ...safePayload } = notification;
    this.server.emit('notification:new', safePayload);
  }
}
