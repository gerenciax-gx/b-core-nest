import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { EventBusPort } from '../../../../common/types/event-bus.port.js';
import type { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port.js';
import type { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port.js';
import type { PaymentGatewayPort } from '../../domain/ports/output/payment-gateway.port.js';
import type { BillingInfoRepositoryPort } from '../../domain/ports/output/billing-info.repository.port.js';
import { SAO_PAULO_TZ } from '../../../../common/helpers/business-day.helper.js';

@Injectable()
export class DunningRetryCron {
  private readonly logger = new Logger(DunningRetryCron.name);

  /** Número máximo de tentativas antes de suspender */
  private static readonly MAX_RETRIES = 3;

  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,

    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    @Inject('PaymentGatewayPort')
    private readonly paymentGateway: PaymentGatewayPort,

    @Inject('BillingInfoRepositoryPort')
    private readonly billingInfoRepo: BillingInfoRepositoryPort,

    @Inject('EventBusPort')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Dunning: Executa nos dias 7, 10 e 13 de cada mês às 09:00 (São Paulo).
   * Tenta cobrar faturas vencidas (overdue) com retryCount < 3.
   * Após 3 falhas, suspende o tenant.
   */
  @Cron('0 9 7,10,13 * *', { timeZone: SAO_PAULO_TZ })
  async execute(): Promise<void> {
    this.logger.log('Iniciando dunning (retry de cobrança)...');

    const overdueInvoices = await this.invoiceRepo.findOverdueForRetry(
      DunningRetryCron.MAX_RETRIES,
    );

    let retried = 0;
    let paid = 0;
    let failed = 0;

    for (const invoice of overdueInvoices) {
      try {
        if (!invoice.subscriptionId) {
          continue;
        }

        const subscription = await this.subscriptionRepo.findById(
          invoice.subscriptionId,
        );
        if (!subscription?.cardToken) {
          // Sem cartão — incrementa retry e notifica
          invoice.incrementRetry();
          await this.invoiceRepo.update(invoice);
          this.emitRetryFailed(invoice, 'Sem cartão de crédito cadastrado');
          failed++;
          await this.checkSuspension(invoice);
          continue;
        }

        const billingInfo = await this.billingInfoRepo.findByTenantId(
          invoice.tenantId,
        );
        if (!billingInfo?.customerExternalId) {
          invoice.incrementRetry();
          await this.invoiceRepo.update(invoice);
          this.emitRetryFailed(invoice, 'Customer não encontrado no gateway');
          failed++;
          await this.checkSuspension(invoice);
          continue;
        }

        // Tenta cobrar via gateway
        const result = await this.paymentGateway.createCharge({
          customer: billingInfo.customerExternalId,
          billingType: 'CREDIT_CARD',
          value: invoice.totalAmount.amount,
          dueDate: new Date().toISOString().split('T')[0]!,
          description: `Fatura ${invoice.referenceMonth} - Retry #${invoice.retryCount + 1}`,
          externalReference: invoice.id,
          creditCardToken: subscription.cardToken,
        });

        // Sucesso — confirma pagamento
        invoice.setExternalPaymentData({
          externalId: result.id,
          externalUrl: result.invoiceUrl,
        });
        invoice.confirmPayment(new Date());
        await this.invoiceRepo.update(invoice);

        this.eventBus.emit('payment.confirmed', {
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
        });

        // Reativar assinatura se estava past_due
        if (subscription.status === 'past_due') {
          subscription.reactivate();
          await this.subscriptionRepo.update(subscription);
        }

        paid++;
        retried++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown';
        this.logger.error(
          `Retry falhou para invoice ${invoice.id}: ${message}`,
        );

        invoice.incrementRetry();
        await this.invoiceRepo.update(invoice);
        this.emitRetryFailed(invoice, message);
        failed++;
        await this.checkSuspension(invoice);
        retried++;
      }
    }

    this.logger.log(
      `Dunning: ${retried} tentativas, ${paid} pagos, ${failed} falharam`,
    );
  }

  private emitRetryFailed(
    invoice: { id: string; tenantId: string; retryCount: number; referenceMonth: string },
    reason: string,
  ): void {
    this.eventBus.emit('payment.retry.failed', {
      invoiceId: invoice.id,
      tenantId: invoice.tenantId,
      retryCount: invoice.retryCount,
      referenceMonth: invoice.referenceMonth,
      reason,
    });
  }

  /** Após 3 falhas, suspende o tenant */
  private async checkSuspension(
    invoice: { id: string; tenantId: string; retryCount: number },
  ): Promise<void> {
    if (invoice.retryCount < DunningRetryCron.MAX_RETRIES) return;

    this.logger.warn(
      `Tenant ${invoice.tenantId} atingiu ${DunningRetryCron.MAX_RETRIES} falhas — suspendendo`,
    );

    const subs = await this.subscriptionRepo.findActiveByTenantId(
      invoice.tenantId,
    );

    for (const sub of subs) {
      sub.markPastDue();
      await this.subscriptionRepo.update(sub);
    }

    this.eventBus.emit('tenant.suspended', {
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      reason: 'dunning_max_retries',
    });
  }
}
