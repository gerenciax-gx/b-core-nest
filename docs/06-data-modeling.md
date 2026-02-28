# 06. Modelagem de Dados

> **ORM:** Drizzle ORM (schema-first, type-safe)  
> **Banco:** PostgreSQL 16+ (Supabase)  
> **Multi-tenancy:** Column-based (`tenant_id` em todas as tabelas de negócio)

---

## 1. Diagrama de Relacionamentos

```
┌──────────────────────────────────────────────────────────────────┐
│                         TENANTS                                  │
│ (id, companyName, companyType, status, plan, ...)               │
└──────────┬───────────────────────────────────────────────────────┘
           │ 1:N
    ┌──────┴──────┐
    │    USERS    │
    │ (tenantId,  │───────────────────────────────┐
    │  role,      │                               │ collaboratorId?
    │  mustReset) │                               │
    └──────┬──────┘                        ┌──────┴──────────┐
           │                               │  COLLABORATORS  │
           │ 1:N                           │ (tenantId,      │
    ┌──────┴──────────────┐                │  firstName, ..  │
    │   USER_SESSIONS     │                └──────┬──────────┘
    │ (userId, device,    │                       │ N:M
    │  refreshToken, ...) │                ┌──────┴──────────────────────┐
    └─────────────────────┘                │ COLLABORATOR_TOOL_PERMS    │
                                           │ (collaboratorId, toolId)   │
    ┌─────────────────────┐                └────────────────────────────┘
    │     PRODUCTS        │
    │ (tenantId, name,    │──── 1:N ────┬── PRODUCT_VARIATIONS
    │  sku, basePrice,    │             │   (productId, size, color, price)
    │  stock, status)     │             │
    └─────────────────────┘             ├── PRODUCT_CUSTOM_FIELDS
                                        │   (productId, key, value)
    ┌─────────────────────┐             │
    │     SERVICES        │             └── PRODUCT_CATEGORIES
    │ (tenantId, name,    │                 (productId, categoryId)
    │  duration, price)   │
    └──────┬──────────────┘
           │ 1:N
    ┌──────┴──────────────┐    ┌─────────────────────────┐
    │ SERVICE_PRICE_VARS  │    │ SERVICE_PROFESSIONALS   │
    │ (serviceId, name,   │    │ (serviceId, name, ...)  │
    │  price)             │    └─────────────────────────┘
    └─────────────────────┘

    ┌─────────────────────┐         ┌──────────────────────┐
    │      TOOLS          │         │    TOOL_PLANS        │
    │ (name, slug, type)  │── 1:N ──│ (toolId, name,       │
    └─────────────────────┘         │  price, interval)    │
                                    └──────┬───────────────┘
                                           │ 1:N
    ┌──────────────────────┐        ┌──────┴───────────────┐
    │   PLAN_FEATURES      │        │   SUBSCRIPTIONS      │
    │ (planId, key, value) │        │ (tenantId, planId,   │
    └──────────────────────┘        │  status, startDate)  │
                                    └──────┬───────────────┘
                                           │ 1:N
    ┌──────────────────────────┐    ┌──────┴───────────────┐
    │     INVOICE_ITEMS        │    │     INVOICES         │
    │ (invoiceId, description, │◄───│ (subscriptionId,     │
    │  unitPrice, qty, total)  │    │  status, totalAmount,│
    └──────────────────────────┘    │  dueDate, paidAt)    │
                                    └──────┬───────────────┘
                                           │ 1:N
                                    ┌──────┴───────────────┐
                                    │   PAYMENT_LOGS       │
                                    │ (invoiceId, gateway, │
                                    │  method, status)     │
                                    └──────────────────────┘

    ┌──────────────────────┐    ┌──────────────────────┐
    │   BILLING_INFOS      │    │   NOTIFICATIONS      │
    │ (tenantId, document, │    │ (tenantId, userId,   │
    │  address, phone)     │    │  type, title, read)  │
    └──────────────────────┘    └──────────────────────┘

    ┌──────────────────────┐    ┌──────────────────────┐
    │   USER_SETTINGS      │    │   INTEGRATIONS       │
    │ (userId, theme,      │    │ (name, type, ...)    │
    │  language, notifs)   │    └──────────┬───────────┘
    └──────────────────────┘               │ N:M
                                    ┌──────┴───────────────┐
                                    │ TENANT_INTEGRATIONS  │
                                    │ (tenantId, integId,  │
                                    │  config, apiKey)     │
                                    └──────────────────────┘

    ┌──────────────────────┐
    │     API_KEYS         │
    │ (tenantId, prefix,   │
    │  hashedKey, scope)   │
    └──────────────────────┘
```

