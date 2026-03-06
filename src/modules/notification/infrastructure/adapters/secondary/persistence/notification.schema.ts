import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { notificationTypeEnum } from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    metadata: text('metadata'), // JSON string for extra data (invoiceId, etc.)
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_notifications_tenant').on(table.tenantId),
    index('idx_notifications_tenant_read').on(table.tenantId, table.isRead),
    index('idx_notifications_created').on(table.createdAt),
  ],
);

export type NotificationInsert = typeof notifications.$inferInsert;
export type NotificationSelect = typeof notifications.$inferSelect;
