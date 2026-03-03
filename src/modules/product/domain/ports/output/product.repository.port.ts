import type { Product } from '../../entities/product.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';

export interface ProductRepositoryPort {
  save(product: Product): Promise<Product>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; categoryId?: string; search?: string },
  ): Promise<[Product[], number]>;
  update(product: Product): Promise<Product>;
  delete(id: string, tenantId: string): Promise<void>;
  saveVariations(product: Product): Promise<void>;
  savePhotos(product: Product): Promise<void>;
  saveCustomFields(product: Product): Promise<void>;
}
