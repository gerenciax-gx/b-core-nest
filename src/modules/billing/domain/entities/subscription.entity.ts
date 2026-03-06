import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';

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

    const status: SubscriptionStatus =
      props.trialDays && props.trialDays > 0 ? 'trialing' : 'active';

    return new Subscription(
      randomUUID(),
      props.tenantId,
      props.planId,
      status,
      startDate,
      null,
      nextBillingDate,
      null,
      null,
      null,
      null,
      null,
      null,
      new Date(),
      new Date(),
    );
  }

  // ── Getters ────────────────────────────────────────────────
  get status(): SubscriptionStatus {
    return this._status;
  }
  get startDate(): Date {
    return this._startDate;
  }
  get endDate(): Date | null {
    return this._endDate;
  }
  get nextBillingDate(): Date {
    return this._nextBillingDate;
  }
  get cancelledAt(): Date | null {
    return this._cancelledAt;
  }
  get cancelReason(): string | null {
    return this._cancelReason;
  }
  get cardToken(): string | null {
    return this._cardToken;
  }
  get cardLast4(): string | null {
    return this._cardLast4;
  }
  get cardBrand(): string | null {
    return this._cardBrand;
  }
  get preferredPaymentMethod(): string | null {
    return this._preferredPaymentMethod;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ── Behaviors ──────────────────────────────────────────────
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
      throw new DomainException(
        'Assinatura cancelada não pode ser marcada como inadimplente',
      );
    }
    this._status = 'past_due';
    this._updatedAt = new Date();
  }

  reactivate(): void {
    if (this._status !== 'past_due') {
      throw new DomainException(
        'Apenas assinaturas inadimplentes podem ser reativadas',
      );
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
