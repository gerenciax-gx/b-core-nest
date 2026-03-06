import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type {
  PaymentLogRepositoryPort,
  PaymentLogEntry,
} from '../../../../domain/ports/output/payment-log.repository.port.js';
import { paymentLogs } from './billing.schema.js';

@Injectable()
export class DrizzlePaymentLogRepository implements PaymentLogRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(entry: PaymentLogEntry): Promise<void> {
    await this.db.insert(paymentLogs).values({
      id: randomUUID(),
      invoiceId: entry.invoiceId,
      gateway: entry.gateway,
      method: entry.method,
      externalId: entry.externalId,
      status: entry.status,
      amount: entry.amount.toString(),
      rawPayload: entry.rawPayload,
      processedAt: new Date(),
      createdAt: new Date(),
    });
  }

  async findByInvoiceId(invoiceId: string): Promise<PaymentLogEntry[]> {
    const rows = await this.db
      .select()
      .from(paymentLogs)
      .where(eq(paymentLogs.invoiceId, invoiceId));

    return rows.map((r) => ({
      invoiceId: r.invoiceId,
      gateway: r.gateway,
      method: r.method,
      externalId: r.externalId,
      status: r.status,
      amount: parseFloat(r.amount),
      rawPayload: r.rawPayload,
    }));
  }
}
