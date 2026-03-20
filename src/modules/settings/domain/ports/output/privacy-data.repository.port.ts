import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface PrivacyDataRepositoryPort {
  /** Collects all tenant-scoped data for LGPD export */
  exportTenantData(tenantId: string): Promise<{
    company: Record<string, unknown>;
    categories: Record<string, unknown>[];
    products: Record<string, unknown>[];
    services: Record<string, unknown>[];
    collaborators: Record<string, unknown>[];
    notifications: Record<string, unknown>[];
    invoices: Record<string, unknown>[];
    subscriptions: Record<string, unknown>[];
  }>;

  /** Anonymizes personal data in invoices/billing but keeps financial records */
  anonymizeInvoices(tenantId: string, tx?: DbClient): Promise<void>;

  /** Deletes all non-fiscal tenant data (products, services, categories, etc.) */
  deleteTenantData(tenantId: string, tx?: DbClient): Promise<void>;
}
