import { pgEnum } from 'drizzle-orm/pg-core';

// ── Auth / User ────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['master', 'admin', 'user']);

// ── Tenant ─────────────────────────────────────────────────
export const tenantStatusEnum = pgEnum('tenant_status', [
  'active',
  'suspended',
  'cancelled',
]);

export const companyTypeEnum = pgEnum('company_type', [
  'products',
  'services',
  'both',
]);

// ── Product ────────────────────────────────────────────────
export const productStatusEnum = pgEnum('product_status', [
  'active',
  'inactive',
  'draft',
]);

// ── Service ────────────────────────────────────────────────
export const serviceStatusEnum = pgEnum('service_status', [
  'active',
  'inactive',
  'paused',
]);

// ── Category ───────────────────────────────────────────────
export const categoryTypeEnum = pgEnum('category_type', [
  'product',
  'service',
]);

// ── Custom Field ───────────────────────────────────────────
export const customFieldTypeEnum = pgEnum('custom_field_type', [
  'text',
  'number',
  'date',
  'boolean',
]);

// ── Collaborator ───────────────────────────────────────────
export const collaboratorStatusEnum = pgEnum('collaborator_status', [
  'active',
  'inactive',
  'on_leave',
  'away',
]);

export const collaboratorRoleEnum = pgEnum('collaborator_role', [
  'admin',
  'user',
]);

export const collaboratorGenderEnum = pgEnum('collaborator_gender', [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
]);

// ── Billing ────────────────────────────────────────────────
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'cancelled',
  'trialing',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'pending',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'pix',
  'boleto',
  'credit_card',
  'debit_card',
]);

export const planIntervalEnum = pgEnum('plan_interval', [
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
]);

// ── Notification ───────────────────────────────────────────
export const notificationTypeEnum = pgEnum('notification_type', [
  'payment_confirmed',
  'payment_overdue',
  'subscription_activated',
  'tool_new',
  'system_maintenance',
  'stock_alert',
]);

// ── Marketplace ────────────────────────────────────────────
export const toolTypeEnum = pgEnum('tool_type', ['core', 'addon']);
