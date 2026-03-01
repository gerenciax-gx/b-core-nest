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

export interface TenantAddress {
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface TenantBusinessData {
  openingDate: string | null;
  businessHours: string | null;
  specialties: string | null;
  maxCapacity: number | null;
  averageServiceTime: number | null;
  paymentMethods: string | null;
  cancellationPolicy: string | null;
  description: string | null;
}

export interface TenantSocialLinks {
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
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
    // Legal
    private _legalName: string | null,
    private _stateRegistration: string | null,
    private _municipalRegistration: string | null,
    // Address
    private _cep: string | null,
    private _street: string | null,
    private _number: string | null,
    private _complement: string | null,
    private _neighborhood: string | null,
    private _city: string | null,
    private _state: string | null,
    private _country: string | null,
    // Business
    private _openingDate: string | null,
    private _businessHours: string | null,
    private _specialties: string | null,
    private _maxCapacity: number | null,
    private _averageServiceTime: number | null,
    private _paymentMethods: string | null,
    private _cancellationPolicy: string | null,
    private _description: string | null,
    // Social
    private _website: string | null,
    private _instagram: string | null,
    private _facebook: string | null,
    private _whatsapp: string | null,
    // Timestamps
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
      null, null, null,
      null, null, null, null, null, null, null, 'BR',
      null, null, null, null, null, null, null, null,
      null, null, null, null,
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

  // Legal
  get legalName(): string | null {
    return this._legalName;
  }
  get stateRegistration(): string | null {
    return this._stateRegistration;
  }
  get municipalRegistration(): string | null {
    return this._municipalRegistration;
  }

  // Address
  get address(): TenantAddress {
    return {
      cep: this._cep,
      street: this._street,
      number: this._number,
      complement: this._complement,
      neighborhood: this._neighborhood,
      city: this._city,
      state: this._state,
      country: this._country,
    };
  }

  // Business
  get businessData(): TenantBusinessData {
    return {
      openingDate: this._openingDate,
      businessHours: this._businessHours,
      specialties: this._specialties,
      maxCapacity: this._maxCapacity,
      averageServiceTime: this._averageServiceTime,
      paymentMethods: this._paymentMethods,
      cancellationPolicy: this._cancellationPolicy,
      description: this._description,
    };
  }

  // Social
  get socialLinks(): TenantSocialLinks {
    return {
      website: this._website,
      instagram: this._instagram,
      facebook: this._facebook,
      whatsapp: this._whatsapp,
    };
  }

  // Raw field getters (for repository persistence)
  get cep(): string | null {
    return this._cep;
  }
  get street(): string | null {
    return this._street;
  }
  get number(): string | null {
    return this._number;
  }
  get complement(): string | null {
    return this._complement;
  }
  get neighborhood(): string | null {
    return this._neighborhood;
  }
  get city(): string | null {
    return this._city;
  }
  get state(): string | null {
    return this._state;
  }
  get country(): string | null {
    return this._country;
  }
  get openingDate(): string | null {
    return this._openingDate;
  }
  get businessHours(): string | null {
    return this._businessHours;
  }
  get specialties(): string | null {
    return this._specialties;
  }
  get maxCapacity(): number | null {
    return this._maxCapacity;
  }
  get averageServiceTime(): number | null {
    return this._averageServiceTime;
  }
  get paymentMethods(): string | null {
    return this._paymentMethods;
  }
  get cancellationPolicy(): string | null {
    return this._cancellationPolicy;
  }
  get description(): string | null {
    return this._description;
  }
  get website(): string | null {
    return this._website;
  }
  get instagram(): string | null {
    return this._instagram;
  }
  get facebook(): string | null {
    return this._facebook;
  }
  get whatsapp(): string | null {
    return this._whatsapp;
  }

  // ── Behaviors ─────────────────────────────────────────────
  updateCompanyInfo(data: {
    companyName?: string;
    document?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    legalName?: string | null;
    stateRegistration?: string | null;
    municipalRegistration?: string | null;
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    openingDate?: string | null;
    businessHours?: string | null;
    specialties?: string | null;
    maxCapacity?: number | null;
    averageServiceTime?: number | null;
    paymentMethods?: string | null;
    cancellationPolicy?: string | null;
    description?: string | null;
    website?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    whatsapp?: string | null;
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

    // Legal
    if (data.legalName !== undefined) this._legalName = data.legalName;
    if (data.stateRegistration !== undefined) this._stateRegistration = data.stateRegistration;
    if (data.municipalRegistration !== undefined) this._municipalRegistration = data.municipalRegistration;

    // Address
    if (data.cep !== undefined) this._cep = data.cep;
    if (data.street !== undefined) this._street = data.street;
    if (data.number !== undefined) this._number = data.number;
    if (data.complement !== undefined) this._complement = data.complement;
    if (data.neighborhood !== undefined) this._neighborhood = data.neighborhood;
    if (data.city !== undefined) this._city = data.city;
    if (data.state !== undefined) this._state = data.state;
    if (data.country !== undefined) this._country = data.country;

    // Business
    if (data.openingDate !== undefined) this._openingDate = data.openingDate;
    if (data.businessHours !== undefined) this._businessHours = data.businessHours;
    if (data.specialties !== undefined) this._specialties = data.specialties;
    if (data.maxCapacity !== undefined) this._maxCapacity = data.maxCapacity;
    if (data.averageServiceTime !== undefined) this._averageServiceTime = data.averageServiceTime;
    if (data.paymentMethods !== undefined) this._paymentMethods = data.paymentMethods;
    if (data.cancellationPolicy !== undefined) this._cancellationPolicy = data.cancellationPolicy;
    if (data.description !== undefined) this._description = data.description;

    // Social
    if (data.website !== undefined) this._website = data.website;
    if (data.instagram !== undefined) this._instagram = data.instagram;
    if (data.facebook !== undefined) this._facebook = data.facebook;
    if (data.whatsapp !== undefined) this._whatsapp = data.whatsapp;

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
