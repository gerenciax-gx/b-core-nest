import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface PaymentLogEntry {
  invoiceId: string;
  gateway: string;
  method: 'pix' | 'boleto' | 'credit_card' | 'debit_card' | null;
  externalId: string | null;
  status: string;
  amount: number;
  rawPayload: unknown;
}

export interface PaymentLogRepositoryPort {
  save(entry: PaymentLogEntry, tx?: DbClient): Promise<void>;
  findByInvoiceId(invoiceId: string): Promise<PaymentLogEntry[]>;
  findByExternalId(externalId: string, tx?: DbClient): Promise<PaymentLogEntry | null>;
}
