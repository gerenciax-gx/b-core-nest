import type { Product, ProductVariationData, ProductCustomFieldData } from '../../entities/product.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';
import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface ProductRepositoryPort {
  save(product: Product, tx?: DbClient): Promise<Product>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; categoryId?: string; search?: string },
  ): Promise<[Product[], number]>;
  update(product: Product, tx?: DbClient): Promise<Product>;
  delete(id: string, tenantId: string): Promise<void>;
  saveVariations(product: Product, tx?: DbClient): Promise<void>;
  savePhotos(product: Product, tx?: DbClient): Promise<void>;
  saveCustomFields(product: Product, tx?: DbClient): Promise<void>;

  // ── Variation sub-resource ──────────────────────────────
  findVariationsByProduct(productId: string): Promise<ProductVariationData[]>;
  findVariationById(variationId: string, productId: string): Promise<ProductVariationData | null>;
  addVariation(productId: string, variation: ProductVariationData): Promise<ProductVariationData>;
  updateVariation(variationId: string, productId: string, data: Partial<ProductVariationData>): Promise<ProductVariationData | null>;
  deleteVariation(variationId: string, productId: string): Promise<boolean>;

  // ── Custom field sub-resource ───────────────────────────
  findCustomFieldsByProduct(productId: string): Promise<ProductCustomFieldData[]>;
  findCustomFieldById(fieldId: string, productId: string): Promise<ProductCustomFieldData | null>;
  addCustomField(productId: string, field: ProductCustomFieldData): Promise<ProductCustomFieldData>;
  updateCustomField(fieldId: string, productId: string, data: Partial<ProductCustomFieldData>): Promise<ProductCustomFieldData | null>;
  deleteCustomField(fieldId: string, productId: string): Promise<boolean>;
}
