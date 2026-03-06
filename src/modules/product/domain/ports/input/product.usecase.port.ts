import type {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductListItemDto,
} from '../../../application/dto/product.dto.js';
import type { ListProductsQueryDto } from '../../../application/dto/list-products-query.dto.js';
import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';

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
}
