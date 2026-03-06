import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';
import type { ListNotificationsQueryDto } from '../../../application/dto/list-notifications-query.dto.js';

export interface NotificationSummary {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationUseCasePort {
  findAll(
    tenantId: string,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedResponse<NotificationSummary>>;

  findById(tenantId: string, id: string): Promise<NotificationSummary>;

  markAsRead(tenantId: string, id: string): Promise<NotificationSummary>;

  markAllAsRead(tenantId: string): Promise<{ updated: number }>;

  remove(tenantId: string, id: string): Promise<void>;

  removeAll(tenantId: string): Promise<{ deleted: number }>;

  getUnreadCount(tenantId: string): Promise<{ count: number }>;

  broadcast(dto: {
    title: string;
    message: string;
    type?: 'system_maintenance' | 'tool_new';
  }): Promise<{ sent: number }>;
}
