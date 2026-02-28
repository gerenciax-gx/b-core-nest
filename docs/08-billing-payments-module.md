# 08. Módulo Billing & Payments

> **Gateway:** Asaas API v3  
> **Métodos:** PIX automático, Boleto, Cartão de Crédito, Cartão de Débito  
> **Recorrência:** Backend gera faturas mensalmente via CRON, cobra via Asaas  
> **Regra principal:** O sistema GERENCIA faturas e assinaturas. Asaas EXECUTA cobranças.

---

## TL;DR para IA

<constraints>

**Regras invioláveis deste módulo:**
1. 🚫 **PROIBIDO** armazenar número completo do cartão — apenas token (BIL-009)
2. 🚫 Webhook retorna 200 **SEMPRE** (mesmo com erro interno) — evitar retry infinito (BIL-007)
3. 🚫 Backend é o DONO da fatura — Asaas apenas EXECUTA cobranças (BIL-001)
4. 🚫 Webhook validado por token secreto `ASAAS_WEBHOOK_TOKEN` (BIL-013)
5. 🚫 Cancelamento de assinatura: apenas admin (BIL-011)

**Invoice lifecycle:** PENDING → PAID | OVERDUE → PAID | CANCELLED | REFUNDED

**3 CRONs:**
- Dia 1 às 06:00 → Gera faturas do mês (BIL-004)
- Diário às 08:00 → Marca vencidas como OVERDUE (BIL-005)
- Dia 5 às 07:00 → Auto-charge cartão salvo (BIL-006)

**Padrão de pagamento:**
- PIX: retornar QR Code + copy-paste (BIL-014)
- Boleto: retornar URL + código de barras (BIL-015)
- Cartão: tokenizar via Asaas, salvar token na subscription (BIL-008)

</constraints>

---

## 1. Ciclo de Vida da Fatura

```
┌──────────────────────────────────────────────────────────────┐
│                     INVOICE LIFECYCLE                         │
│                                                               │
│   ┌─────────┐    ┌─────────┐    ┌────────┐    ┌──────────┐  │
│   │ PENDING │───>│ PAID    │    │OVERDUE │───>│CANCELLED │  │
│   │         │    │         │    │        │    │          │  │
│   └────┬────┘    └─────────┘    └───┬────┘    └──────────┘  │
│        │                            │                        │
│        │  (dueDate passed)          │  (paid after overdue)  │
│        └────────────>OVERDUE────────┘──────>PAID             │
│                                                               │
│   Fluxo:                                                      │
│   1. CRON gera invoice (status: pending)                      │
│   2. CRON envia cobrança ao Asaas                             │
│   3. Webhook confirma pagamento → pending → paid              │
│   4. Se venceu sem pagar → pending → overdue                  │
│   5. Se pagou após vencer → overdue → paid                    │
│   6. Admin pode cancelar → cancelled                          │
│   7. Reembolso → paid → refunded                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Domain Layer

### 2.1 Invoice Entity

```typescript
// src/modules/billing/domain/entities/invoice.entity.ts
import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { Money } from '../value-objects/money.vo';

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface CreateInvoiceProps {
  tenantId: string;
  subscriptionId: string;
  totalAmount: number;
  dueDate: Date;
  referenceMonth: string; // "2026-03"
  items: InvoiceItemProps[];
}

export interface InvoiceItemProps {
  description: string;
  unitPrice: number;
  quantity: number;
}

