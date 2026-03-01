import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';

export type ServiceStatus = 'active' | 'inactive' | 'paused';

export interface PriceVariationData {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  sortOrder: number;
}

export interface ServicePhotoData {
  id: string;
  url: string;
  isMain: boolean;
  sortOrder: number;
  priceVariationId: string | null;
}

export interface ServiceProfessionalData {
  id: string;
  collaboratorId: string | null;
}

export interface CreateServiceProps {
  tenantId: string;
  name: string;
  description?: string;
  categoryId?: string;
  basePrice: number;
  durationMinutes: number;
  imageUrl?: string;
  status?: ServiceStatus;
}

export class Service {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _name: string,
    private _description: string | null,
    private _categoryId: string | null,
    private _basePrice: number,
    private _durationMinutes: number,
    private _imageUrl: string | null,
    private _status: ServiceStatus,
    private _isActive: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    // In-memory aggregates
    private _priceVariations: PriceVariationData[] = [],
    private _photos: ServicePhotoData[] = [],
    private _professionals: ServiceProfessionalData[] = [],
  ) {}

  static create(props: CreateServiceProps): Service {
    if (!props.name || props.name.trim().length < 2) {
      throw new DomainException('Nome do serviço deve ter pelo menos 2 caracteres');
    }
    if (props.basePrice < 0) {
      throw new DomainException('Preço base não pode ser negativo');
    }
    if (props.durationMinutes < 1) {
      throw new DomainException('Duração deve ser de pelo menos 1 minuto');
    }

    return new Service(
      randomUUID(),
      props.tenantId,
      props.name.trim(),
      props.description?.trim() ?? null,
      props.categoryId ?? null,
      props.basePrice,
      props.durationMinutes,
      props.imageUrl ?? null,
      props.status ?? 'active',
      (props.status ?? 'active') !== 'inactive',
      new Date(),
      new Date(),
    );
  }

  // ── Getters ───────────────────────────────────────────
  get name(): string { return this._name; }
  get description(): string | null { return this._description; }
  get categoryId(): string | null { return this._categoryId; }
  get basePrice(): number { return this._basePrice; }
  get durationMinutes(): number { return this._durationMinutes; }
  get imageUrl(): string | null { return this._imageUrl; }
  get status(): ServiceStatus { return this._status; }
  get isActive(): boolean { return this._isActive; }
  get updatedAt(): Date { return this._updatedAt; }
  get priceVariations(): PriceVariationData[] { return this._priceVariations; }
  get photos(): ServicePhotoData[] { return this._photos; }
  get professionals(): ServiceProfessionalData[] { return this._professionals; }

  // ── Setters for aggregates ────────────────────────────
  setPriceVariations(v: PriceVariationData[]): void { this._priceVariations = v; }
  setPhotos(p: ServicePhotoData[]): void { this._photos = p; }
  setProfessionals(pr: ServiceProfessionalData[]): void { this._professionals = pr; }

  // ── Behaviors ─────────────────────────────────────────
  update(data: Partial<CreateServiceProps>): void {
    if (data.name !== undefined) {
      if (data.name.trim().length < 2) {
        throw new DomainException('Nome do serviço deve ter pelo menos 2 caracteres');
      }
      this._name = data.name.trim();
    }
    if (data.description !== undefined) this._description = data.description?.trim() ?? null;
    if (data.categoryId !== undefined) this._categoryId = data.categoryId ?? null;
    if (data.basePrice !== undefined) {
      if (data.basePrice < 0) throw new DomainException('Preço base não pode ser negativo');
      this._basePrice = data.basePrice;
    }
    if (data.durationMinutes !== undefined) {
      if (data.durationMinutes < 1) throw new DomainException('Duração deve ser de pelo menos 1 minuto');
      this._durationMinutes = data.durationMinutes;
    }
    if (data.imageUrl !== undefined) this._imageUrl = data.imageUrl ?? null;
    if (data.status !== undefined) {
      this._status = data.status;
      this._isActive = data.status !== 'inactive';
    }
    this._updatedAt = new Date();
  }
}
