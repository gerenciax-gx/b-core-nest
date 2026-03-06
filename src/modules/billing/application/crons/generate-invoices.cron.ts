import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../common/database/database.module.js';
import type { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port.js';
import type { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port.js';
import { Invoice, type InvoiceItemProps } from '../../domain/entities/invoice.entity.js';
import {
  toolPlans,
  tools,
} from '../../../marketplace/infrastructure/adapters/secondary/persistence/marketplace.schema.js';
import {
  isTodayLastBusinessDay,
  getNthBusinessDay,
  nowInSaoPaulo,
  SAO_PAULO_TZ,
} from '../../../../common/helpers/business-day.helper.js';
import { calculateMidCycleProRata } from '../../domain/value-objects/pro-rata.calculator.js';
import { subscriptions } from '../../infrastructure/adapters/secondary/persistence/billing.schema.js';

@Injectable()
export class GenerateInvoicesCron {
  private readonly logger = new Logger(GenerateInvoicesCron.name);

  constructor(
    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,

    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  /**
   * Executa diariamente às 06:00. Gera faturas apenas no último dia útil do mês.
   *
   * Regras:
   * - Fatura consolidada: 1 fatura / tenant / mês com N itens (um por ferramenta)
   * - Fatura fecha no último dia útil do mês
   * - Vencimento no 5° dia útil do mês seguinte
   * - Pro-rata para ferramentas contratadas no meio do mês
   * - Deduplicação por (tenantId + referenceMonth)
   */
  @Cron('0 6 * * *', { timeZone: SAO_PAULO_TZ })
  async execute(): Promise<void> {
    if (!isTodayLastBusinessDay()) {
      this.logger.debug('Hoje não é último dia útil — pulando geração.');
      return;
    }

    this.logger.log(
      'Último dia útil do mês — iniciando geração de faturas consolidadas...',
    );

    const now = nowInSaoPaulo();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const referenceMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Próximo mês para calcular vencimento
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dueDate = getNthBusinessDay(nextYear, nextMonth, 5);

    // Busca todos tenantIds distintos com subs ativas
    const tenantRows = await this.db
      .selectDistinct({ tenantId: subscriptions.tenantId })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const tenantIds = tenantRows.map((r) => r.tenantId);
    if (tenantIds.length === 0) {
      this.logger.log('Nenhum tenant com assinatura ativa.');
      return;
    }

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const tenantId of tenantIds) {
      try {
        // ── Deduplicação: já existe fatura para este mês? ──
        const existing = await this.invoiceRepo.findByTenantAndMonth(
          tenantId,
          referenceMonth,
        );
        if (existing) {
          skipped++;
          continue;
        }

        // ── Buscar assinaturas ativas do tenant ──
        const activeSubs =
          await this.subscriptionRepo.findActiveByTenantId(tenantId);

        if (activeSubs.length === 0) continue;

        // ── Buscar dados dos planos ──
        const planIds = activeSubs.map((s) => s.planId);
        const planRows = await this.db
          .select({
            id: toolPlans.id,
            name: toolPlans.name,
            price: toolPlans.price,
            toolId: toolPlans.toolId,
          })
          .from(toolPlans)
          .where(inArray(toolPlans.id, planIds));

        // Buscar nomes das ferramentas
        const toolIds = planRows.map((p) => p.toolId);
        const toolRows = await this.db
          .select({ id: tools.id, name: tools.name })
          .from(tools)
          .where(inArray(tools.id, toolIds));
        const toolMap = new Map(toolRows.map((t) => [t.id, t.name]));

        const planMap = new Map(
          planRows.map((p) => [
            p.id,
            {
              name: p.name,
              price: parseFloat(p.price),
              toolName: toolMap.get(p.toolId) ?? p.name,
            },
          ]),
        );

        // ── Gerar itens da fatura ──
        const items: InvoiceItemProps[] = [];
        let totalAmount = 0;

        for (const sub of activeSubs) {
          const plan = planMap.get(sub.planId);
          if (!plan) continue;

          // Pro-rata: se a assinatura começou neste mês
          const subStartMonth = sub.startDate.getMonth();
          const subStartYear = sub.startDate.getFullYear();
          const startedThisMonth =
            subStartYear === year && subStartMonth === month;

          let itemPrice: number;
          let description: string;

          if (startedThisMonth) {
            itemPrice = calculateMidCycleProRata(plan.price, sub.startDate);
            description = `${plan.toolName} — ${plan.name} (pro-rata ${referenceMonth})`;
          } else {
            itemPrice = plan.price;
            description = `${plan.toolName} — ${plan.name} (${referenceMonth})`;
          }

          if (itemPrice <= 0) continue;

          items.push({
            description,
            unitPrice: itemPrice,
            quantity: 1,
          });

          totalAmount += itemPrice;
        }

        if (items.length === 0 || totalAmount <= 0) continue;

        // Arredondar total
        totalAmount = Math.round(totalAmount * 100) / 100;

        // ── Criar fatura consolidada ──
        const invoice = Invoice.create({
          tenantId,
          subscriptionId: null,
          totalAmount,
          dueDate,
          referenceMonth,
          items,
        });

        await this.invoiceRepo.save(invoice);

        // Avançar billing date de cada sub
        for (const sub of activeSubs) {
          sub.advanceBillingDate();
          await this.subscriptionRepo.update(sub);
        }

        generated++;
      } catch (error: unknown) {
        errors++;
        const message = error instanceof Error ? error.message : 'Unknown';
        this.logger.error(
          `Erro gerando fatura consolidada para tenant ${tenantId}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Faturas geradas: ${generated}, Duplicadas ignoradas: ${skipped}, Erros: ${errors}`,
    );
  }
}
