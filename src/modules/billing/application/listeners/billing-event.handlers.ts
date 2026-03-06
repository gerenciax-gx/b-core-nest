import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export interface PaymentConfirmedEvent {
  invoiceId: string;
  tenantId: string;
  amount: number;
}

export interface PaymentOverdueEvent {
  invoiceId: string;
  tenantId: string;
  daysOverdue?: number;
}

export interface TenantSuspendedEvent {
  tenantId: string;
  invoiceId: string;
  daysOverdue: number;
}

@Injectable()
export class BillingEventHandlers {
  private readonly logger = new Logger(BillingEventHandlers.name);

  @OnEvent('payment.confirmed')
  handlePaymentConfirmed(event: PaymentConfirmedEvent): void {
    this.logger.log(
      `Pagamento confirmado — tenant: ${event.tenantId}, fatura: ${event.invoiceId}, valor: R$ ${event.amount}`,
    );
    // Aqui pode-se disparar notificação, e-mail, etc.
  }

  @OnEvent('payment.overdue')
  handlePaymentOverdue(event: PaymentOverdueEvent): void {
    this.logger.warn(
      `Fatura vencida — tenant: ${event.tenantId}, fatura: ${event.invoiceId}, dias: ${event.daysOverdue ?? 0}`,
    );
    // Aqui pode-se disparar notificação push / e-mail de lembrete
  }

  @OnEvent('tenant.suspended')
  handleTenantSuspended(event: TenantSuspendedEvent): void {
    this.logger.warn(
      `Tenant SUSPENSO por inadimplência — tenant: ${event.tenantId}, dias: ${event.daysOverdue}`,
    );
    // Aqui pode-se enviar e-mail de bloqueio, webhook interno, etc.
  }
}
