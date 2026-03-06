import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port.js';
import type { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port.js';
import { SAO_PAULO_TZ } from '../../../../common/helpers/business-day.helper.js';

@Injectable()
export class CheckOverdueCron {
  private readonly logger = new Logger(CheckOverdueCron.name);

  /** Dias de inadimplência para bloquear o tenant */
  private static readonly SUSPENSION_THRESHOLD_DAYS = 3;

  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,

    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Executa diariamente às 08:00.
   *
   * 1. Marca faturas pendentes vencidas como `overdue`
   * 2. Para faturas com 3+ dias de atraso → marca as subs do tenant como `past_due`
   *    e emite evento `tenant.suspended` para bloquear o acesso.
   */
  @Cron('0 8 * * *', { timeZone: SAO_PAULO_TZ })
  async execute(): Promise<void> {
    this.logger.log('Verificando faturas vencidas...');

    // ── Etapa 1: marcar pendentes como overdue ──
    const now = new Date();
    const pendingInvoices = await this.invoiceRepo.findPendingByDueDate(now);

    let marked = 0;
    for (const invoice of pendingInvoices) {
      if (invoice.isOverdue()) {
        invoice.markAsOverdue();
        await this.invoiceRepo.update(invoice);

        this.eventEmitter.emit('payment.overdue', {
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
          daysOverdue: invoice.getDaysOverdue(),
        });

        marked++;
      }
    }

    this.logger.log(`Faturas marcadas como vencidas: ${marked}`);

    // ── Etapa 2: suspender tenants com 3+ dias de atraso ──
    const longOverdue = await this.invoiceRepo.findOverdueByDays(
      CheckOverdueCron.SUSPENSION_THRESHOLD_DAYS,
    );

    const suspendedTenants = new Set<string>();

    for (const invoice of longOverdue) {
      if (suspendedTenants.has(invoice.tenantId)) continue;
      suspendedTenants.add(invoice.tenantId);

      // Marcar todas as subs ativas como past_due
      const subs = await this.subscriptionRepo.findActiveByTenantId(
        invoice.tenantId,
      );

      for (const sub of subs) {
        sub.markPastDue();
        await this.subscriptionRepo.update(sub);
      }

      this.eventEmitter.emit('tenant.suspended', {
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        daysOverdue: invoice.getDaysOverdue(),
      });

      this.logger.warn(
        `Tenant ${invoice.tenantId} suspenso — ${invoice.getDaysOverdue()} dias de atraso`,
      );
    }

    if (suspendedTenants.size > 0) {
      this.logger.warn(
        `Tenants suspensos por inadimplência: ${suspendedTenants.size}`,
      );
    }
  }
}
