import type { Product } from '../../entities/product.entity.js';

export interface ProductRepositoryPort {
  save(product: Product): Promise<Product>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  findAllByTenant(tenantId: string): Promise<Product[]>;
  update(product: Product): Promise<Product>;
  delete(id: string, tenantId: string): Promise<void>;
  saveVariations(product: Product): Promise<void>;
  savePhotos(product: Product): Promise<void>;
  saveCustomFields(product: Product): Promise<void>;
}
