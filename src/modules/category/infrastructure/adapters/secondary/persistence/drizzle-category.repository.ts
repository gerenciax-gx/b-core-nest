import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ilike, sql, asc, desc, type SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { CategoryRepositoryPort } from '../../../../domain/ports/output/category.repository.port.js';
import {
  Category,
  type CategoryType,
} from '../../../../domain/entities/category.entity.js';
import { categories } from './category.schema.js';
import type { PaginationQuery } from '../../../../../../common/types/api-response.type.js';

@Injectable()
export class DrizzleCategoryRepository implements CategoryRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(category: Category): Promise<Category> {
    await this.db.insert(categories).values({
      id: category.id,
      tenantId: category.tenantId,
      name: category.name,
      type: category.type,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
    return category;
  }

  async findById(id: string, tenantId: string): Promise<Category | null> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.toDomain(row);
  }

  async findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { type?: CategoryType; search?: string },
  ): Promise<[Category[], number]> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(categories.tenantId, tenantId)];
    if (filters?.type) conditions.push(eq(categories.type, filters.type));
    if (filters?.search) {
      conditions.push(ilike(categories.name, `%${filters.search}%`));
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn = this.getSortColumn(sortBy);
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const rows = await this.db
      .select()
      .from(categories)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return [rows.map((row) => this.toDomain(row)), total];
  }

  private getSortColumn(sortBy?: string) {
    const sortMap: Record<string, any> = {
      name: categories.name,
      sortOrder: categories.sortOrder,
      createdAt: categories.createdAt,
    };
    return sortMap[sortBy ?? 'sortOrder'] ?? categories.sortOrder;
  }

  async update(category: Category): Promise<Category> {
    await this.db
      .update(categories)
      .set({
        name: category.name,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        updatedAt: category.updatedAt,
      })
      .where(
        and(
          eq(categories.id, category.id),
          eq(categories.tenantId, category.tenantId),
        ),
      );
    return category;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)));
  }

  private toDomain(row: typeof categories.$inferSelect): Category {
    return new Category(
      row.id,
      row.tenantId,
      row.name,
      row.type as CategoryType,
      row.isActive,
      row.sortOrder,
      row.createdAt,
      row.updatedAt,
    );
  }
}
