import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

/**
 * Adds one month to a date, clamping to the last day of the target month
 * to avoid overflow (e.g., Jan 31 → Feb 28, not Mar 3).
 */
function addOneMonth(date: Date): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + 1;
  result.setDate(1); // avoid overflow
  result.setMonth(targetMonth);
  // clamp day to last day of target month
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

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
    private _trialEndsAt: Date | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateSubscriptionProps): Subscription {
    const startDate = props.startDate;
    const nextBillingDate = addOneMonth(startDate);

    const status: SubscriptionStatus =
      props.trialDays && props.trialDays > 0 ? 'trialing' : 'active';

    let trialEndsAt: Date | null = null;
    if (props.trialDays && props.trialDays > 0) {
      trialEndsAt = new Date(startDate);
      trialEndsAt.setDate(trialEndsAt.getDate() + props.trialDays);
    }

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
      trialEndsAt,
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
  get trialEndsAt(): Date | null {
    return this._trialEndsAt;
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

  activateFromTrial(): void {
    if (this._status !== 'trialing') {
      throw new DomainException(
        'Apenas assinaturas em trial podem ser ativadas',
      );
    }
    this._status = 'active';
    this._nextBillingDate = new Date();
    this._updatedAt = new Date();
  }

  isTrialExpired(): boolean {
    if (this._status !== 'trialing' || !this._trialEndsAt) return false;
    return this._trialEndsAt <= new Date();
  }

  advanceBillingDate(): void {
    this._nextBillingDate = addOneMonth(this._nextBillingDate);
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