---

## 2. Schemas Drizzle por Módulo

### 2.1 Enums Compartilhados

```typescript
// src/common/database/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'cancelled']);
export const companyTypeEnum = pgEnum('company_type', ['produtos', 'servicos', 'ambos']);
export const productStatusEnum = pgEnum('product_status', ['ATIVO', 'INATIVO', 'RASCUNHO']);
export const serviceStatusEnum = pgEnum('service_status', ['ATIVO', 'INATIVO', 'RASCUNHO']);
export const collaboratorStatusEnum = pgEnum('collaborator_status', ['Ativo', 'Inativo', 'Férias', 'Afastado']);
export const collaboratorRoleEnum = pgEnum('collaborator_role', ['Administrador', 'Usuário']);
export const collaboratorGenderEnum = pgEnum('collaborator_gender', ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'cancelled', 'trialing']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['pending', 'paid', 'overdue', 'cancelled', 'refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['pix', 'boleto', 'credit_card', 'debit_card']);
export const planIntervalEnum = pgEnum('plan_interval', ['monthly', 'quarterly', 'semiannual', 'annual']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'payment_confirmed', 'payment_overdue', 'subscription_activated',
  'tool_new', 'system_maintenance', 'stock_alert',
]);
export const toolTypeEnum = pgEnum('tool_type', ['core', 'addon']);
```

---

### 2.2 Módulo Tenant

```typescript
// src/modules/tenant/infrastructure/database/tenant.schema.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { tenantStatusEnum, companyTypeEnum } from '../../../../common/database/enums';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyType: companyTypeEnum('company_type').notNull(),
  document: varchar('document', { length: 18 }), // CNPJ ou CPF
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  status: tenantStatusEnum('status').default('active').notNull(),
  logoUrl: varchar('logo_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

### 2.3 Módulo Auth / User

```typescript
// src/modules/auth/infrastructure/database/user.schema.ts
import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { userRoleEnum } from '../../../../common/database/enums';
import { tenants } from '../../../tenant/infrastructure/database/tenant.schema';
import { collaborators } from '../../../collaborator/infrastructure/database/collaborator.schema';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('admin').notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),

  // Fluxo Collaborator → User
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id, { onDelete: 'set null' }),
  mustResetPassword: boolean('must_reset_password').default(false).notNull(),

  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_users_tenant_id').on(table.tenantId),
  emailIdx: index('idx_users_email').on(table.email),
  collaboratorIdx: index('idx_users_collaborator_id').on(table.collaboratorId),
}));

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refreshToken: varchar('refresh_token', { length: 500 }).notNull(),
  device: varchar('device', { length: 255 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_user_sessions_user_id').on(table.userId),
  tokenIdx: index('idx_user_sessions_refresh_token').on(table.refreshToken),
}));
```

---

### 2.4 Módulo Collaborator

```typescript
// src/modules/collaborator/infrastructure/database/collaborator.schema.ts
import { pgTable, uuid, varchar, timestamp, boolean, date, index } from 'drizzle-orm/pg-core';
import { collaboratorStatusEnum, collaboratorRoleEnum, collaboratorGenderEnum } from '../../../../common/database/enums';
import { tenants } from '../../../tenant/infrastructure/database/tenant.schema';

export const collaborators = pgTable('collaborators', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  cpf: varchar('cpf', { length: 14 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  birthDate: date('birth_date'),
  gender: collaboratorGenderEnum('gender').notNull(),
  status: collaboratorStatusEnum('status').default('Ativo').notNull(),
  role: collaboratorRoleEnum('role').default('Usuário').notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  allToolsAccess: boolean('all_tools_access').default(false).notNull(),
  notes: varchar('notes', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_collaborators_tenant_id').on(table.tenantId),
  emailIdx: index('idx_collaborators_email').on(table.email),
  cpfIdx: index('idx_collaborators_cpf').on(table.cpf),
}));

export const collaboratorToolPermissions = pgTable('collaborator_tool_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id, { onDelete: 'cascade' }).notNull(),
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'cascade' }).notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  collaboratorIdx: index('idx_collab_perms_collaborator').on(table.collaboratorId),
  toolIdx: index('idx_collab_perms_tool').on(table.toolId),
}));
```

---

### 2.5 Módulo Product

```typescript
// src/modules/product/infrastructure/database/product.schema.ts
import { pgTable, uuid, varchar, timestamp, numeric, integer, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { productStatusEnum } from '../../../../common/database/enums';
import { tenants } from '../../../tenant/infrastructure/database/tenant.schema';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 2000 }),
  sku: varchar('sku', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 50 }),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
  stock: integer('stock').default(0).notNull(),
  minStock: integer('min_stock').default(0),
  trackInventory: boolean('track_inventory').default(true).notNull(),
  weight: numeric('weight', { precision: 8, scale: 3 }),
  unit: varchar('unit', { length: 20 }),
  imageUrl: varchar('image_url', { length: 500 }),
  status: productStatusEnum('status').default('ATIVO').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_products_tenant_id').on(table.tenantId),
  skuIdx: index('idx_products_sku').on(table.sku),
  tenantSkuIdx: index('idx_products_tenant_sku').on(table.tenantId, table.sku),
  statusIdx: index('idx_products_status').on(table.status),
}));

