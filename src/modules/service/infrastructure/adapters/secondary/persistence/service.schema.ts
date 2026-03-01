import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { serviceStatusEnum } from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';
import { categories } from '../../../../../category/infrastructure/adapters/secondary/persistence/category.schema.js';

// ── Services ──────────────────────────────────────────────
export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    status: serviceStatusEnum('status').default('active').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_services_tenant_id').on(table.tenantId),
    index('idx_services_category_id').on(table.categoryId),
    index('idx_services_status').on(table.status),
  ],
);

// ── Service Price Variations ──────────────────────────────
export const servicePriceVariations = pgTable(
  'service_price_variations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    durationMinMinutes: integer('duration_min_minutes'),
    durationMaxMinutes: integer('duration_max_minutes'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_service_price_variations_service_id').on(table.serviceId),
  ],
);

// ── Service Photos ────────────────────────────────────────
export const servicePhotos = pgTable(
  'service_photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'cascade' })
      .notNull(),
    priceVariationId: uuid('price_variation_id').references(
      () => servicePriceVariations.id,
      { onDelete: 'cascade' },
    ),
    url: varchar('url', { length: 500 }).notNull(),
    isMain: boolean('is_main').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('idx_service_photos_service_id').on(table.serviceId)],
);

// ── Service Professionals (join table) ────────────────────
// collaborator_id will reference the collaborators table in Fase 3
export const serviceProfessionals = pgTable(
  'service_professionals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'cascade' })
      .notNull(),
    collaboratorId: uuid('collaborator_id'), // FK added in Fase 3
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_service_professionals_service_id').on(table.serviceId),
    index('idx_service_professionals_collaborator_id').on(
      table.collaboratorId,
    ),
  ],
);

// ── Type Exports ──────────────────────────────────────────
export type ServiceInsert = typeof services.$inferInsert;
export type ServiceSelect = typeof services.$inferSelect;
export type ServicePriceVariationInsert =
  typeof servicePriceVariations.$inferInsert;
export type ServicePriceVariationSelect =
  typeof servicePriceVariations.$inferSelect;
export type ServicePhotoInsert = typeof servicePhotos.$inferInsert;
export type ServicePhotoSelect = typeof servicePhotos.$inferSelect;
export type ServiceProfessionalInsert =
  typeof serviceProfessionals.$inferInsert;
export type ServiceProfessionalSelect =
  typeof serviceProfessionals.$inferSelect;