export class Invoice {
  private _items: InvoiceItem[] = [];

  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly subscriptionId: string,
    private _status: InvoiceStatus,
    private _totalAmount: Money,
    private _dueDate: Date,
    private _paidAt: Date | null,
    private _externalId: string | null,
    private _externalUrl: string | null,
    private _pixQrCode: string | null,
    private _pixCopyPaste: string | null,
    private _boletoUrl: string | null,
    private _boletoBarcode: string | null,
    public readonly referenceMonth: string,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateInvoiceProps): Invoice {
    const totalAmount = Money.create(props.totalAmount);
    const invoice = new Invoice(
      randomUUID(),
      props.tenantId,
      props.subscriptionId,
      'pending',
      totalAmount,
      props.dueDate,
      null, null, null, null, null, null, null,
      props.referenceMonth,
      new Date(),
      new Date(),
    );

    // Criar items
    for (const item of props.items) {
      invoice.addItem(item);
    }

    return invoice;
  }

  // --- Getters ---
  get status(): InvoiceStatus { return this._status; }
  get totalAmount(): Money { return this._totalAmount; }
  get dueDate(): Date { return this._dueDate; }
  get paidAt(): Date | null { return this._paidAt; }
  get externalId(): string | null { return this._externalId; }
  get externalUrl(): string | null { return this._externalUrl; }
  get pixQrCode(): string | null { return this._pixQrCode; }
  get pixCopyPaste(): string | null { return this._pixCopyPaste; }
  get boletoUrl(): string | null { return this._boletoUrl; }
  get items(): InvoiceItem[] { return [...this._items]; }

  // --- Behaviors ---
  confirmPayment(paidAt: Date): void {
    if (this._status === 'paid') {
      throw new DomainException('Fatura já está paga');
    }
    if (this._status === 'cancelled') {
      throw new DomainException('Não é possível confirmar fatura cancelada');
    }
    if (this._status === 'refunded') {
      throw new DomainException('Não é possível confirmar fatura reembolsada');
    }
    this._status = 'paid';
    this._paidAt = paidAt;
    this._updatedAt = new Date();
  }

  markAsOverdue(): void {
    if (this._status !== 'pending') {
      throw new DomainException('Apenas faturas pendentes podem ser marcadas como vencidas');
    }
    this._status = 'overdue';
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === 'paid') {
      throw new DomainException('Não é possível cancelar fatura paga. Use reembolso');
    }
    this._status = 'cancelled';
    this._updatedAt = new Date();
  }

  refund(): void {
    if (this._status !== 'paid') {
      throw new DomainException('Apenas faturas pagas podem ser reembolsadas');
    }
    this._status = 'refunded';
    this._updatedAt = new Date();
  }

  setExternalPaymentData(data: {
    externalId: string;
    externalUrl?: string;
    pixQrCode?: string;
    pixCopyPaste?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
  }): void {
    this._externalId = data.externalId;
    this._externalUrl = data.externalUrl ?? null;
    this._pixQrCode = data.pixQrCode ?? null;
    this._pixCopyPaste = data.pixCopyPaste ?? null;
    this._boletoUrl = data.boletoUrl ?? null;
    this._boletoBarcode = data.boletoBarcode ?? null;
    this._updatedAt = new Date();
  }

  isOverdue(): boolean {
    return this._status === 'pending' && new Date() > this._dueDate;
  }

  getDaysOverdue(): number {
    if (!this.isOverdue() && this._status !== 'overdue') return 0;
    const diffMs = Date.now() - this._dueDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  addItem(props: InvoiceItemProps): void {
    const item = new InvoiceItem(
      randomUUID(),
      this.id,
      props.description,
      Money.create(props.unitPrice),
      props.quantity,
      Money.create(props.unitPrice * props.quantity),
    );
    this._items.push(item);
  }
}

export class InvoiceItem {
  constructor(
    public readonly id: string,
    public readonly invoiceId: string,
    public readonly description: string,
    public readonly unitPrice: Money,
    public readonly quantity: number,
    public readonly totalPrice: Money,
  ) {}
}
```

### 2.2 Subscription Entity

```typescript
// src/modules/billing/domain/entities/subscription.entity.ts
import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export interface CreateSubscriptionProps {
  tenantId: string;
  planId: string;
  startDate: Date;
  trialDays?: number;
}

