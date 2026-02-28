import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import {
  tenantStatusEnum,
  companyTypeEnum,
} from '../../../../../../common/database/enums.js';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyType: companyTypeEnum('company_type').notNull(),
  document: varchar('document', { length: 18 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  status: tenantStatusEnum('status').default('active').notNull(),
  logoUrl: varchar('logo_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TenantInsert = typeof tenants.$inferInsert;
export type TenantSelect = typeof tenants.$inferSelect;
