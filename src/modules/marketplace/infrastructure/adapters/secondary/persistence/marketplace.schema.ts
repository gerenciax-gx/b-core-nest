import {
  pgTable,
  uuid,
  varchar,
  boolean,
  numeric,
  integer,
  timestamp,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import {
  toolTypeEnum,
  planIntervalEnum,
  subscriptionStatusEnum,
} from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';

// ── Tools ──────────────────────────────────────────────────
export const tools = pgTable(
  'tools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    type: toolTypeEnum('type').default('addon').notNull(),
    iconUrl: varchar('icon_url', { length: 500 }),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_tools_slug').on(table.slug),
    index('idx_tools_type').on(table.type),
  ],
);

// ── Tool Plans ─────────────────────────────────────────────
export const toolPlans = pgTable(
  'tool_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    toolId: uuid('tool_id')
      .references(() => tools.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    interval: planIntervalEnum('interval').default('monthly').notNull(),
    trialDays: integer('trial_days').default(0).notNull(),
    isPopular: boolean('is_popular').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    maxUsers: integer('max_users'),
    maxItems: integer('max_items'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('idx_tool_plans_tool_id').on(table.toolId)],
);

// ── Plan Features ──────────────────────────────────────────
export const planFeatures = pgTable(
  'plan_features',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    planId: uuid('plan_id')
      .references(() => toolPlans.id, { onDelete: 'cascade' })
      .notNull(),
    featureKey: varchar('feature_key', { length: 100 }).notNull(),
    featureValue: varchar('feature_value', { length: 255 }).notNull(),
    isHighlighted: boolean('is_highlighted').default(false).notNull(),
    order: integer('order').default(0).notNull(),
  },
  (table) => [index('idx_plan_features_plan_id').on(table.planId)],
);

// ── Tenant Tool Subscriptions ──────────────────────────────
export const tenantToolSubscriptions = pgTable(
  'tenant_tool_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => toolPlans.id)
      .notNull(),
    status: subscriptionStatusEnum('status').default('active').notNull(),
    startDate: timestamp('start_date', { withTimezone: true })
      .defaultNow()
      .notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_tenant_tool_subs_tenant_id').on(table.tenantId),
    index('idx_tenant_tool_subs_plan_id').on(table.planId),
  ],
);

// ── Type exports ───────────────────────────────────────────
export type ToolInsert = typeof tools.$inferInsert;
export type ToolSelect = typeof tools.$inferSelect;
export type ToolPlanInsert = typeof toolPlans.$inferInsert;
export type ToolPlanSelect = typeof toolPlans.$inferSelect;
export type PlanFeatureInsert = typeof planFeatures.$inferInsert;
export type PlanFeatureSelect = typeof planFeatures.$inferSelect;
export type TenantToolSubscriptionInsert =
  typeof tenantToolSubscriptions.$inferInsert;
export type TenantToolSubscriptionSelect =
  typeof tenantToolSubscriptions.$inferSelect;
