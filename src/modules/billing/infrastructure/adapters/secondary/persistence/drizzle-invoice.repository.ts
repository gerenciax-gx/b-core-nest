import { Inject, Injectable } from '@nestjs/common';
import { eq, and, lte, sql, desc } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type {
  InvoiceRepositoryPort,
  InvoiceFilters,
} from '../../../../domain/ports/output/invoice.repository.port.js';
import {
  Invoice,
  InvoiceItem,
  type InvoiceStatus,
} from '../../../../domain/entities/invoice.entity.js';
import { Money } from '../../../../domain/value-objects/money.vo.js';
import { invoices, invoiceItems } from './billing.schema.js';

@Injectable()
export class DrizzleInvoiceRepository implements InvoiceRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(invoice: Invoice): Promise<Invoice> {
    await this.db.insert(invoices).values({
      id: invoice.id,
      tenantId: invoice.tenantId,
      subscriptionId: invoice.subscriptionId,
      status: invoice.status,
      totalAmount: invoice.totalAmount.amount.toString(),
      dueDate: this.formatDate(invoice.dueDate),
      paidAt: invoice.paidAt,
      externalId: invoice.externalId,
      externalUrl: invoice.externalUrl,
      pixQrCode: invoice.pixQrCode,
      pixCopyPaste: invoice.pixCopyPaste,
      boletoUrl: invoice.boletoUrl,
      boletoBarcode: invoice.boletoBarcode,
      referenceMonth: invoice.referenceMonth,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });

    // Save invoice items
    for (const item of invoice.items) {
      await this.db.insert(invoiceItems).values({
        id: item.id,
        invoiceId: invoice.id,
        description: item.description,
        unitPrice: item.unitPrice.amount.toString(),
        quantity: item.quantity,
        totalPrice: item.totalPrice.amount.toString(),
      });
    }

    return invoice;
  }

  async findById(id: string): Promise<Invoice | null> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const entity = this.toDomain(row);
    const items = await this.findItemsByInvoiceId(id);
    entity.setItems(items);
    return entity;
  }

  async findByExternalId(externalId: string): Promise<Invoice | null> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.externalId, externalId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const entity = this.toDomain(row);
    const items = await this.findItemsByInvoiceId(entity.id);
    entity.setItems(items);
    return entity;
  }

  async findByTenant(
    tenantId: string,
    filters?: InvoiceFilters,
  ): Promise<{ data: Invoice[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [
      eq(invoices.tenantId, tenantId),
    ];

    if (filters?.status) {
      conditions.push(
        eq(invoices.status, filters.status as InvoiceStatus),
      );
    }
    if (filters?.startDate) {
      conditions.push(
        sql`${invoices.dueDate} >= ${this.formatDate(filters.startDate)}`,
      );
    }
    if (filters?.endDate) {
      conditions.push(
        sql`${invoices.dueDate} <= ${this.formatDate(filters.endDate)}`,
      );
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(and(...conditions)),
    ]);

    return {
      data: rows.map((r) => this.toDomain(r)),
      total: countResult[0]?.count ?? 0,
    };
  }

  async findPendingByDueDate(dueDate: Date): Promise<Invoice[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'pending'),
          lte(invoices.dueDate, this.formatDate(dueDate)),
        ),
      );

    return rows.map((r) => this.toDomain(r));
  }

  async findOverdue(): Promise<Invoice[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.status, 'overdue'));

    return rows.map((r) => this.toDomain(r));
  }

  async findByTenantAndMonth(
    tenantId: string,
    referenceMonth: string,
  ): Promise<Invoice | null> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.referenceMonth, referenceMonth),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const entity = this.toDomain(row);
    const items = await this.findItemsByInvoiceId(entity.id);
    entity.setItems(items);
    return entity;
  }

  async findOverdueByDays(minDays: number): Promise<Invoice[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'overdue'),
          sql`${invoices.dueDate} <= (CURRENT_DATE - ${minDays}::int)`,
        ),
      );

    return rows.map((r) => this.toDomain(r));
  }

  async update(invoice: Invoice): Promise<Invoice> {
    await this.db
      .update(invoices)
      .set({
        status: invoice.status,
        totalAmount: invoice.totalAmount.amount.toString(),
        paidAt: invoice.paidAt,
        externalId: invoice.externalId,
        externalUrl: invoice.externalUrl,
        pixQrCode: invoice.pixQrCode,
        pixCopyPaste: invoice.pixCopyPaste,
        boletoUrl: invoice.boletoUrl,
        boletoBarcode: invoice.boletoBarcode,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoice.id));

    return invoice;
  }

  // ── Helpers ────────────────────────────────────────────────

  private async findItemsByInvoiceId(invoiceId: string): Promise<InvoiceItem[]> {
    const rows = await this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    return rows.map(
      (r) =>
        new InvoiceItem(
          r.id,
          r.invoiceId,
          r.description,
          Money.create(parseFloat(r.unitPrice)),
          r.quantity,
          Money.create(parseFloat(r.totalPrice)),
        ),
    );
  }

  private toDomain(
    row: typeof invoices.$inferSelect,
  ): Invoice {
    return new Invoice(
      row.id,
      row.tenantId,
      row.subscriptionId ?? null,
      row.status as InvoiceStatus,
      Money.create(parseFloat(row.totalAmount)),
      new Date(row.dueDate),
      row.paidAt,
      row.externalId,
      row.externalUrl,
      row.pixQrCode,
      row.pixCopyPaste,
      row.boletoUrl,
      row.boletoBarcode,
      row.referenceMonth,
      row.createdAt,
      row.updatedAt,
    );
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }
}
