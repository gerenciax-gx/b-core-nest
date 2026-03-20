import type { NotificationSummary } from '../input/notification.usecase.port.js';

/**
 * Port for pushing real-time notifications to connected clients.
 */
export interface NotificationPushPort {
  pushNotification(tenantId: string, notification: NotificationSummary): void;
  pushUnreadCount(tenantId: string, count: number): void;
  broadcastAll(notification: NotificationSummary): void;
}
