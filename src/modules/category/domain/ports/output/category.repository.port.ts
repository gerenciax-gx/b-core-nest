import type { Category, CategoryType } from '../../entities/category.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';

export interface CategoryRepositoryPort {
  save(category: Category): Promise<Category>;
  findById(id: string, tenantId: string): Promise<Category | null>;
  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { type?: CategoryType; search?: string },
  ): Promise<[Category[], number]>;
  update(category: Category): Promise<Category>;
  delete(id: string, tenantId: string): Promise<void>;
}
