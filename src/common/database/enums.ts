import { pgEnum } from 'drizzle-orm/pg-core';

// ── Auth / User ────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

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
  'ATIVO',
  'INATIVO',
  'RASCUNHO',
]);

// ── Service ────────────────────────────────────────────────
export const serviceStatusEnum = pgEnum('service_status', [
  'ATIVO',
  'INATIVO',
  'RASCUNHO',
]);

// ── Collaborator ───────────────────────────────────────────
export const collaboratorStatusEnum = pgEnum('collaborator_status', [
  'Ativo',
  'Inativo',
  'Férias',
  'Afastado',
]);

export const collaboratorRoleEnum = pgEnum('collaborator_role', [
  'Administrador',
  'Usuário',
]);

export const collaboratorGenderEnum = pgEnum('collaborator_gender', [
  'Masculino',
  'Feminino',
  'Outro',
  'Prefiro não informar',
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