export class Subscription {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly planId: string,
    private _status: SubscriptionStatus,
    private _startDate: Date,
    private _endDate: Date | null,
    private _nextBillingDate: Date,
    private _cancelledAt: Date | null,
    private _cancelReason: string | null,
    private _cardToken: string | null,
    private _cardLast4: string | null,
    private _cardBrand: string | null,
    private _preferredPaymentMethod: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateSubscriptionProps): Subscription {
    const startDate = props.startDate;
    const nextBillingDate = new Date(startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const status: SubscriptionStatus = props.trialDays && props.trialDays > 0
      ? 'trialing'
      : 'active';

    return new Subscription(
      randomUUID(),
      props.tenantId,
      props.planId,
      status,
      startDate,
      null,
      nextBillingDate,
      null, null,
      null, null, null, null,
      new Date(),
      new Date(),
    );
  }

  // --- Getters ---
  get status(): SubscriptionStatus { return this._status; }
  get nextBillingDate(): Date { return this._nextBillingDate; }
  get cardToken(): string | null { return this._cardToken; }
  get cardLast4(): string | null { return this._cardLast4; }
  get preferredPaymentMethod(): string | null { return this._preferredPaymentMethod; }

  // --- Behaviors ---
  cancel(reason: string): void {
    if (this._status === 'cancelled') {
      throw new DomainException('Assinatura já está cancelada');
    }
    this._status = 'cancelled';
    this._cancelledAt = new Date();
    this._cancelReason = reason;
    this._endDate = new Date();
    this._updatedAt = new Date();
  }

  markPastDue(): void {
    if (this._status === 'cancelled') {
      throw new DomainException('Assinatura cancelada não pode ser marcada como inadimplente');
    }
    this._status = 'past_due';
    this._updatedAt = new Date();
  }

  reactivate(): void {
    if (this._status !== 'past_due') {
      throw new DomainException('Apenas assinaturas inadimplentes podem ser reativadas');
    }
    this._status = 'active';
    this._updatedAt = new Date();
  }

  advanceBillingDate(): void {
    this._nextBillingDate = new Date(this._nextBillingDate);
    this._nextBillingDate.setMonth(this._nextBillingDate.getMonth() + 1);
    this._updatedAt = new Date();
  }

  setCardToken(token: string, last4: string, brand: string): void {
    this._cardToken = token;
    this._cardLast4 = last4;
    this._cardBrand = brand;
    this._preferredPaymentMethod = 'credit_card';
    this._updatedAt = new Date();
  }

  isActive(): boolean {
    return this._status === 'active' || this._status === 'trialing';
  }
}
```

### 2.3 Ports

```typescript
// src/modules/billing/domain/ports/output/invoice.repository.port.ts
import { Invoice } from '../../entities/invoice.entity';

export interface InvoiceRepositoryPort {
  save(invoice: Invoice): Promise<Invoice>;
  findById(id: string): Promise<Invoice | null>;
  findByExternalId(externalId: string): Promise<Invoice | null>;
  findByTenant(tenantId: string, filters?: InvoiceFilters): Promise<{ data: Invoice[]; total: number }>;
  findPendingByDueDate(dueDate: Date): Promise<Invoice[]>;
  findOverdue(): Promise<Invoice[]>;
  update(invoice: Invoice): Promise<Invoice>;
}

export interface InvoiceFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
```

```typescript
// src/modules/billing/domain/ports/output/payment-gateway.port.ts
export interface CreateChargeInput {
  customer: string; // Asaas customer ID
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference: string; // invoice ID
  creditCard?: CreditCardInput;
  creditCardToken?: string;
}

