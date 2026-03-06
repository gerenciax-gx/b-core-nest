import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { NotificationRepositoryPort } from '../../../../domain/ports/output/notification.repository.port.js';
import { Notification } from '../../../../domain/entities/notification.entity.js';
import type { NotificationType } from '../../../../domain/entities/notification.entity.js';
import type { PaginationQuery } from '../../../../../../common/types/api-response.type.js';
import { notifications } from './notification.schema.js';

@Injectable()
export class DrizzleNotificationRepository implements NotificationRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: NodePgDatabase,
  ) {}

  async save(notification: Notification): Promise<Notification> {
    const [row] = await this.db
      .insert(notifications)
      .values({
        id: notification.id,
        tenantId: notification.tenantId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
      })
      .returning();

    return this.toDomain(row!);
  }

  async findById(id: string, tenantId: string): Promise<Notification | null> {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)));

    return row ? this.toDomain(row) : null;
  }

  async findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { type?: string; isRead?: boolean },
  ): Promise<[Notification[], number]> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(notifications.tenantId, tenantId)];

    if (filters?.type) {
      conditions.push(eq(notifications.type, filters.type as NotificationType));
    }
    if (filters?.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, filters.isRead));
    }

    const whereClause = and(...conditions);

    const [data, [countResult]] = await Promise.all([
      this.db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(notifications)
        .where(whereClause),
    ]);

    return [data.map((row) => this.toDomain(row)), countResult?.total ?? 0];
  }

  async markAsRead(id: string, tenantId: string): Promise<Notification | null> {
    const [row] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)))
      .returning();

    return row ? this.toDomain(row) : null;
  }

  async markAllAsRead(tenantId: string): Promise<number> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.tenantId, tenantId), eq(notifications.isRead, false)),
      );

    return result.rowCount ?? 0;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)));
  }

  async deleteAllByTenant(tenantId: string): Promise<number> {
    const result = await this.db
      .delete(notifications)
      .where(eq(notifications.tenantId, tenantId));

    return result.rowCount ?? 0;
  }

  async countUnread(tenantId: string): Promise<number> {
    const [result] = await this.db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(eq(notifications.tenantId, tenantId), eq(notifications.isRead, false)),
      );

    return result?.total ?? 0;
  }

  async saveBatch(items: Notification[]): Promise<number> {
    if (items.length === 0) return 0;

    const values = items.map((n) => ({
      id: n.id,
      tenantId: n.tenantId,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      metadata: n.metadata ? JSON.stringify(n.metadata) : null,
    }));

    await this.db.insert(notifications).values(values);
    return items.length;
  }

  async findAllActiveTenantIds(): Promise<string[]> {
    const { tenants } = await import('../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js');
    const rows = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.status, 'active'));
    return rows.map((r) => r.id);
  }

  private toDomain(row: typeof notifications.$inferSelect): Notification {
    let metadata: Record<string, unknown> | null = null;
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata) as Record<string, unknown>;
      } catch {
        metadata = null;
      }
    }

    return Notification.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      isRead: row.isRead,
      metadata,
      createdAt: row.createdAt,
    });
  }
}
