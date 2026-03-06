import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port.js';
import type { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port.js';
import type { PaymentGatewayPort } from '../../domain/ports/output/payment-gateway.port.js';
import type { BillingInfoRepositoryPort } from '../../domain/ports/output/billing-info.repository.port.js';
import { SAO_PAULO_TZ } from '../../../../common/helpers/business-day.helper.js';

@Injectable()
export class AutoChargeCron {
  private readonly logger = new Logger(AutoChargeCron.name);

  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,

    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    @Inject('PaymentGatewayPort')
    private readonly paymentGateway: PaymentGatewayPort,

    @Inject('BillingInfoRepositoryPort')
    private readonly billingInfoRepo: BillingInfoRepositoryPort,
  ) {}

  /**
   * BIL-006: Executa dia 5 de cada mês às 07:00
   * Cobra faturas pendentes de assinaturas com cartão salvo
   */
  @Cron('0 7 5 * *', { timeZone: SAO_PAULO_TZ })
  async execute(): Promise<void> {
    this.logger.log('Iniciando cobrança automática...');

    // Cobrar faturas cujo vencimento é em até 7 dias
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pendingInvoices =
      await this.invoiceRepo.findPendingByDueDate(dueDate);

    let charged = 0;
    let skipped = 0;

    for (const invoice of pendingInvoices) {
      try {
        if (!invoice.subscriptionId) {
          // Fatura consolidada — sem cartão vinculado diretamente
          skipped++;
          continue;
        }

        const subscription = await this.subscriptionRepo.findById(
          invoice.subscriptionId,
        );
        if (!subscription?.cardToken) {
          skipped++;
          continue;
        }

        const billingInfo = await this.billingInfoRepo.findByTenantId(
          invoice.tenantId,
        );
        if (!billingInfo?.customerExternalId) {
          skipped++;
          continue;
        }

        const result = await this.paymentGateway.createCharge({
          customer: billingInfo.customerExternalId,
          billingType: 'CREDIT_CARD',
          value: invoice.totalAmount.amount,
          dueDate: invoice.dueDate.toISOString().split('T')[0]!,
          description: `Fatura ${invoice.referenceMonth} - Cobrança automática`,
          externalReference: invoice.id,
          creditCardToken: subscription.cardToken,
        });

        invoice.setExternalPaymentData({
          externalId: result.id,
          externalUrl: result.invoiceUrl,
        });
        await this.invoiceRepo.update(invoice);

        charged++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown';
        this.logger.error(
          `Erro cobrando invoice ${invoice.id}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Auto-charge: cobrados ${charged}, ignorados ${skipped}`,
    );
  }
}
