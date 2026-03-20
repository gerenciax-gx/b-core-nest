import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  text,
  date,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  subscriptionStatusEnum,
  invoiceStatusEnum,
  paymentMethodEnum,
} from '../../../../../../common/database/enums.js';
import { tenants } from '../../../../../tenant/infrastructure/adapters/secondary/persistence/tenant.schema.js';
import { toolPlans } from '../../../../../marketplace/infrastructure/adapters/secondary/persistence/marketplace.schema.js';

// ── Subscriptions ──────────────────────────────────────────
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => toolPlans.id)
      .notNull(),
    status: subscriptionStatusEnum('status').default('active').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    nextBillingDate: date('next_billing_date').notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: varchar('cancel_reason', { length: 500 }),
    cardToken: varchar('card_token', { length: 255 }),
    cardLast4: varchar('card_last4', { length: 4 }),
    cardBrand: varchar('card_brand', { length: 50 }),
    preferredPaymentMethod: paymentMethodEnum('preferred_payment_method'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_subscriptions_tenant_id').on(table.tenantId),
    index('idx_subscriptions_status').on(table.status),
    index('idx_subscriptions_next_billing').on(table.nextBillingDate),
  ],
);

// ── Invoices ───────────────────────────────────────────────
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    subscriptionId: uuid('subscription_id').references(
      () => subscriptions.id,
    ),
    status: invoiceStatusEnum('status').default('pending').notNull(),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
    dueDate: date('due_date').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    externalId: varchar('external_id', { length: 255 }),
    externalUrl: varchar('external_url', { length: 500 }),
    pixQrCode: text('pix_qr_code'),
    pixCopyPaste: text('pix_copy_paste'),
    boletoUrl: varchar('boleto_url', { length: 500 }),
    boletoBarcode: varchar('boleto_barcode', { length: 100 }),
    retryCount: integer('retry_count').default(0).notNull(),
    lastRetryAt: timestamp('last_retry_at', { withTimezone: true }),
    referenceMonth: varchar('reference_month', { length: 7 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_invoices_tenant_id').on(table.tenantId),
    index('idx_invoices_subscription_id').on(table.subscriptionId),
    index('idx_invoices_status').on(table.status),
    index('idx_invoices_due_date').on(table.dueDate),
    index('idx_invoices_external_id').on(table.externalId),
    uniqueIndex('idx_invoices_tenant_ref_month').on(
      table.tenantId,
      table.referenceMonth,
    ),
  ],
);

// ── Invoice Items ──────────────────────────────────────────
export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id')
      .references(() => invoices.id, { onDelete: 'cascade' })
      .notNull(),
    description: varchar('description', { length: 500 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index('idx_invoice_items_invoice_id').on(table.invoiceId),
  ],
);

// ── Payment Logs ───────────────────────────────────────────
export const paymentLogs = pgTable(
  'payment_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id')
      .references(() => invoices.id, { onDelete: 'cascade' })
      .notNull(),
    gateway: varchar('gateway', { length: 50 }).default('asaas').notNull(),
    method: paymentMethodEnum('method'),
    externalId: varchar('external_id', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    rawPayload: jsonb('raw_payload'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_payment_logs_invoice_id').on(table.invoiceId),
    index('idx_payment_logs_external_id').on(table.externalId),
  ],
);

// ── Billing Info ───────────────────────────────────────────
export const billingInfos = pgTable('billing_infos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  customerExternalId: varchar('customer_external_id', { length: 255 }),
  document: varchar('document', { length: 18 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  addressStreet: varchar('address_street', { length: 255 }),
  addressNumber: varchar('address_number', { length: 20 }),
  addressComplement: varchar('address_complement', { length: 100 }),
  addressNeighborhood: varchar('address_neighborhood', { length: 100 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressState: varchar('address_state', { length: 2 }),
  addressZipCode: varchar('address_zip_code', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Type exports ───────────────────────────────────────────
export type SubscriptionInsert = typeof subscriptions.$inferInsert;
export type SubscriptionSelect = typeof subscriptions.$inferSelect;
export type InvoiceInsert = typeof invoices.$inferInsert;
export type InvoiceSelect = typeof invoices.$inferSelect;
export type InvoiceItemInsert = typeof invoiceItems.$inferInsert;
export type InvoiceItemSelect = typeof invoiceItems.$inferSelect;
export type PaymentLogInsert = typeof paymentLogs.$inferInsert;
export type PaymentLogSelect = typeof paymentLogs.$inferSelect;
export type BillingInfoInsert = typeof billingInfos.$inferInsert;
export type BillingInfoSelect = typeof billingInfos.$inferSelect;
