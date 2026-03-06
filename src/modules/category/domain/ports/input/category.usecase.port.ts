import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from '../../../application/dto/category.dto.js';
import type { ListCategoriesQueryDto } from '../../../application/dto/list-categories-query.dto.js';
import type { PaginatedResponse } from '../../../../../common/types/api-response.type.js';

export interface CategoryUseCasePort {
  create(tenantId: string, dto: CreateCategoryDto): Promise<CategoryResponseDto>;
  findAll(
    tenantId: string,
    query: ListCategoriesQueryDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>>;
  findById(id: string, tenantId: string): Promise<CategoryResponseDto>;
  update(
    id: string,
    tenantId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto>;
  delete(id: string, tenantId: string): Promise<void>;
}
