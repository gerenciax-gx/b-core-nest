import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { NotificationRepositoryPort } from '../../domain/ports/output/notification.repository.port.js';
import type { EmailSenderPort } from '../../domain/ports/output/email-sender.port.js';
import type { NotificationPushPort } from '../../domain/ports/output/notification-push.port.js';
import type { UserRepositoryPort } from '../../../auth/domain/ports/output/user.repository.port.js';
import { Notification } from '../../domain/entities/notification.entity.js';
import type {
  PaymentConfirmedEvent,
  PaymentOverdueEvent,
  TenantSuspendedEvent,
} from '../../../billing/application/listeners/billing-event.handlers.js';
import {
  welcomeEmail,
  loginAlertEmail,
  paymentConfirmedEmail,
  paymentOverdueEmail,
  paymentRetryFailedEmail,
  trialExpiredEmail,
  collaboratorCredentialsEmail,
} from '../../infrastructure/adapters/secondary/email/email-templates.js';

@Injectable()
export class NotificationEventHandlers {
  private readonly logger = new Logger(NotificationEventHandlers.name);

  /** In-memory dedup cache for login alert emails: "userId:ip" → timestamp */
  private readonly loginEmailCache = new Map<string, number>();
  private static readonly LOGIN_EMAIL_DEDUP_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    @Inject('NotificationRepositoryPort')
    private readonly notificationRepo: NotificationRepositoryPort,

    @Inject('EmailSenderPort')
    private readonly emailSender: EmailSenderPort,

    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    @Inject('NotificationPushPort')
    private readonly wsGateway: NotificationPushPort,

