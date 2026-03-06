import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { NotificationRepositoryPort } from '../../domain/ports/output/notification.repository.port.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type {
  PaymentConfirmedEvent,
  PaymentOverdueEvent,
  TenantSuspendedEvent,
} from '../../../billing/application/listeners/billing-event.handlers.js';

@Injectable()
export class NotificationEventHandlers {
  private readonly logger = new Logger(NotificationEventHandlers.name);

  constructor(
    @Inject('NotificationRepositoryPort')
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  @OnEvent('payment.confirmed')
  async onPaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    try {
      const notification = Notification.create({
        tenantId: event.tenantId,
        type: 'payment_confirmed',
        title: 'Pagamento confirmado',
        message: `Seu pagamento de R$ ${event.amount.toFixed(2).replace('.', ',')} foi confirmado com sucesso.`,
        metadata: { invoiceId: event.invoiceId, amount: event.amount },
      });

      await this.notificationRepo.save(notification);
      this.logger.log(`Notificação criada — payment.confirmed para tenant ${event.tenantId}`);
    } catch (error) {
      this.logger.error(`Erro ao criar notificação payment.confirmed: ${error}`);
    }
  }

  @OnEvent('payment.overdue')
  async onPaymentOverdue(event: PaymentOverdueEvent): Promise<void> {
    try {
      const days = event.daysOverdue ?? 0;
      const notification = Notification.create({
        tenantId: event.tenantId,
        type: 'payment_overdue',
        title: 'Fatura vencida',
        message: days > 0
          ? `Sua fatura está vencida há ${days} dia(s). Regularize para evitar suspensão.`
          : 'Sua fatura está vencida. Regularize o pagamento para evitar suspensão.',
        metadata: { invoiceId: event.invoiceId, daysOverdue: days },
      });

      await this.notificationRepo.save(notification);
      this.logger.log(`Notificação criada — payment.overdue para tenant ${event.tenantId}`);
    } catch (error) {
      this.logger.error(`Erro ao criar notificação payment.overdue: ${error}`);
    }
  }

  @OnEvent('tenant.suspended')
  async onTenantSuspended(event: TenantSuspendedEvent): Promise<void> {
    try {
      const notification = Notification.create({
        tenantId: event.tenantId,
        type: 'payment_overdue',
        title: 'Conta suspensa por inadimplência',
        message: `Sua conta foi suspensa após ${event.daysOverdue} dias de inadimplência. Regularize o pagamento para reativar o acesso.`,
        metadata: { invoiceId: event.invoiceId, daysOverdue: event.daysOverdue },
      });

      await this.notificationRepo.save(notification);
      this.logger.log(`Notificação criada — tenant.suspended para tenant ${event.tenantId}`);
    } catch (error) {
      this.logger.error(`Erro ao criar notificação tenant.suspended: ${error}`);
    }
  }

  @OnEvent('subscription.activated')
  async onSubscriptionActivated(event: {
    tenantId: string;
    toolName: string;
    planName: string;
  }): Promise<void> {
    try {
      const notification = Notification.create({
        tenantId: event.tenantId,
        type: 'subscription_activated',
        title: 'Assinatura ativada',
        message: `Sua assinatura do plano ${event.planName} da ferramenta ${event.toolName} foi ativada com sucesso!`,
        metadata: { toolName: event.toolName, planName: event.planName },
      });

      await this.notificationRepo.save(notification);
      this.logger.log(`Notificação criada — subscription.activated para tenant ${event.tenantId}`);
    } catch (error) {
      this.logger.error(`Erro ao criar notificação subscription.activated: ${error}`);
    }
  }
}
