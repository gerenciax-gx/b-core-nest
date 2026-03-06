import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { NotificationUseCasePort, NotificationSummary } from '../../domain/ports/input/notification.usecase.port.js';
import type { NotificationRepositoryPort } from '../../domain/ports/output/notification.repository.port.js';
import type { ListNotificationsQueryDto } from '../dto/list-notifications-query.dto.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';
import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';
import type { Notification } from '../../domain/entities/notification.entity.js';

@Injectable()
export class NotificationService implements NotificationUseCasePort {
  constructor(
    @Inject('NotificationRepositoryPort')
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  async findAll(
    tenantId: string,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedResponse<NotificationSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filters: { type?: string; isRead?: boolean } = {};
    if (query.type) filters.type = query.type;
    if (query.isRead !== undefined) filters.isRead = query.isRead === 'true';

    const [notifications, total] = await this.notificationRepo.findAllByTenant(
      tenantId,
      { page, limit, sortOrder: query.sortOrder },
      filters,
    );

    return createPaginatedResponse(
      notifications.map((n) => this.toResponse(n)),
      total,
      page,
      limit,
    );
  }

  async findById(tenantId: string, id: string): Promise<NotificationSummary> {
    const notification = await this.notificationRepo.findById(id, tenantId);
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }
    return this.toResponse(notification);
  }

  async markAsRead(tenantId: string, id: string): Promise<NotificationSummary> {
    const notification = await this.notificationRepo.markAsRead(id, tenantId);
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }
    return this.toResponse(notification);
  }

  async markAllAsRead(tenantId: string): Promise<{ updated: number }> {
    const updated = await this.notificationRepo.markAllAsRead(tenantId);
    return { updated };
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const notification = await this.notificationRepo.findById(id, tenantId);
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }
    await this.notificationRepo.delete(id, tenantId);
  }

  async removeAll(tenantId: string): Promise<{ deleted: number }> {
    const deleted = await this.notificationRepo.deleteAllByTenant(tenantId);
    return { deleted };
  }

  async getUnreadCount(tenantId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.countUnread(tenantId);
    return { count };
  }

  async broadcast(dto: {
    title: string;
    message: string;
    type?: 'system_maintenance' | 'tool_new';
  }): Promise<{ sent: number }> {
    const tenantIds = await this.notificationRepo.findAllActiveTenantIds();
    if (tenantIds.length === 0) return { sent: 0 };

    const { Notification: NotificationEntity } = await import('../../domain/entities/notification.entity.js');
    const notificationsToSave = tenantIds.map((tenantId) =>
      NotificationEntity.create({
        tenantId,
        type: dto.type ?? 'system_maintenance',
        title: dto.title,
        message: dto.message,
      }),
    );

    const sent = await this.notificationRepo.saveBatch(notificationsToSave);
    return { sent };
  }

  private toResponse(notification: Notification): NotificationSummary {
    return {
      id: notification.id,
      tenantId: notification.tenantId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    };
  }
}
