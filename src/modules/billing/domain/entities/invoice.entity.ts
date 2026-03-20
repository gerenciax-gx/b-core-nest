import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';
import { Money } from '../value-objects/money.vo.js';

export type InvoiceStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

export interface CreateInvoiceProps {
  tenantId: string;
  subscriptionId?: string | null;
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
    public readonly subscriptionId: string | null,
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
    private _retryCount: number,
    private _lastRetryAt: Date | null,
    public readonly referenceMonth: string,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateInvoiceProps): Invoice {
    const totalAmount = Money.create(props.totalAmount);
    const invoice = new Invoice(
      randomUUID(),
      props.tenantId,
      props.subscriptionId ?? null,
      'pending',
      totalAmount,
      props.dueDate,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      0,
      null,
      props.referenceMonth,
      new Date(),
      new Date(),
    );

    for (const item of props.items) {
      invoice.addItem(item);
    }

    return invoice;
  }

  // ── Getters ────────────────────────────────────────────────
  get status(): InvoiceStatus {
    return this._status;
  }
  get totalAmount(): Money {
    return this._totalAmount;
  }
  get dueDate(): Date {
    return this._dueDate;
  }
  get paidAt(): Date | null {
    return this._paidAt;
  }
  get externalId(): string | null {
    return this._externalId;
  }
  get externalUrl(): string | null {
    return this._externalUrl;
  }
  get pixQrCode(): string | null {
    return this._pixQrCode;
  }
  get pixCopyPaste(): string | null {
    return this._pixCopyPaste;
  }
  get boletoUrl(): string | null {
    return this._boletoUrl;
  }
  get boletoBarcode(): string | null {
    return this._boletoBarcode;
  }
  get retryCount(): number {
    return this._retryCount;
  }
  get lastRetryAt(): Date | null {
    return this._lastRetryAt;
  }
  get items(): InvoiceItem[] {
    return [...this._items];
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ── Behaviors ──────────────────────────────────────────────
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
      throw new DomainException(
        'Apenas faturas pendentes podem ser marcadas como vencidas',
      );
    }
    this._status = 'overdue';
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === 'paid') {
      throw new DomainException(
        'Não é possível cancelar fatura paga. Use reembolso',
      );
    }
    this._status = 'cancelled';
    this._updatedAt = new Date();
  }

  refund(): void {
    if (this._status !== 'paid') {
      throw new DomainException(
        'Apenas faturas pagas podem ser reembolsadas',
      );
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

  incrementRetry(): void {
    this._retryCount++;
    this._lastRetryAt = new Date();
    this._updatedAt = new Date();
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

  setItems(items: InvoiceItem[]): void {
    this._items = items;
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