export const productVariations = pgTable('product_variations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // ex: "P Azul"
  sku: varchar('sku', { length: 100 }),
  size: varchar('size', { length: 50 }),
  color: varchar('color', { length: 50 }),
  material: varchar('material', { length: 100 }),
  additionalPrice: numeric('additional_price', { precision: 10, scale: 2 }).default('0'),
  stock: integer('stock').default(0),
  imageUrl: varchar('image_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  productIdx: index('idx_product_variations_product_id').on(table.productId),
}));

export const productCustomFields = pgTable('product_custom_fields', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  fieldKey: varchar('field_key', { length: 100 }).notNull(),
  fieldValue: varchar('field_value', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  productIdx: index('idx_product_custom_fields_product_id').on(table.productId),
}));

export const productCategories = pgTable('product_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  parentId: uuid('parent_id'), // auto-referência para subcategorias
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_product_categories_tenant_id').on(table.tenantId),
}));
```

---

### 2.6 Módulo Service

```typescript
// src/modules/service/infrastructure/database/service.schema.ts
import { pgTable, uuid, varchar, timestamp, numeric, integer, boolean, index, text } from 'drizzle-orm/pg-core';
import { serviceStatusEnum } from '../../../../common/database/enums';
import { tenants } from '../../../tenant/infrastructure/database/tenant.schema';

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // em minutos
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }),
  status: serviceStatusEnum('status').default('ATIVO').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_services_tenant_id').on(table.tenantId),
  statusIdx: index('idx_services_status').on(table.status),
}));

export const servicePriceVariations = pgTable('service_price_variations', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  duration: integer('duration'), // em minutos, override opcional
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  serviceIdx: index('idx_service_price_vars_service_id').on(table.serviceId),
}));

export const serviceProfessionals = pgTable('service_professionals', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  collaboratorId: uuid('collaborator_id').references(() => collaborators.id, { onDelete: 'cascade' }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  serviceIdx: index('idx_service_professionals_service_id').on(table.serviceId),
  collaboratorIdx: index('idx_service_professionals_collaborator_id').on(table.collaboratorId),
}));

export const servicePhotos = pgTable('service_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  order: integer('order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  serviceIdx: index('idx_service_photos_service_id').on(table.serviceId),
}));
```

---

### 2.7 Módulo Marketplace (Tools + Plans)

```typescript
// src/modules/marketplace/infrastructure/database/marketplace.schema.ts
import { pgTable, uuid, varchar, timestamp, numeric, boolean, index, text, jsonb } from 'drizzle-orm/pg-core';
import { toolTypeEnum, planIntervalEnum } from '../../../../common/database/enums';

export const tools = pgTable('tools', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  description: text('description'),
  type: toolTypeEnum('type').default('addon').notNull(),
  iconUrl: varchar('icon_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'), // dados extras flexíveis
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const toolPlans = pgTable('tool_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // "Básico", "Profissional", "Empresarial"
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  interval: planIntervalEnum('interval').default('monthly').notNull(),
  trialDays: numeric('trial_days').default('0'),
  isPopular: boolean('is_popular').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  maxUsers: numeric('max_users'),
  maxItems: numeric('max_items'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  toolIdx: index('idx_tool_plans_tool_id').on(table.toolId),
}));

