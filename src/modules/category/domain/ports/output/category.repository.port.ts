import type { Category, CategoryType } from '../../entities/category.entity.js';

export interface CategoryRepositoryPort {
  save(category: Category): Promise<Category>;
  findById(id: string, tenantId: string): Promise<Category | null>;
  findAllByTenant(tenantId: string, type?: CategoryType): Promise<Category[]>;
  update(category: Category): Promise<Category>;
  delete(id: string, tenantId: string): Promise<void>;
}
