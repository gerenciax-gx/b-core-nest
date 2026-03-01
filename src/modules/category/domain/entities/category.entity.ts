import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';

export type CategoryType = 'product' | 'service';

export interface CreateCategoryProps {
  tenantId: string;
  name: string;
  type: CategoryType;
  sortOrder?: number;
}

export class Category {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _name: string,
    private _type: CategoryType,
    private _isActive: boolean,
    private _sortOrder: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateCategoryProps): Category {
    if (!props.name || props.name.trim().length < 2) {
      throw new DomainException('Nome da categoria deve ter pelo menos 2 caracteres');
    }

    return new Category(
      randomUUID(),
      props.tenantId,
      props.name.trim(),
      props.type,
      true,
      props.sortOrder ?? 0,
      new Date(),
      new Date(),
    );
  }

  get name(): string { return this._name; }
  get type(): CategoryType { return this._type; }
  get isActive(): boolean { return this._isActive; }
  get sortOrder(): number { return this._sortOrder; }
  get updatedAt(): Date { return this._updatedAt; }

  update(data: { name?: string; isActive?: boolean; sortOrder?: number }): void {
    if (data.name !== undefined) {
      if (data.name.trim().length < 2) {
        throw new DomainException('Nome da categoria deve ter pelo menos 2 caracteres');
      }
      this._name = data.name.trim();
    }
    if (data.isActive !== undefined) this._isActive = data.isActive;
    if (data.sortOrder !== undefined) this._sortOrder = data.sortOrder;
    this._updatedAt = new Date();
  }
}
