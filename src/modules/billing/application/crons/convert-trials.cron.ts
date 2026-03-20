import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { EventBusPort } from '../../../../common/types/event-bus.port.js';
import type { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port.js';
import type { MarketplaceRepositoryPort } from '../../../marketplace/domain/ports/output/marketplace.repository.port.js';
import { SAO_PAULO_TZ } from '../../../../common/helpers/business-day.helper.js';

@Injectable()
export class ConvertTrialsCron {
  private readonly logger = new Logger(ConvertTrialsCron.name);

  constructor(
    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    @Inject('MarketplaceRepositoryPort')
    private readonly marketplaceRepo: MarketplaceRepositoryPort,

    @Inject('EventBusPort')
    private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Executa diariamente às 07:00 (São Paulo).
   * Trials expirados:
   *  - Billing: cancela a subscription
   *  - Marketplace: cancela a subscription + emite trial.expired (e-mail + popup)
   * O usuário NÃO é contratado automaticamente — perde acesso e é notificado.
   */
  @Cron('0 7 * * *', { timeZone: SAO_PAULO_TZ })
  async execute(): Promise<void> {
    this.logger.log('Verificando trials expirados...');
    await this.expireBillingTrials();
    await this.expireMarketplaceTrials();
  }

  private async expireBillingTrials(): Promise<void> {
    const expiredTrials = await this.subscriptionRepo.findExpiredTrials();
    if (expiredTrials.length === 0) return;

    let cancelled = 0;
    for (const sub of expiredTrials) {
      try {
        sub.cancel('trial_expired');
        await this.subscriptionRepo.update(sub);
        cancelled++;
      } catch (error) {
        this.logger.error(`Erro ao expirar trial billing ${sub.id}: ${error}`);
      }
    }
    this.logger.log(`Billing trials expirados: ${cancelled}`);
  }

  private async expireMarketplaceTrials(): Promise<void> {
    const expired = await this.marketplaceRepo.findExpiredTrialSubscriptions();
    if (expired.length === 0) return;

    let cancelled = 0;
    for (const sub of expired) {
      try {
        await this.marketplaceRepo.cancelSubscription(sub.id);
        cancelled++;

        // Buscar tool info para o evento
        const plan = await this.marketplaceRepo.findPlanById(sub.planId);
        const tool = plan
          ? await this.marketplaceRepo.findToolByPlanId(sub.planId)
          : null;

        this.eventBus.emit('trial.expired', {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          toolId: tool?.id ?? null,
          toolName: tool?.name ?? 'Ferramenta',
          toolSlug: tool?.slug ?? '',
        });

        this.logger.log(
          `Trial marketplace expirado — subscription ${sub.id}, tenant ${sub.tenantId}, tool ${tool?.name ?? '?'}`,
        );
      } catch (error) {
        this.logger.error(`Erro ao expirar trial marketplace ${sub.id}: ${error}`);
      }
    }
    this.logger.log(`Marketplace trials expirados: ${cancelled}`);
  }
}
