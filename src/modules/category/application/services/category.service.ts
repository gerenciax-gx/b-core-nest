import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CategoryRepositoryPort } from '../../domain/ports/output/category.repository.port.js';
import { Category, type CategoryType } from '../../domain/entities/category.entity.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from '../dto/category.dto.js';
import type { ListCategoriesQueryDto } from '../dto/list-categories-query.dto.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';
import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';

@Injectable()
export class CategoryService {
  constructor(
    @Inject('CategoryRepositoryPort')
    private readonly categoryRepo: CategoryRepositoryPort,
  ) {}

  async create(
    tenantId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = Category.create({
      tenantId,
      name: dto.name,
      type: dto.type,
      sortOrder: dto.sortOrder,
    });
    await this.categoryRepo.save(category);
    return this.toResponse(category);
  }

  async findAll(
    tenantId: string,
    query: ListCategoriesQueryDto,
  ): Promise<PaginatedResponse<CategoryResponseDto>> {
    const { page = 1, limit = 20 } = query;
    const validType = query.type as CategoryType | undefined;

    const [categories, total] = await this.categoryRepo.findAllByTenant(
      tenantId,
      { page, limit, sortBy: query.sortBy, sortOrder: query.sortOrder },
      { type: validType, search: query.search },
    );

    const data = categories.map((c) => this.toResponse(c));
    return createPaginatedResponse(data, total, page, limit);
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findById(id, tenantId);
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return this.toResponse(category);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findById(id, tenantId);
    if (!category) throw new NotFoundException('Categoria não encontrada');

    category.update({
      name: dto.name,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    });
    await this.categoryRepo.update(category);
    return this.toResponse(category);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const category = await this.categoryRepo.findById(id, tenantId);
    if (!category) throw new NotFoundException('Categoria não encontrada');
    await this.categoryRepo.delete(id, tenantId);
  }

  private toResponse(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