export interface CreditCardInput {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface ChargeResult {
  id: string;
  status: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCodeBase64?: string;
  pixCopyPaste?: string;
  creditCardToken?: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface PaymentGatewayPort {
  createCustomer(input: CreateCustomerInput): Promise<{ id: string }>;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(chargeId: string): Promise<ChargeResult>;
  refundCharge(chargeId: string): Promise<void>;
  tokenizeCard(input: CreditCardInput, customerId: string): Promise<string>;
}
```

```typescript
// src/modules/billing/domain/ports/output/subscription.repository.port.ts
import { Subscription } from '../../entities/subscription.entity';

export interface SubscriptionRepositoryPort {
  save(subscription: Subscription): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByTenantId(tenantId: string): Promise<Subscription[]>;
  findDueToBill(date: Date): Promise<Subscription[]>;
  update(subscription: Subscription): Promise<Subscription>;
}
```

---

## 3. Application Layer

### 3.1 Billing Service

```typescript
// src/modules/billing/application/services/billing.service.ts
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port';
import { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port';
import { PaymentGatewayPort } from '../../domain/ports/output/payment-gateway.port';
import { Invoice } from '../../domain/entities/invoice.entity';
import { Subscription } from '../../domain/entities/subscription.entity';
import { BillingInfoRepositoryPort } from '../../domain/ports/output/billing-info.repository.port';
import { PayInvoiceDto } from '../dtos/pay-invoice.dto';

@Injectable()
export class BillingService {
  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,

    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    @Inject('PaymentGatewayPort')
    private readonly paymentGateway: PaymentGatewayPort,

    @Inject('BillingInfoRepositoryPort')
    private readonly billingInfoRepo: BillingInfoRepositoryPort,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Pagar fatura com método escolhido pelo cliente
   */
  async payInvoice(tenantId: string, invoiceId: string, dto: PayInvoiceDto): Promise<any> {
    // 1. Buscar fatura
    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new NotFoundException('Fatura não encontrada');
    }
    if (invoice.status !== 'pending' && invoice.status !== 'overdue') {
      throw new BadRequestException('Fatura não está disponível para pagamento');
    }

    // 2. Buscar dados de billing do tenant
    const billingInfo = await this.billingInfoRepo.findByTenantId(tenantId);
    if (!billingInfo) {
      throw new BadRequestException('Dados de cobrança não configurados');
    }

    // 3. Criar cobrança no Asaas
    const chargeInput: any = {
      customer: billingInfo.customerExternalId,
      billingType: dto.paymentMethod.toUpperCase(),
      value: invoice.totalAmount.amount,
      dueDate: this.formatDate(invoice.dueDate),
      description: `Fatura ${invoice.referenceMonth}`,
      externalReference: invoice.id,
    };

    // Se cartão de crédito com token salvo
    if (dto.paymentMethod === 'credit_card') {
      const subscription = await this.subscriptionRepo.findById(invoice.subscriptionId);
      if (dto.useStoredCard && subscription?.cardToken) {
        chargeInput.creditCardToken = subscription.cardToken;
      } else if (dto.creditCard) {
        chargeInput.creditCard = dto.creditCard;
      }
    }

    const result = await this.paymentGateway.createCharge(chargeInput);

    // 4. Atualizar fatura com dados do gateway
    invoice.setExternalPaymentData({
      externalId: result.id,
      externalUrl: result.invoiceUrl,
      pixQrCode: result.pixQrCodeBase64,
      pixCopyPaste: result.pixCopyPaste,
      boletoUrl: result.bankSlipUrl,
    });
    await this.invoiceRepo.update(invoice);

    // 5. Se cartão e quiser salvar token para recorrência
    if (dto.paymentMethod === 'credit_card' && dto.saveCard && result.creditCardToken) {
      const subscription = await this.subscriptionRepo.findById(invoice.subscriptionId);
      if (subscription) {
        subscription.setCardToken(
          result.creditCardToken,
          dto.creditCard!.number.slice(-4),
          'visa', // detectar na prática
        );
        await this.subscriptionRepo.update(subscription);
      }
    }

    return {
      invoiceId: invoice.id,
      status: invoice.status,
      externalUrl: result.invoiceUrl,
      pixQrCode: result.pixQrCodeBase64,
      pixCopyPaste: result.pixCopyPaste,
      boletoUrl: result.bankSlipUrl,
    };
  }

  /**
   * Processar webhook do Asaas
   */
  async processWebhook(payload: AsaasWebhookPayload): Promise<void> {
    const invoice = await this.invoiceRepo.findByExternalId(payload.payment.id);
    if (!invoice) return; // Ignorar pagamentos desconhecidos

    switch (payload.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        invoice.confirmPayment(new Date(payload.payment.confirmedDate));
        await this.invoiceRepo.update(invoice);

        // Reativar subscription se estava past_due
        const subscription = await this.subscriptionRepo.findById(invoice.subscriptionId);
        if (subscription?.status === 'past_due') {
          subscription.reactivate();
          await this.subscriptionRepo.update(subscription);
        }

        this.eventEmitter.emit('payment.confirmed', {
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
          amount: invoice.totalAmount.amount,
        });
        break;

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

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

interface AsaasWebhookPayload {
  event: string;
  payment: {
    id: string;
    status: string;
    confirmedDate: string;
    value: number;
    externalReference: string;
  };
}
```

---

## 4. Infrastructure Layer

### 4.1 Asaas Gateway Adapter

```typescript
// src/modules/billing/infrastructure/gateways/asaas-payment.gateway.ts
import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayPort, CreateChargeInput, ChargeResult, CreateCustomerInput } from '../../domain/ports/output/payment-gateway.port';

@Injectable()
export class AsaasPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(AsaasPaymentGateway.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.ASAAS_API_URL ?? 'https://api.asaas.com/v3';
    this.apiKey = process.env.ASAAS_API_KEY ?? '';
  }

  async createCustomer(input: CreateCustomerInput): Promise<{ id: string }> {
    const response = await this.request('POST', '/customers', {
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
      phone: input.phone,
      address: input.address?.street,
      addressNumber: input.address?.number,
      complement: input.address?.complement,
      province: input.address?.neighborhood,
      city: input.address?.city,
      state: input.address?.state,
      postalCode: input.address?.zipCode?.replace(/\D/g, ''),
    });

    return { id: response.id };
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const body: Record<string, any> = {
      customer: input.customer,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    };

    // Token de cartão para recorrência
    if (input.creditCardToken) {
      body.creditCardToken = input.creditCardToken;
    }

    // Dados de cartão novo
    if (input.creditCard) {
      body.creditCard = {
        holderName: input.creditCard.holderName,
        number: input.creditCard.number,
        expiryMonth: input.creditCard.expiryMonth,
        expiryYear: input.creditCard.expiryYear,
        ccv: input.creditCard.ccv,
      };
    }

    const response = await this.request('POST', '/payments', body);

    return {
      id: response.id,
      status: response.status,
      invoiceUrl: response.invoiceUrl,
      bankSlipUrl: response.bankSlipUrl,
      pixQrCodeBase64: response.pixQrCodeBase64,
      pixCopyPaste: response.pixCopyPaste,
      creditCardToken: response.creditCardToken,
    };
  }

  async getCharge(chargeId: string): Promise<ChargeResult> {
    const response = await this.request('GET', `/payments/${chargeId}`);
    return {
      id: response.id,
      status: response.status,
      invoiceUrl: response.invoiceUrl,
      bankSlipUrl: response.bankSlipUrl,
    };
  }

  async refundCharge(chargeId: string): Promise<void> {
    await this.request('POST', `/payments/${chargeId}/refund`);
  }

  async tokenizeCard(input: any, customerId: string): Promise<string> {
    const response = await this.request('POST', '/creditCard/tokenize', {
      customer: customerId,
      creditCard: input,
    });
    return response.creditCardToken;
  }

  // --- HTTP Client ---
  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;

    this.logger.debug(`Asaas ${method} ${path}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error(`Asaas error: ${JSON.stringify(error)}`);
      throw new Error(`Asaas API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }
}
```

### 4.2 Webhook Controller

```typescript
// src/modules/billing/infrastructure/controllers/webhook.controller.ts
import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../../auth/infrastructure/decorators/public.decorator';
import { BillingService } from '../../application/services/billing.service';

@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Post('asaas')
  @HttpCode(HttpStatus.OK)
  async handleAsaasWebhook(
    @Body() payload: any,
    @Headers('asaas-access-token') accessToken: string,
  ): Promise<{ received: boolean }> {
    // 1. Validar token do webhook
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (accessToken !== expectedToken) {
      this.logger.warn('Webhook token inválido');
      return { received: false };
    }

    this.logger.log(`Webhook Asaas: ${payload.event} - Payment: ${payload.payment?.id}`);

    // 2. Processar em background (não bloquear response)
    try {
      await this.billingService.processWebhook(payload);
    } catch (error) {
      this.logger.error(`Erro processando webhook: ${error.message}`, error.stack);
      // Retornar 200 mesmo com erro para Asaas não retentar indefinidamente
      // O erro será tratado posteriormente via payment_logs
    }

    return { received: true };
  }
}
```

### 4.3 Billing Controller

```typescript
// src/modules/billing/infrastructure/controllers/billing.controller.ts
import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { BillingService } from '../../application/services/billing.service';
import { PayInvoiceDto } from '../../application/dtos/pay-invoice.dto';
import { TenantId } from '../../../auth/infrastructure/decorators/tenant-id.decorator';
import { Roles } from '../../../auth/infrastructure/decorators/roles.decorator';

@Controller('api/v1/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  async listInvoices(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.billingService.getInvoicesByTenant(tenantId, {
      status,
      page: page ?? 1,
      limit: limit ?? 20,
    });
    return { success: true, data: result.data, meta: { total: result.total } };
  }

  @Get('invoices/:id')
  async getInvoice(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const invoice = await this.billingService.getInvoiceById(tenantId, id);
    return { success: true, data: invoice };
  }

  @Post('invoices/:id/pay')
  async payInvoice(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayInvoiceDto,
  ) {
    const result = await this.billingService.payInvoice(tenantId, id, dto);
    return { success: true, data: result };
  }

  @Get('subscriptions')
  async listSubscriptions(@TenantId() tenantId: string) {
    const subscriptions = await this.billingService.getSubscriptionsByTenant(tenantId);
    return { success: true, data: subscriptions };
  }

  @Roles('admin')
  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    await this.billingService.cancelSubscription(tenantId, id, reason);
    return { success: true, message: 'Assinatura cancelada' };
  }
}
```

---

## 5. CRON Jobs

### 5.1 Gerar Faturas Mensais

```typescript
// src/modules/billing/application/crons/generate-invoices.cron.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port';
import { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port';
import { Invoice } from '../../domain/entities/invoice.entity';

@Injectable()
export class GenerateInvoicesCron {
  private readonly logger = new Logger(GenerateInvoicesCron.name);

  constructor(
    @Inject('SubscriptionRepositoryPort')
    private readonly subscriptionRepo: SubscriptionRepositoryPort,

    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,

    @Inject('PlanRepositoryPort')
    private readonly planRepo: any,
  ) {}

  /**
   * Executa dia 1 de cada mês às 06:00
   * Gera faturas para todas subscriptions cujo nextBillingDate <= hoje
   */
  @Cron('0 6 1 * *')
  async execute(): Promise<void> {
    this.logger.log('Iniciando geração de faturas mensais...');

    const today = new Date();
    const subscriptions = await this.subscriptionRepo.findDueToBill(today);

    let generated = 0;
    let errors = 0;

    for (const subscription of subscriptions) {
      try {
        if (!subscription.isActive()) continue;

        const plan = await this.planRepo.findById(subscription.planId);
        if (!plan) continue;

        // Calcular mês de referência
        const referenceMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        // Criar fatura
        const invoice = Invoice.create({
          tenantId: subscription.tenantId,
          subscriptionId: subscription.id,
          totalAmount: plan.price,
          dueDate: new Date(today.getFullYear(), today.getMonth(), 10), // Vencimento dia 10
          referenceMonth,
          items: [{
            description: `${plan.name} - ${referenceMonth}`,
            unitPrice: plan.price,
            quantity: 1,
          }],
        });

        await this.invoiceRepo.save(invoice);

        // Avançar próxima data de billing
        subscription.advanceBillingDate();
        await this.subscriptionRepo.update(subscription);

        generated++;
      } catch (error) {
        errors++;
        this.logger.error(`Erro gerando fatura para subscription ${subscription.id}: ${error.message}`);
      }
    }

    this.logger.log(`Faturas geradas: ${generated}, Erros: ${errors}`);
  }
}
```

### 5.2 Verificar Vencimentos

```typescript
// src/modules/billing/application/crons/check-overdue.cron.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port';

@Injectable()
export class CheckOverdueCron {
  private readonly logger = new Logger(CheckOverdueCron.name);

  constructor(
    @Inject('InvoiceRepositoryPort')
    private readonly invoiceRepo: InvoiceRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Executa diariamente às 08:00
   * Marca faturas vencidas como overdue e suspende assinaturas
   */
  @Cron('0 8 * * *')
  async execute(): Promise<void> {
    this.logger.log('Verificando faturas vencidas...');

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
  }
}
```

### 5.3 Processar Pagamentos Automáticos (Cartão Salvo)

```typescript
// src/modules/billing/application/crons/auto-charge.cron.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InvoiceRepositoryPort } from '../../domain/ports/output/invoice.repository.port';
import { SubscriptionRepositoryPort } from '../../domain/ports/output/subscription.repository.port';
import { PaymentGatewayPort } from '../../domain/ports/output/payment-gateway.port';
import { BillingInfoRepositoryPort } from '../../domain/ports/output/billing-info.repository.port';

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
   * Executa dia 5 de cada mês às 07:00
   * Cobra faturas pendentes de assinaturas com cartão salvo
   */
  @Cron('0 7 5 * *')
  async execute(): Promise<void> {
    this.logger.log('Iniciando cobrança automática...');

    const pendingInvoices = await this.invoiceRepo.findPendingByDueDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Cobrar até 7 dias antes do vencimento
    );

    let charged = 0;
    let skipped = 0;

    for (const invoice of pendingInvoices) {
      try {
        const subscription = await this.subscriptionRepo.findById(invoice.subscriptionId);
        if (!subscription?.cardToken) {
          skipped++;
          continue;
        }

        const billingInfo = await this.billingInfoRepo.findByTenantId(invoice.tenantId);
        if (!billingInfo?.customerExternalId) {
          skipped++;
          continue;
        }

        const result = await this.paymentGateway.createCharge({
          customer: billingInfo.customerExternalId,
          billingType: 'CREDIT_CARD',
          value: invoice.totalAmount.amount,
          dueDate: invoice.dueDate.toISOString().split('T')[0],
          description: `Fatura ${invoice.referenceMonth} - Cobrança automática`,
          externalReference: invoice.id,
          creditCardToken: subscription.cardToken,
        });

        invoice.setExternalPaymentData({ externalId: result.id, externalUrl: result.invoiceUrl });
        await this.invoiceRepo.update(invoice);

        charged++;
      } catch (error) {
        this.logger.error(`Erro cobrando invoice ${invoice.id}: ${error.message}`);
      }
    }

    this.logger.log(`Auto-charge: cobrados ${charged}, ignorados ${skipped}`);
  }
}
```

---

## 6. Module Binding

```typescript
// src/modules/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingService } from './application/services/billing.service';
import { BillingController } from './infrastructure/controllers/billing.controller';
import { WebhookController } from './infrastructure/controllers/webhook.controller';
import { AsaasPaymentGateway } from './infrastructure/gateways/asaas-payment.gateway';
import { DrizzleInvoiceRepository } from './infrastructure/repositories/drizzle-invoice.repository';
import { DrizzleSubscriptionRepository } from './infrastructure/repositories/drizzle-subscription.repository';
import { DrizzleBillingInfoRepository } from './infrastructure/repositories/drizzle-billing-info.repository';
import { GenerateInvoicesCron } from './application/crons/generate-invoices.cron';
import { CheckOverdueCron } from './application/crons/check-overdue.cron';
import { AutoChargeCron } from './application/crons/auto-charge.cron';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [BillingController, WebhookController],
  providers: [
    BillingService,
    GenerateInvoicesCron,
    CheckOverdueCron,
    AutoChargeCron,

    // Port → Adapter binding
    { provide: 'PaymentGatewayPort', useClass: AsaasPaymentGateway },
    { provide: 'InvoiceRepositoryPort', useClass: DrizzleInvoiceRepository },
    { provide: 'SubscriptionRepositoryPort', useClass: DrizzleSubscriptionRepository },
    { provide: 'BillingInfoRepositoryPort', useClass: DrizzleBillingInfoRepository },
  ],
  exports: [BillingService],
})
export class BillingModule {}
```

---

## 7. Regras de Negócio

| # | Nível | Regra |
|---|-------|-------|
| BIL-001 | 🚫 CRITICAL | Backend gera faturas via CRON. Asaas apenas executa cobranças |
| BIL-002 | ⚠️ REQUIRED | Toda fatura tem `referenceMonth` para evitar duplicatas |
| BIL-003 | ⚠️ REQUIRED | Vencimento padrão: dia 10 do mês de referência |
| BIL-004 | ⚠️ REQUIRED | CRON de geração: dia 1 às 06:00 |
| BIL-005 | ⚠️ REQUIRED | CRON de vencimento: diariamente às 08:00 |
| BIL-006 | ⚠️ REQUIRED | CRON de auto-charge: dia 5 às 07:00 (apenas cartão salvo) |
| BIL-007 | 🚫 CRITICAL | Webhook retorna 200 SEMPRE (mesmo com erro) para evitar retry infinito |
| BIL-008 | 🚫 CRITICAL | Card token salvo na subscription, NUNCA dados completos do cartão |
| BIL-009 | 🚫 CRITICAL | **PROIBIDO** armazenar número completo do cartão |
| BIL-010 | ⚠️ REQUIRED | Reembolso só para faturas pagas |
| BIL-011 | ⚠️ REQUIRED | Cancelamento de assinatura: apenas admin |
| BIL-012 | ⚠️ REQUIRED | Subscription past_due após 3+ dias de atraso → suspender ferramentas |
| BIL-013 | 🚫 CRITICAL | Webhook validado por token (`ASAAS_WEBHOOK_TOKEN`) |
| BIL-014 | ⚠️ REQUIRED | PIX: retornar QR Code + copy-paste na response |
| BIL-015 | ⚠️ REQUIRED | Boleto: retornar URL + código de barras na response |
| BIL-016 | ⚠️ REQUIRED | `externalId` indexado para lookup rápido no webhook |

---

> **Skill File v1.0** — Billing & Payments  
> **Regra:** O backend é o dono da fatura. Asaas é apenas o executor de cobrança.
