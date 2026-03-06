import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  BillingUseCasePort,
  PayInvoiceResult,
  PayInvoiceInput,
  AsaasWebhookPayload,
  InvoiceSummary,
  InvoiceDetail,
  SubscriptionSummary,
  BillingInfoSummary,
} from '../../domain/ports/input/billing.usecase.port.js';
import type {
  InvoiceRepositoryPort,
  InvoiceFilters,
} from '../../domain/ports/output/invoice.repository.port.js';
import type { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port.js';
import type {
  PaymentGatewayPort,
  CreateChargeInput,
} from '../../domain/ports/output/payment-gateway.port.js';
import type { BillingInfoRepositoryPort } from '../../domain/ports/output/billing-info.repository.port.js';
import type { PaymentLogRepositoryPort } from '../../domain/ports/output/payment-log.repository.port.js';
import type { Invoice } from '../../domain/entities/invoice.entity.js';
import { BillingInfo } from '../../domain/entities/billing-info.entity.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class BillingService implements BillingUseCasePort {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,

    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    @Inject('PaymentGatewayPort')
    private readonly paymentGateway: PaymentGatewayPort,

    @Inject('BillingInfoRepositoryPort')
    private readonly billingInfoRepo: BillingInfoRepositoryPort,

    @Inject('PaymentLogRepositoryPort')
    private readonly paymentLogRepo: PaymentLogRepositoryPort,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Pay Invoice ────────────────────────────────────────────
  async payInvoice(
    tenantId: string,
    invoiceId: string,
    dto: PayInvoiceInput,
  ): Promise<PayInvoiceResult> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status !== 'pending' && invoice.status !== 'overdue') {
      throw new BadRequestException(
        'Fatura não está disponível para pagamento',
      );
    }

    const billingInfo = await this.billingInfoRepo.findByTenantId(tenantId);
    if (!billingInfo?.customerExternalId) {
      throw new BadRequestException('Dados de cobrança não configurados');
    }

    const chargeInput: CreateChargeInput = {
      customer: billingInfo.customerExternalId,
      billingType: dto.paymentMethod.toUpperCase() as CreateChargeInput['billingType'],
      value: invoice.totalAmount.amount,
      dueDate: this.formatDate(invoice.dueDate),
      description: `Fatura ${invoice.referenceMonth}`,
      externalReference: invoice.id,
    };

    // Credit card with stored token
    if (dto.paymentMethod === 'credit_card') {
      if (invoice.subscriptionId) {
        const subscription = await this.subscriptionRepo.findById(
          invoice.subscriptionId,
        );
        if (dto.useStoredCard && subscription?.cardToken) {
          chargeInput.creditCardToken = subscription.cardToken;
        } else if (dto.creditCard) {
          chargeInput.creditCard = dto.creditCard;
        }
      } else if (dto.creditCard) {
        chargeInput.creditCard = dto.creditCard;
      }
    }

    const result = await this.paymentGateway.createCharge(chargeInput);

    // ── Registrar PaymentLog ──
    await this.paymentLogRepo.save({
      invoiceId: invoice.id,
      gateway: 'asaas',
      method: dto.paymentMethod as 'pix' | 'boleto' | 'credit_card' | 'debit_card',
      externalId: result.id,
      status: result.status,
      amount: invoice.totalAmount.amount,
      rawPayload: result,
    });

    invoice.setExternalPaymentData({
      externalId: result.id,
      externalUrl: result.invoiceUrl,
      pixQrCode: result.pixQrCodeBase64,
      pixCopyPaste: result.pixCopyPaste,
      boletoUrl: result.bankSlipUrl,
    });
    await this.invoiceRepo.update(invoice);

    // Save card token if requested (BIL-008: only token, never full card)
    if (
      dto.paymentMethod === 'credit_card' &&
      dto.saveCard &&
      result.creditCardToken &&
      invoice.subscriptionId
    ) {
      const subscription = await this.subscriptionRepo.findById(
        invoice.subscriptionId,
      );
      if (subscription) {
        subscription.setCardToken(
          result.creditCardToken,
          dto.creditCard?.number?.slice(-4) ?? '****',
          'visa',
        );
        await this.subscriptionRepo.update(subscription);
      }
    }

    return {
      invoiceId: invoice.id,
      status: invoice.status,
      externalUrl: result.invoiceUrl ?? null,
      pixQrCode: result.pixQrCodeBase64 ?? null,
      pixCopyPaste: result.pixCopyPaste ?? null,
      boletoUrl: result.bankSlipUrl ?? null,
      boletoBarcode: null,
    };
  }

  // ── Process Webhook (BIL-007: always succeed) ──────────────
  async processWebhook(payload: AsaasWebhookPayload): Promise<void> {
    const invoice = await this.invoiceRepo.findByExternalId(
      payload.payment.id,
    );
    if (!invoice) return; // Ignore unknown payments

    // ── Registrar PaymentLog para cada evento ──
    await this.paymentLogRepo.save({
      invoiceId: invoice.id,
      gateway: 'asaas',
      method: null,
      externalId: payload.payment.id,
      status: payload.payment.status,
      amount: payload.payment.value,
      rawPayload: payload,
    });

    switch (payload.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        invoice.confirmPayment(new Date(payload.payment.confirmedDate));
        await this.invoiceRepo.update(invoice);

        // Reactivar todas as subs do tenant se estavam past_due
        const tenantSubs = await this.subscriptionRepo.findByTenantId(
          invoice.tenantId,
        );
        for (const sub of tenantSubs) {
          if (sub.status === 'past_due') {
            sub.reactivate();
            await this.subscriptionRepo.update(sub);
          }
        }

        this.eventEmitter.emit('payment.confirmed', {
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
          amount: invoice.totalAmount.amount,
        });
        break;
      }

      case 'PAYMENT_OVERDUE':
        if (invoice.status === 'pending') {
          invoice.markAsOverdue();
          await this.invoiceRepo.update(invoice);
          this.eventEmitter.emit('payment.overdue', {
            invoiceId: invoice.id,
            tenantId: invoice.tenantId,
          });
        }
        break;

      case 'PAYMENT_REFUNDED':
        invoice.refund();
        await this.invoiceRepo.update(invoice);
        break;
    }
  }

  // ── Get Invoices by Tenant ─────────────────────────────────
  async getInvoicesByTenant(
    tenantId: string,
    filters?: InvoiceFilters,
  ): Promise<{ data: InvoiceSummary[]; total: number }> {
    const result = await this.invoiceRepo.findByTenant(tenantId, filters);
    return {
      data: result.data.map((inv) => this.toInvoiceSummary(inv)),
      total: result.total,
    };
  }

  // ── Get Invoice by ID ──────────────────────────────────────
  async getInvoiceById(
    tenantId: string,
    invoiceId: string,
  ): Promise<InvoiceDetail> {
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Fatura não encontrada');
    }
    return this.toInvoiceDetail(invoice);
  }

  // ── Get Subscriptions by Tenant ────────────────────────────
  async getSubscriptionsByTenant(
    tenantId: string,
  ): Promise<SubscriptionSummary[]> {
    const subs = await this.subscriptionRepo.findByTenantId(tenantId);
    return subs.map((s) => ({
      id: s.id,
      planId: s.planId,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      nextBillingDate: s.nextBillingDate,
      cancelledAt: s.cancelledAt,
      cancelReason: s.cancelReason,
      preferredPaymentMethod: s.preferredPaymentMethod,
      cardLast4: s.cardLast4,
      cardBrand: s.cardBrand,
      createdAt: s.createdAt,
    }));
  }

  // ── Cancel Subscription (BIL-011: admin only) ──────────────
  async cancelSubscription(
    tenantId: string,
    subscriptionId: string,
    reason: string,
  ): Promise<void> {
    const subscription = await this.subscriptionRepo.findById(subscriptionId);
    if (!subscription || subscription.tenantId !== tenantId) {
      throw new NotFoundException('Assinatura não encontrada');
    }
    subscription.cancel(reason);
    await this.subscriptionRepo.update(subscription);
  }

  // ── Get Billing Info ───────────────────────────────────────
  async getBillingInfo(tenantId: string): Promise<BillingInfoSummary | null> {
    const info = await this.billingInfoRepo.findByTenantId(tenantId);
    if (!info) return null;
    return this.toBillingInfoSummary(info);
  }

  // ── Update Billing Info ────────────────────────────────────
  async updateBillingInfo(
    tenantId: string,
    data: {
      document: string;
      name: string;
      email: string;
      phone?: string;
      addressStreet?: string;
      addressNumber?: string;
      addressComplement?: string;
      addressNeighborhood?: string;
      addressCity?: string;
      addressState?: string;
      addressZipCode?: string;
    },
  ): Promise<BillingInfoSummary> {
    let info = await this.billingInfoRepo.findByTenantId(tenantId);

    if (!info) {
      // Create new billing info and customer in Asaas
      info = new BillingInfo(
        randomUUID(),
        tenantId,
        null,
        data.document,
        data.name,
        data.email,
        data.phone ?? null,
        data.addressStreet ?? null,
        data.addressNumber ?? null,
        data.addressComplement ?? null,
        data.addressNeighborhood ?? null,
        data.addressCity ?? null,
        data.addressState ?? null,
        data.addressZipCode ?? null,
        new Date(),
        new Date(),
      );

      // Create customer in Asaas
      const customer = await this.paymentGateway.createCustomer({
        name: data.name,
        email: data.email,
        cpfCnpj: data.document,
        phone: data.phone,
        address: data.addressStreet
          ? {
              street: data.addressStreet,
              number: data.addressNumber ?? '',
              complement: data.addressComplement,
              neighborhood: data.addressNeighborhood ?? '',
              city: data.addressCity ?? '',
              state: data.addressState ?? '',
              zipCode: data.addressZipCode ?? '',
            }
          : undefined,
      });

      info.setCustomerExternalId(customer.id);
      await this.billingInfoRepo.save(info);
    } else {
      info.update(data);
      await this.billingInfoRepo.update(info);
    }

    return this.toBillingInfoSummary(info);
  }

  // ── Mappers ────────────────────────────────────────────────

  private toInvoiceSummary(invoice: Invoice): InvoiceSummary {
    return {
      id: invoice.id,
      subscriptionId: invoice.subscriptionId,
      status: invoice.status,
      totalAmount: invoice.totalAmount.amount,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      referenceMonth: invoice.referenceMonth,
      externalUrl: invoice.externalUrl,
      createdAt: invoice.createdAt,
    };
  }

  private toInvoiceDetail(invoice: Invoice): InvoiceDetail {
    return {
      ...this.toInvoiceSummary(invoice),
      externalId: invoice.externalId,
      pixQrCode: invoice.pixQrCode,
      pixCopyPaste: invoice.pixCopyPaste,
      boletoUrl: invoice.boletoUrl,
      boletoBarcode: invoice.boletoBarcode,
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        unitPrice: item.unitPrice.amount,
        quantity: item.quantity,
        totalPrice: item.totalPrice.amount,
      })),
    };
  }

  private toBillingInfoSummary(info: BillingInfo): BillingInfoSummary {
    return {
      id: info.id,
      tenantId: info.tenantId,
      customerExternalId: info.customerExternalId,
      document: info.document,
      name: info.name,
      email: info.email,
      phone: info.phone,
      addressStreet: info.addressStreet,
      addressNumber: info.addressNumber,
      addressComplement: info.addressComplement,
      addressNeighborhood: info.addressNeighborhood,
      addressCity: info.addressCity,
      addressState: info.addressState,
      addressZipCode: info.addressZipCode,
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }
}
