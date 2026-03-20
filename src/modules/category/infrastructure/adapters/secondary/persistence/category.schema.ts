import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { categoryTypeEnum } from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    type: categoryTypeEnum('type').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_categories_tenant_id').on(table.tenantId),
    index('idx_categories_type').on(table.type),
    uniqueIndex('uq_categories_tenant_type_name').on(table.tenantId, table.type, table.name),
  ],
);

export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;
