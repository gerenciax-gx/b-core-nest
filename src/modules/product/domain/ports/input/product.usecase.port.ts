import type {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductListItemDto,
} from '../../../application/dto/product.dto.js';
import type { ListProductsQueryDto } from '../../../application/dto/list-products-query.dto.js';
import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';
import type { CreateVariationDto, UpdateVariationDto, VariationResponseDto } from '../../../application/dto/product-variation.dto.js';
import type { CreateCustomFieldDto, UpdateCustomFieldDto, CustomFieldResponseDto } from '../../../application/dto/product-custom-field.dto.js';

export interface ProductUseCasePort {
  create(tenantId: string, dto: CreateProductDto): Promise<ProductResponseDto>;
  findAll(
    tenantId: string,
    query: ListProductsQueryDto,
  ): Promise<PaginatedResponse<ProductListItemDto>>;
  findById(id: string, tenantId: string): Promise<ProductResponseDto>;
  update(
    id: string,
    tenantId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto>;
  delete(id: string, tenantId: string): Promise<void>;

  // ── Variation sub-resource ──────────────────────────────
  listVariations(productId: string, tenantId: string): Promise<VariationResponseDto[]>;
  createVariation(productId: string, tenantId: string, dto: CreateVariationDto): Promise<VariationResponseDto>;
  updateVariation(productId: string, variationId: string, tenantId: string, dto: UpdateVariationDto): Promise<VariationResponseDto>;
  deleteVariation(productId: string, variationId: string, tenantId: string): Promise<void>;

  // ── Custom field sub-resource ───────────────────────────
  listCustomFields(productId: string, tenantId: string): Promise<CustomFieldResponseDto[]>;
  createCustomField(productId: string, tenantId: string, dto: CreateCustomFieldDto): Promise<CustomFieldResponseDto>;
  updateCustomField(productId: string, fieldId: string, tenantId: string, dto: UpdateCustomFieldDto): Promise<CustomFieldResponseDto>;
  deleteCustomField(productId: string, fieldId: string, tenantId: string): Promise<void>;
}