export const planFeatures = pgTable('plan_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').references(() => toolPlans.id, { onDelete: 'cascade' }).notNull(),
  featureKey: varchar('feature_key', { length: 100 }).notNull(),
  featureValue: varchar('feature_value', { length: 255 }).notNull(),
  isHighlighted: boolean('is_highlighted').default(false).notNull(),
  order: numeric('order').default('0'),
}, (table) => ({
  planIdx: index('idx_plan_features_plan_id').on(table.planId),
}));
```

---

### 2.8 Módulo Billing

```typescript
// src/modules/billing/infrastructure/database/billing.schema.ts
import { pgTable, uuid, varchar, timestamp, numeric, integer, boolean, index, text, date } from 'drizzle-orm/pg-core';
import { subscriptionStatusEnum, invoiceStatusEnum, paymentMethodEnum } from '../../../../common/database/enums';
import { tenants } from '../../../tenant/infrastructure/database/tenant.schema';
import { toolPlans } from '../../../marketplace/infrastructure/database/marketplace.schema';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  planId: uuid('plan_id').references(() => toolPlans.id).notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  nextBillingDate: date('next_billing_date').notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelReason: varchar('cancel_reason', { length: 500 }),
  // Card Token para recorrência
  cardToken: varchar('card_token', { length: 255 }),
  cardLast4: varchar('card_last4', { length: 4 }),
  cardBrand: varchar('card_brand', { length: 50 }),
  preferredPaymentMethod: paymentMethodEnum('preferred_payment_method'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_subscriptions_tenant_id').on(table.tenantId),
  statusIdx: index('idx_subscriptions_status').on(table.status),
  nextBillingIdx: index('idx_subscriptions_next_billing').on(table.nextBillingDate),
}));

export const subscribedTools = pgTable('subscribed_tools', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  toolId: uuid('tool_id').references(() => tools.id).notNull(),
  activatedAt: timestamp('activated_at', { withTimezone: true }).defaultNow().notNull(),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
}, (table) => ({
  subscriptionIdx: index('idx_subscribed_tools_subscription').on(table.subscriptionId),
}));

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id).notNull(),
  status: invoiceStatusEnum('status').default('pending').notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  externalId: varchar('external_id', { length: 255 }), // ID no Asaas
  externalUrl: varchar('external_url', { length: 500 }), // URL de pagamento do Asaas
  pixQrCode: text('pix_qr_code'),
  pixCopyPaste: text('pix_copy_paste'),
  boletoUrl: varchar('boleto_url', { length: 500 }),
  boletoBarcode: varchar('boleto_barcode', { length: 100 }),
  referenceMonth: varchar('reference_month', { length: 7 }).notNull(), // "2026-03"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_invoices_tenant_id').on(table.tenantId),
  subscriptionIdx: index('idx_invoices_subscription_id').on(table.subscriptionId),
  statusIdx: index('idx_invoices_status').on(table.status),
  dueDateIdx: index('idx_invoices_due_date').on(table.dueDate),
  externalIdx: index('idx_invoices_external_id').on(table.externalId),
}));

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
  invoiceIdx: index('idx_invoice_items_invoice_id').on(table.invoiceId),
}));

export const paymentLogs = pgTable('payment_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  gateway: varchar('gateway', { length: 50 }).default('asaas').notNull(),
  method: paymentMethodEnum('method'),
  externalId: varchar('external_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(), // 'PENDING', 'CONFIRMED', 'RECEIVED', 'FAILED'
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  rawPayload: jsonb('raw_payload'), // webhook payload completo
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  invoiceIdx: index('idx_payment_logs_invoice_id').on(table.invoiceId),
  externalIdx: index('idx_payment_logs_external_id').on(table.externalId),
}));

