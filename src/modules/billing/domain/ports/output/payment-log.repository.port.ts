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
  save(entry: PaymentLogEntry): Promise<void>;
  findByInvoiceId(invoiceId: string): Promise<PaymentLogEntry[]>;
}
