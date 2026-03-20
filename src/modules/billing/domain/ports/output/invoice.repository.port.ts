import type { Invoice } from '../../entities/invoice.entity.js';
import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface InvoiceFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface InvoiceRepositoryPort {
  save(invoice: Invoice): Promise<Invoice>;
  findById(id: string): Promise<Invoice | null>;
  findByExternalId(externalId: string): Promise<Invoice | null>;
  findByTenantAndMonth(
    tenantId: string,
    referenceMonth: string,
  ): Promise<Invoice | null>;
  findByTenant(
    tenantId: string,
    filters?: InvoiceFilters,
  ): Promise<{ data: Invoice[]; total: number }>;
  findPendingByDueDate(dueDate: Date): Promise<Invoice[]>;
  findOverdue(): Promise<Invoice[]>;
  findOverdueByDays(minDays: number): Promise<Invoice[]>;
  findOverdueForRetry(maxRetries: number): Promise<Invoice[]>;
  update(invoice: Invoice, tx?: DbClient): Promise<Invoice>;
}
