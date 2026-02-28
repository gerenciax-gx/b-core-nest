import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';

export type CompanyType = 'products' | 'services' | 'both';
export type TenantStatus = 'active' | 'suspended' | 'cancelled';

export interface CreateTenantProps {
  companyName: string;
  companyType: CompanyType;
  document?: string;
  phone?: string;
  email?: string;
}

export class Tenant {
  constructor(
    public readonly id: string,
    private _companyName: string,
    private _companyType: CompanyType,
    private _document: string | null,
    private _phone: string | null,
    private _email: string | null,
    private _status: TenantStatus,
    private _logoUrl: string | null,
    private _isActive: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  // ── Factory ───────────────────────────────────────────────
  static create(props: CreateTenantProps): Tenant {
    if (!props.companyName || props.companyName.trim().length < 2) {
      throw new DomainException(
        'Nome da empresa deve ter pelo menos 2 caracteres',
      );
    }

    return new Tenant(
      randomUUID(),
      props.companyName.trim(),
      props.companyType,
      props.document ?? null,
      props.phone ?? null,
      props.email ?? null,
      'active',
      null,
      true,
      new Date(),
      new Date(),
    );
  }

  // ── Getters ───────────────────────────────────────────────
  get companyName(): string {
    return this._companyName;
  }
  get companyType(): CompanyType {
    return this._companyType;
  }
  get document(): string | null {
    return this._document;
  }
  get phone(): string | null {
    return this._phone;
  }
  get email(): string | null {
    return this._email;
  }
  get status(): TenantStatus {
    return this._status;
  }
  get logoUrl(): string | null {
    return this._logoUrl;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ── Behaviors ─────────────────────────────────────────────
  updateCompanyInfo(data: {
    companyName?: string;
    document?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  }): void {
    if (data.companyName !== undefined) {
      if (data.companyName.trim().length < 2) {
        throw new DomainException(
          'Nome da empresa deve ter pelo menos 2 caracteres',
        );
      }
      this._companyName = data.companyName.trim();
    }
    if (data.document !== undefined) this._document = data.document;
    if (data.phone !== undefined) this._phone = data.phone;
    if (data.email !== undefined) this._email = data.email;
    if (data.logoUrl !== undefined) this._logoUrl = data.logoUrl;
    this._updatedAt = new Date();
  }

  suspend(): void {
    if (this._status === 'suspended') {
      throw new DomainException('Tenant já está suspenso');
    }
    this._status = 'suspended';
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._status = 'active';
    this._isActive = true;
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === 'cancelled') {
      throw new DomainException('Tenant já está cancelado');
    }
    this._status = 'cancelled';
    this._isActive = false;
    this._updatedAt = new Date();
  }
}
