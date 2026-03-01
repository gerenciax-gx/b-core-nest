import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  integer,
  date,
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

  // ── Legal / Registration ────────────────────────────────
  legalName: varchar('legal_name', { length: 255 }),
  stateRegistration: varchar('state_registration', { length: 30 }),
  municipalRegistration: varchar('municipal_registration', { length: 30 }),

  // ── Address ─────────────────────────────────────────────
  cep: varchar('cep', { length: 10 }),
  street: varchar('street', { length: 255 }),
  number: varchar('number', { length: 20 }),
  complement: varchar('complement', { length: 100 }),
  neighborhood: varchar('neighborhood', { length: 100 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  country: varchar('country', { length: 50 }).default('BR'),

  // ── Business Data ───────────────────────────────────────
  openingDate: date('opening_date'),
  businessHours: varchar('business_hours', { length: 500 }),
  specialties: varchar('specialties', { length: 500 }),
  maxCapacity: integer('max_capacity'),
  averageServiceTime: integer('average_service_time'),
  paymentMethods: varchar('payment_methods', { length: 500 }),
  cancellationPolicy: text('cancellation_policy'),
  description: text('description'),

  // ── Social Links ────────────────────────────────────────
  website: varchar('website', { length: 500 }),
  instagram: varchar('instagram', { length: 255 }),
  facebook: varchar('facebook', { length: 255 }),
  whatsapp: varchar('whatsapp', { length: 20 }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TenantInsert = typeof tenants.$inferInsert;
export type TenantSelect = typeof tenants.$inferSelect;
