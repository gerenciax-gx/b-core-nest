import { DomainException } from '../../../../common/exceptions/domain.exception.js';

/**
 * Value object for monetary amounts.
 * Stores amount as a number with 2 decimal places precision.
 */
export class Money {
  private constructor(private readonly _amount: number) {}

  static create(amount: number): Money {
    if (amount < 0) {
      throw new DomainException('Valor monetário não pode ser negativo');
    }
    return new Money(Math.round(amount * 100) / 100);
  }

  static zero(): Money {
    return new Money(0);
  }

  get amount(): number {
    return this._amount;
  }

  add(other: Money): Money {
    return Money.create(this._amount + other._amount);
  }

  subtract(other: Money): Money {
    return Money.create(this._amount - other._amount);
  }

  multiply(factor: number): Money {
    return Money.create(this._amount * factor);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  toString(): string {
    return this._amount.toFixed(2);
  }
}
