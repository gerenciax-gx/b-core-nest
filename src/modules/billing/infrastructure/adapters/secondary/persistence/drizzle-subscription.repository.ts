import { Inject, Injectable } from '@nestjs/common';
import { eq, and, lte } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { SubscriptionRepositoryPort } from '../../../../domain/ports/output/subscription.repository.port.js';
import {
  Subscription,
  type SubscriptionStatus,
} from '../../../../domain/entities/subscription.entity.js';
import { subscriptions } from './billing.schema.js';

@Injectable()
export class DrizzleSubscriptionRepository
  implements SubscriptionRepositoryPort
{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(subscription: Subscription): Promise<Subscription> {
    await this.db.insert(subscriptions).values({
      id: subscription.id,
      tenantId: subscription.tenantId,
      planId: subscription.planId,
      status: subscription.status,
      startDate: this.formatDate(subscription.startDate),
      endDate: subscription.endDate
        ? this.formatDate(subscription.endDate)
        : null,
      nextBillingDate: this.formatDate(subscription.nextBillingDate),
      cancelledAt: subscription.cancelledAt,
      cancelReason: subscription.cancelReason,
      cardToken: subscription.cardToken,
      cardLast4: subscription.cardLast4,
      cardBrand: subscription.cardBrand,
      preferredPaymentMethod: subscription.preferredPaymentMethod as
        | 'pix'
        | 'boleto'
        | 'credit_card'
        | 'debit_card'
        | null,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    });
    return subscription;
  }

  async findById(id: string): Promise<Subscription | null> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByTenantId(tenantId: string): Promise<Subscription[]> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId));

    return rows.map((r) => this.toDomain(r));
  }

  async findActiveByTenantId(tenantId: string): Promise<Subscription[]> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.status, 'active'),
        ),
      );

    return rows.map((r) => this.toDomain(r));
  }

  async findDueToBill(date: Date): Promise<Subscription[]> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          lte(subscriptions.nextBillingDate, this.formatDate(date)),
        ),
      );

    return rows.map((r) => this.toDomain(r));
  }

  async update(subscription: Subscription): Promise<Subscription> {
    await this.db
      .update(subscriptions)
      .set({
        status: subscription.status,
        endDate: subscription.endDate
          ? this.formatDate(subscription.endDate)
          : null,
        nextBillingDate: this.formatDate(subscription.nextBillingDate),
        cancelledAt: subscription.cancelledAt,
        cancelReason: subscription.cancelReason,
        cardToken: subscription.cardToken,
        cardLast4: subscription.cardLast4,
        cardBrand: subscription.cardBrand,
        preferredPaymentMethod: subscription.preferredPaymentMethod as
          | 'pix'
          | 'boleto'
          | 'credit_card'
          | 'debit_card'
          | null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    return subscription;
  }

  // ── Helpers ────────────────────────────────────────────────

  private toDomain(
    row: typeof subscriptions.$inferSelect,
  ): Subscription {
    return new Subscription(
      row.id,
      row.tenantId,
      row.planId,
      row.status as SubscriptionStatus,
      new Date(row.startDate),
      row.endDate ? new Date(row.endDate) : null,
      new Date(row.nextBillingDate),
      row.cancelledAt,
      row.cancelReason,
      row.cardToken,
      row.cardLast4,
      row.cardBrand,
      row.preferredPaymentMethod,
      row.createdAt,
      row.updatedAt,
    );
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }
}