export const billingInfos = pgTable('billing_infos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).unique().notNull(),
  customerExternalId: varchar('customer_external_id', { length: 255 }), // ID cliente no Asaas
  document: varchar('document', { length: 18 }).notNull(), // CPF ou CNPJ
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

### 2.9 Módulo Notification

```typescript
// src/modules/notification/infrastructure/database/notification.schema.ts
import { pgTable, uuid, varchar, timestamp, boolean, index, text } from 'drizzle-orm/pg-core';
import { notificationTypeEnum } from '../../../../common/database/enums';
import { tenants } from '../../../tenant/infrastructure/database/tenant.schema';
import { users } from '../../../auth/infrastructure/database/user.schema';

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  metadata: jsonb('metadata'), // dados extras (ex: invoiceId, toolId)
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_notifications_tenant_id').on(table.tenantId),
  userIdx: index('idx_notifications_user_id').on(table.userId),
  readIdx: index('idx_notifications_is_read').on(table.isRead),
}));
```

---

### 2.10 Módulo Settings

```typescript
// src/modules/settings/infrastructure/database/settings.schema.ts
import { pgTable, uuid, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../../../auth/infrastructure/database/user.schema';

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  theme: varchar('theme', { length: 20 }).default('system').notNull(), // 'light', 'dark', 'system'
  language: varchar('language', { length: 10 }).default('pt-BR').notNull(),
  notificationsEnabled: boolean('notifications_enabled').default(true).notNull(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  pushNotifications: boolean('push_notifications').default(true).notNull(),
  preferences: jsonb('preferences'), // configurações adicionais flexíveis
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

### 2.11 Módulo Integration

```typescript
// src/modules/settings/infrastructure/database/integration.schema.ts
import { pgTable, uuid, varchar, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from '../../../tenant/infrastructure/database/tenant.schema';

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'payment', 'email', 'sms', 'storage'
  description: varchar('description', { length: 500 }),
  iconUrl: varchar('icon_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  configSchema: jsonb('config_schema'), // JSON Schema dos campos necessários
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tenantIntegrations = pgTable('tenant_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  integrationId: uuid('integration_id').references(() => integrations.id).notNull(),
  config: jsonb('config').notNull(), // configuração específica do tenant (criptografada)
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_tenant_integrations_tenant').on(table.tenantId),
  integrationIdx: index('idx_tenant_integrations_integration').on(table.integrationId),
}));

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  prefix: varchar('prefix', { length: 10 }).notNull(), // "gx_live_" ou "gx_test_"
  hashedKey: varchar('hashed_key', { length: 255 }).notNull(),
  scope: varchar('scope', { length: 50 }).default('full').notNull(), // 'full', 'read', 'write'
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_api_keys_tenant').on(table.tenantId),
  hashedKeyIdx: index('idx_api_keys_hashed_key').on(table.hashedKey),
}));
```

---

## 3. Drizzle Provider

```typescript
// src/common/database/drizzle.provider.ts
import { Provider } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as tenantSchema from '../../modules/tenant/infrastructure/database/tenant.schema';
import * as userSchema from '../../modules/auth/infrastructure/database/user.schema';
import * as collaboratorSchema from '../../modules/collaborator/infrastructure/database/collaborator.schema';
import * as productSchema from '../../modules/product/infrastructure/database/product.schema';
import * as serviceSchema from '../../modules/service/infrastructure/database/service.schema';
import * as marketplaceSchema from '../../modules/marketplace/infrastructure/database/marketplace.schema';
import * as billingSchema from '../../modules/billing/infrastructure/database/billing.schema';
import * as notificationSchema from '../../modules/notification/infrastructure/database/notification.schema';
import * as settingsSchema from '../../modules/settings/infrastructure/database/settings.schema';
import * as integrationSchema from '../../modules/settings/infrastructure/database/integration.schema';

const schema = {
  ...tenantSchema,
  ...userSchema,
  ...collaboratorSchema,
  ...productSchema,
  ...serviceSchema,
  ...marketplaceSchema,
  ...billingSchema,
  ...notificationSchema,
  ...settingsSchema,
  ...integrationSchema,
};

export type DrizzleSchema = typeof schema;
export type DrizzleDatabase = PostgresJsDatabase<DrizzleSchema>;

export const DRIZZLE = 'DRIZZLE';

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }
    const client = postgres(connectionString, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzle(client, { schema });
  },
};
```

---

## 4. Migrations

### 4.1 Configuração

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/**/database/*.schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### 4.2 Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "ts-node src/common/database/seed.ts"
  }
}
```

### 4.3 Workflow de Migrations

1. Alterar schema no arquivo `.schema.ts`
2. Rodar `npm run db:generate` → gera SQL em `drizzle/migrations/`
3. Revisar SQL gerado
4. Rodar `npm run db:migrate` em dev
5. Commitar migration com o código
6. CI/CD aplica automaticamente em staging/prod

---

## 5. Índices Obrigatórios

| Tabela | Coluna | Tipo | Motivo |
|--------|--------|------|--------|
| **Todas com tenant_id** | `tenant_id` | Index | Filtro multi-tenant em toda query |
| users | `email` | Unique Index | Login por email |
| users | `collaborator_id` | Index | Lookup Collaborator→User |
| products | `(tenant_id, sku)` | Composite | SKU único por tenant |
| invoices | `external_id` | Index | Webhook lookup |
| invoices | `due_date` | Index | CRON de vencimento |
| invoices | `status` | Index | Filtros de status |
| subscriptions | `next_billing_date` | Index | CRON de faturamento |
| payment_logs | `external_id` | Index | Webhook lookup |
| api_keys | `hashed_key` | Index | Auth por API key |

