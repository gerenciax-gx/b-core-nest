import type { Notification } from '../../entities/notification.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';

export interface NotificationRepositoryPort {
  save(notification: Notification): Promise<Notification>;

  findById(id: string, tenantId: string): Promise<Notification | null>;

  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { type?: string; isRead?: boolean },
  ): Promise<[Notification[], number]>;

  markAsRead(id: string, tenantId: string): Promise<Notification | null>;

  markAllAsRead(tenantId: string): Promise<number>;

  delete(id: string, tenantId: string): Promise<void>;

  deleteAllByTenant(tenantId: string): Promise<number>;

  countUnread(tenantId: string): Promise<number>;

  saveBatch(notifications: Notification[]): Promise<number>;

  findAllActiveTenantIds(): Promise<string[]>;
}
