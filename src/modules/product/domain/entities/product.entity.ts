import { randomUUID } from 'node:crypto';
import { DomainException } from '../../../../common/exceptions/domain.exception.js';

export type ProductStatus = 'active' | 'inactive' | 'draft';

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

export interface VariationAttribute {
  type: string; // 'size', 'color', 'model'
  value: string;
}

export interface ProductVariationData {
  id: string;
  name: string;
  sku: string | null;
  attributes: VariationAttribute[];
  price: number;
  stock: number;
  imageUrl: string | null;
  sortOrder: number;
}

export interface ProductPhotoData {
  id: string;
  url: string;
  isMain: boolean;
  sortOrder: number;
  variationId: string | null;
}

export interface ProductCustomFieldData {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  sortOrder: number;
  variationId: string | null;
}

export interface CreateProductProps {
  tenantId: string;
  name: string;
  sku: string;
  description?: string;
  categoryId?: string;
  basePrice: number;
  costPrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  stockAlert?: boolean;
  trackInventory?: boolean;
  barcode?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  tags?: string[];
  imageUrl?: string;
  status?: ProductStatus;
}

export class Product {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    private _name: string,
    private _sku: string,
    private _description: string | null,
    private _categoryId: string | null,
    private _basePrice: number,
    private _costPrice: number | null,
    private _stock: number,
    private _minStock: number,
    private _maxStock: number | null,
    private _stockAlert: boolean,
    private _trackInventory: boolean,
    private _barcode: string | null,
    private _weight: number | null,
    private _dimensions: ProductDimensions | null,
    private _tags: string[],
    private _imageUrl: string | null,
    private _status: ProductStatus,
    private _isActive: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    // In-memory aggregates (loaded separately)
    private _variations: ProductVariationData[] = [],
    private _photos: ProductPhotoData[] = [],
    private _customFields: ProductCustomFieldData[] = [],
  ) {}

  static create(props: CreateProductProps): Product {
    if (!props.name || props.name.trim().length < 2) {
      throw new DomainException('Nome do produto deve ter pelo menos 2 caracteres');
    }
    if (!props.sku || props.sku.trim().length < 1) {
      throw new DomainException('SKU é obrigatório');
    }
    if (props.basePrice < 0) {
      throw new DomainException('Preço base não pode ser negativo');
    }

    return new Product(
      randomUUID(),
      props.tenantId,
      props.name.trim(),
      props.sku.trim(),
      props.description?.trim() ?? null,
      props.categoryId ?? null,
      props.basePrice,
      props.costPrice ?? null,
      props.stock ?? 0,
      props.minStock ?? 0,
      props.maxStock ?? null,
      props.stockAlert ?? false,
      props.trackInventory ?? true,
      props.barcode ?? null,
      props.weight ?? null,
      props.dimensions ?? null,
      props.tags ?? [],
      props.imageUrl ?? null,
      props.status ?? 'active',
      (props.status ?? 'active') !== 'inactive',
      new Date(),
      new Date(),
    );
  }

  // ── Getters ───────────────────────────────────────────
  get name(): string { return this._name; }
  get sku(): string { return this._sku; }
  get description(): string | null { return this._description; }
  get categoryId(): string | null { return this._categoryId; }
  get basePrice(): number { return this._basePrice; }
  get costPrice(): number | null { return this._costPrice; }
  get stock(): number { return this._stock; }
  get minStock(): number { return this._minStock; }
  get maxStock(): number | null { return this._maxStock; }
  get stockAlert(): boolean { return this._stockAlert; }
  get trackInventory(): boolean { return this._trackInventory; }
  get barcode(): string | null { return this._barcode; }
  get weight(): number | null { return this._weight; }
  get dimensions(): ProductDimensions | null { return this._dimensions; }
  get tags(): string[] { return this._tags; }
  get imageUrl(): string | null { return this._imageUrl; }
  get status(): ProductStatus { return this._status; }
  get isActive(): boolean { return this._isActive; }
  get updatedAt(): Date { return this._updatedAt; }
  get variations(): ProductVariationData[] { return this._variations; }
  get photos(): ProductPhotoData[] { return this._photos; }
  get customFields(): ProductCustomFieldData[] { return this._customFields; }

  // ── Setters for aggregates ────────────────────────────
  setVariations(v: ProductVariationData[]): void { this._variations = v; }
  setPhotos(p: ProductPhotoData[]): void { this._photos = p; }
  setCustomFields(cf: ProductCustomFieldData[]): void { this._customFields = cf; }

  // ── Behaviors ─────────────────────────────────────────
  update(data: Partial<CreateProductProps>): void {
    if (data.name !== undefined) {
      if (data.name.trim().length < 2) {
        throw new DomainException('Nome do produto deve ter pelo menos 2 caracteres');
      }
      this._name = data.name.trim();
    }
    if (data.sku !== undefined) {
      if (data.sku.trim().length < 1) {
        throw new DomainException('SKU não pode ser vazio');
      }
      this._sku = data.sku.trim();
    }
    if (data.description !== undefined) this._description = data.description?.trim() ?? null;
    if (data.categoryId !== undefined) this._categoryId = data.categoryId ?? null;
    if (data.basePrice !== undefined) {
      if (data.basePrice < 0) throw new DomainException('Preço base não pode ser negativo');
      this._basePrice = data.basePrice;
    }
    if (data.costPrice !== undefined) this._costPrice = data.costPrice ?? null;
    if (data.stock !== undefined) {
      if (data.stock < 0) throw new DomainException('Estoque não pode ser negativo');
      this._stock = data.stock;
    }
    if (data.minStock !== undefined) this._minStock = data.minStock;
    if (data.maxStock !== undefined) this._maxStock = data.maxStock ?? null;
    if (data.stockAlert !== undefined) this._stockAlert = data.stockAlert;
    if (data.trackInventory !== undefined) this._trackInventory = data.trackInventory;
    if (data.barcode !== undefined) this._barcode = data.barcode ?? null;
    if (data.weight !== undefined) this._weight = data.weight ?? null;
    if (data.dimensions !== undefined) this._dimensions = data.dimensions ?? null;
    if (data.tags !== undefined) this._tags = data.tags ?? [];
    if (data.imageUrl !== undefined) this._imageUrl = data.imageUrl ?? null;
    if (data.status !== undefined) {
      this._status = data.status;
      this._isActive = data.status !== 'inactive';
    }
    this._updatedAt = new Date();
  }
}