---

## 5.5 Convenção de Valores Monetários (OBRIGATÓRIO)

> **Regra D-005:** Todo campo que represente dinheiro (preço, custo, total, desconto, subtotal, etc.) DEVE usar `numeric(10, 2)` no PostgreSQL. **PROIBIDO** usar `float`, `real`, `double precision` ou `integer` (centavos).

### Camadas e tipos

| Camada | Tipo | Exemplo |
|--------|------|---------|
| **Schema Drizzle** | `numeric('coluna', { precision: 10, scale: 2 })` | `basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull()` |
| **Entity (domain)** | `number` | `private _basePrice: number` |
| **Value Object** | `Money` (VO com validação) | `Money.create(49.90)` |
| **DTO entrada** | `number` com `@IsNumber({ maxDecimalPlaces: 2 })` | `@Min(0) basePrice: number` |
| **DTO saída** | `number` com `@ApiProperty({ type: 'number', format: 'decimal' })` | `basePrice: number` |
| **JSON response** | `number` | `"basePrice": 49.90` |

### Conversão Drizzle → Entity (Mapper)

Drizzle retorna `numeric` como `string`. O **mapper** é responsável pela conversão:

```typescript
// ✅ CORRETO — No mapper (schema → entity)
const entity = Product.create({
  basePrice: parseFloat(row.basePrice),   // "49.90" → 49.90
  costPrice: row.costPrice ? parseFloat(row.costPrice) : undefined,
});

// ✅ CORRETO — No mapper (entity → schema insert)
const values = {
  basePrice: entity.basePrice.toString(),  // 49.90 → "49.90"
};
```

### Anti-patterns

```typescript
// ❌ PROIBIDO — float/real no schema
basePrice: real('base_price'),
basePrice: doublePrecision('base_price'),

// ❌ PROIBIDO — integer em centavos
basePrice: integer('base_price'), // 4990 representando R$ 49,90

// ❌ PROIBIDO — Math.round no controller/service (é responsabilidade do VO Money)
const price = Math.round(dto.basePrice * 100) / 100;

// ✅ CORRETO — Toda aritmética monetária via Money VO
const total = Money.create(item.price).multiply(item.quantity);
```

### Campos afetados (lista não exaustiva)

`basePrice`, `costPrice`, `price`, `additionalPrice`, `totalAmount`, `subtotal`, `discount`, `monthlyPrice`, `unitPrice`, `total`, `amount`, `balance`, `credit`

---

## 6. Regras de Modelagem

| # | Nível | Regra |
|---|-------|-------|
| D-001 | 🚫 CRITICAL | Toda tabela de negócio DEVE ter `tenant_id` (exceto tabelas globais: tools, integrations) |
| D-002 | ⚠️ REQUIRED | Primary keys são `uuid` com `defaultRandom()` |
| D-003 | ⚠️ REQUIRED | Timestamps: `created_at` e `updated_at` com `withTimezone: true` |
| D-004 | ⚠️ REQUIRED | Soft delete NÃO é padrão — usar hard delete. Se necessário, adicionar `deletedAt` |
| D-005 | 🚫 CRITICAL | Valores monetários: `numeric(10, 2)` — **PROIBIDO** `float`, `real`, `integer` (centavos). Drizzle retorna string → converter com `parseFloat()` no mapper. Aritmética monetária via `Money` VO |
| D-006 | ⚠️ REQUIRED | Enums definidos como `pgEnum` — compartilhados em `common/database/enums.ts` |
| D-007 | ⚠️ REQUIRED | Foreign keys com `onDelete: 'cascade'` para filhas diretas |
| D-008 | 🚫 CRITICAL | Índice em `tenant_id` é obrigatório em toda tabela com tenant |
| D-009 | ⚠️ REQUIRED | Nomes de tabela em `snake_case` plural (products, invoices) |
| D-010 | ⚠️ REQUIRED | Nomes de coluna em `snake_case` (created_at, tenant_id) |
| D-011 | 🚫 CRITICAL | **PROIBIDO** criar tabela sem schema Drizzle tipado |
| D-012 | ⚠️ REQUIRED | Toda migration DEVE ser revisada antes de rodar em prod |

---

> **Skill File v1.0** — Modelagem de Dados  
> **Regra:** Schema Drizzle é a fonte de verdade. Toda alteração no banco começa pelo schema.