    @Inject('FRONTEND_URL')
    private readonly frontendUrl: string,
  ) {}

  /** Returns the admin user email and name for a tenant */
  private async getTenantAdmin(tenantId: string): Promise<{ email: string; name: string } | null> {
    const users = await this.userRepo.findByTenantId(tenantId);
    const admin = users.find((u) => u.role === 'admin' && u.isActive);
    if (!admin) return null;
    return { email: admin.email, name: admin.name };
  }

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
      this.pushWs(notification);
      this.logger.log(`Notificação criada — payment.confirmed para tenant ${event.tenantId}`);

      // Send email
      const admin = await this.getTenantAdmin(event.tenantId);
      if (admin) {
        const amountStr = event.amount.toFixed(2).replace('.', ',');
        await this.emailSender.send({
          to: admin.email,
          subject: 'Pagamento confirmado — GerenciaX',
          html: paymentConfirmedEmail(admin.name, amountStr, ''),
        });
      }
    } catch (error) {
      this.logger.error('Erro ao criar notificação payment.confirmed', error instanceof Error ? error.stack : String(error));
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
      this.pushWs(notification);
      this.logger.log(`Notificação criada — payment.overdue para tenant ${event.tenantId}`);

      // Send email
      const admin = await this.getTenantAdmin(event.tenantId);
      if (admin) {
        const invoiceLink = `${this.frontendUrl}/billing/invoices`;
        await this.emailSender.send({
          to: admin.email,
          subject: 'Fatura vencida — GerenciaX',
          html: paymentOverdueEmail(admin.name, '—', '—', days, invoiceLink),
        });
      }
    } catch (error) {
      this.logger.error('Erro ao criar notificação payment.overdue', error instanceof Error ? error.stack : String(error));
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
      this.pushWs(notification);
      this.logger.log(`Notificação criada — tenant.suspended para tenant ${event.tenantId}`);

      // Send email
      const admin = await this.getTenantAdmin(event.tenantId);
      if (admin) {
        const invoiceLink = `${this.frontendUrl}/billing/invoices`;
        await this.emailSender.send({
          to: admin.email,
          subject: 'Conta suspensa por inadimplência — GerenciaX',
          html: paymentOverdueEmail(admin.name, '—', '—', event.daysOverdue, invoiceLink),
        });
      }
    } catch (error) {
      this.logger.error('Erro ao criar notificação tenant.suspended', error instanceof Error ? error.stack : String(error));
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
      this.pushWs(notification);
      this.logger.log(`Notificação criada — subscription.activated para tenant ${event.tenantId}`);
    } catch (error) {
      this.logger.error('Erro ao criar notificação subscription.activated', error instanceof Error ? error.stack : String(error));
    }
  }

  @OnEvent('user.signup')
  async onUserSignup(event: { userId: string; tenantId: string }): Promise<void> {
    try {
      const user = await this.userRepo.findById(event.userId);
      if (!user) return;

      const loginLink = `${this.frontendUrl}/login`;
      await this.emailSender.send({
        to: user.email,
        subject: 'Bem-vindo ao GerenciaX!',
        html: welcomeEmail(user.name, loginLink),
      });
      this.logger.log(`E-mail de boas-vindas enviado para ${user.email}`);
    } catch (error) {
      this.logger.error('Erro ao enviar e-mail de boas-vindas', error instanceof Error ? error.stack : String(error));
    }
  }

  @OnEvent('collaborator.created')
  async onCollaboratorCreated(event: {
    collaboratorId: string;
    userId: string;
    tenantId: string;
    temporaryPassword?: string;
    companyName?: string;
  }): Promise<void> {
    try {
      if (!event.temporaryPassword) return;

      const user = await this.userRepo.findById(event.userId);
      if (!user) return;

      const loginLink = `${this.frontendUrl}/login`;
      await this.emailSender.send({
        to: user.email,
        subject: 'Suas credenciais de acesso — GerenciaX',
        html: collaboratorCredentialsEmail(
          user.name,
          user.email,
          event.temporaryPassword,
          event.companyName ?? 'GerenciaX',
          loginLink,
        ),
      });
      this.logger.log(`E-mail de credenciais enviado para ${user.email}`);
    } catch (error) {
      this.logger.error('Erro ao enviar e-mail de credenciais', error instanceof Error ? error.stack : String(error));
    }
  }

  @OnEvent('user.login')
  async onUserLogin(event: {
    userId: string;
    tenantId: string;
    ip: string;
    device: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      // Dedup: skip if we already sent a login email for this user+IP within 1h
      const cacheKey = `${event.userId}:${event.ip}`;
      const lastSent = this.loginEmailCache.get(cacheKey);
      if (lastSent && Date.now() - lastSent < NotificationEventHandlers.LOGIN_EMAIL_DEDUP_MS) {
        this.logger.debug(`Login email dedup — skipping for ${cacheKey}`);
        return;
      }

      const user = await this.userRepo.findById(event.userId);
      if (!user) return;

      const now = new Date();
      const dateTime = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const revokeLink = `${this.frontendUrl}/settings/security`;

      await this.emailSender.send({
        to: user.email,
        subject: 'Novo login detectado na sua conta — GerenciaX',
        html: loginAlertEmail(user.name, event.ip, event.device, dateTime, revokeLink),
      });

      this.loginEmailCache.set(cacheKey, Date.now());
      this.logger.log(`E-mail de alerta de login enviado para ${user.email} (IP: ${event.ip})`);
    } catch (error) {
      this.logger.error('Erro ao enviar e-mail de alerta de login', error instanceof Error ? error.stack : String(error));
    }
  }

  @OnEvent('payment.retry.failed')
  async onPaymentRetryFailed(event: {
    invoiceId: string;
    tenantId: string;
    retryCount: number;
    referenceMonth: string;
    reason: string;
  }): Promise<void> {
    try {
      const maxRetries = 3;
      const remaining = maxRetries - event.retryCount;
      const notification = Notification.create({
        tenantId: event.tenantId,
        type: 'payment_overdue',
        title: 'Tentativa de cobrança falhou',
        message: remaining > 0
          ? `Tentativa #${event.retryCount} falhou. Restam ${remaining} antes da suspensão.`
          : 'Sua conta foi suspensa por inadimplência após 3 tentativas de cobrança.',
        metadata: {
          invoiceId: event.invoiceId,
          retryCount: event.retryCount,
          reason: event.reason,
        },
      });

      await this.notificationRepo.save(notification);
      this.pushWs(notification);

      const admin = await this.getTenantAdmin(event.tenantId);
      if (admin) {
        const invoiceLink = `${this.frontendUrl}/billing/invoices`;
        await this.emailSender.send({
          to: admin.email,
          subject: remaining > 0
            ? `Tentativa de cobrança #${event.retryCount} falhou — GerenciaX`
            : 'Conta suspensa por inadimplência — GerenciaX',
          html: paymentRetryFailedEmail(
            admin.name,
            event.referenceMonth,
            event.retryCount,
            maxRetries,
            invoiceLink,
          ),
        });
      }
    } catch (error) {
      this.logger.error('Erro ao processar payment.retry.failed', error instanceof Error ? error.stack : String(error));
    }
  }

  @OnEvent('trial.expired')
  async onTrialExpired(event: {
    tenantId: string;
    subscriptionId: string;
    toolId: string | null;
    toolName: string;
    toolSlug: string;
  }): Promise<void> {
    try {
      const notification = Notification.create({
        tenantId: event.tenantId,
        type: 'trial_expired',
        title: 'Período de teste encerrado',
        message: `O período de teste da ferramenta ${event.toolName} acabou. Contrate um plano para continuar usando.`,
        metadata: {
          toolId: event.toolId,
          toolName: event.toolName,
          toolSlug: event.toolSlug,
          action: 'trial_expired',
        },
      });

      await this.notificationRepo.save(notification);
      this.pushWs(notification);

      const admin = await this.getTenantAdmin(event.tenantId);
      if (admin) {
        const toolPlansLink = `${this.frontendUrl}/marketplace/tools/${event.toolSlug || event.toolId}`;
        await this.emailSender.send({
          to: admin.email,
          subject: `Período de teste de ${event.toolName} encerrado — GerenciaX`,
          html: trialExpiredEmail(
            admin.name,
            event.toolName,
            toolPlansLink,
          ),
        });
      }

      this.logger.log(`trial.expired — tenant ${event.tenantId}, tool ${event.toolName}`);
    } catch (error) {
      this.logger.error('Erro ao processar trial.expired', error instanceof Error ? error.stack : String(error));
    }
  }

  /** Push notification to WebSocket clients of the tenant */
  private pushWs(notification: Notification): void {
    try {
      this.wsGateway.pushNotification(notification.tenantId, {
        id: notification.id,
        tenantId: notification.tenantId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      this.logger.warn('Erro ao enviar WS push', error instanceof Error ? error.stack : String(error));
    }
  }
}
