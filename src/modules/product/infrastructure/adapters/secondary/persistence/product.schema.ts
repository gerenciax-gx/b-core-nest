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
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import {
  productStatusEnum,
  customFieldTypeEnum,
} from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';
import { categories } from '../../../../../category/infrastructure/adapters/secondary/persistence/category.schema.js';

// ── Products ──────────────────────────────────────────────
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 50 }).notNull(),
    description: text('description'),
    basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
    costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
    stock: integer('stock').default(0).notNull(),
    minStock: integer('min_stock').default(0).notNull(),
    maxStock: integer('max_stock'),
    stockAlert: boolean('stock_alert').default(false).notNull(),
    trackInventory: boolean('track_inventory').default(true).notNull(),
    barcode: varchar('barcode', { length: 50 }),
    weight: numeric('weight', { precision: 8, scale: 3 }),
    dimensions: jsonb('dimensions'), // { length, width, height }
    tags: jsonb('tags'), // string[]
    imageUrl: varchar('image_url', { length: 500 }),
    status: productStatusEnum('status').default('active').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_products_tenant_id').on(table.tenantId),
    index('idx_products_category_id').on(table.categoryId),
    index('idx_products_sku').on(table.sku),
    index('idx_products_status').on(table.status),
    uniqueIndex('uq_products_tenant_sku').on(table.tenantId, table.sku),
  ],
);

// ── Product Variations ────────────────────────────────────
export const productVariations = pgTable(
  'product_variations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 50 }),
    attributes: jsonb('attributes').notNull(), // [{ type: 'size', value: '250ml' }]
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').default(0).notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_product_variations_product_id').on(table.productId),
    uniqueIndex('uq_product_variations_product_sku').on(table.productId, table.sku),
  ],
);

// ── Product Photos ────────────────────────────────────────
export const productPhotos = pgTable(
  'product_photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    variationId: uuid('variation_id').references(() => productVariations.id, {
      onDelete: 'cascade',
    }),
    url: varchar('url', { length: 500 }).notNull(),
    isMain: boolean('is_main').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('idx_product_photos_product_id').on(table.productId)],
);

// ── Product Custom Fields ─────────────────────────────────
export const productCustomFields = pgTable(
  'product_custom_fields',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    variationId: uuid('variation_id').references(() => productVariations.id, {
      onDelete: 'cascade',
    }),
    key: varchar('key', { length: 100 }).notNull(),
    value: varchar('value', { length: 500 }).notNull(),
    type: customFieldTypeEnum('type').default('text').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_product_custom_fields_product_id').on(table.productId),
  ],
);

// ── Type Exports ──────────────────────────────────────────
export type ProductInsert = typeof products.$inferInsert;
export type ProductSelect = typeof products.$inferSelect;
export type ProductVariationInsert = typeof productVariations.$inferInsert;
export type ProductVariationSelect = typeof productVariations.$inferSelect;
export type ProductPhotoInsert = typeof productPhotos.$inferInsert;
export type ProductPhotoSelect = typeof productPhotos.$inferSelect;
export type ProductCustomFieldInsert = typeof productCustomFields.$inferInsert;
export type ProductCustomFieldSelect = typeof productCustomFields.$inferSelect;
