import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ilike, sql, asc, desc, type SQL } from 'drizzle-orm';
import { escapeLikePattern } from '../../../../../../common/utils/sql.util.js';
import { randomUUID } from 'node:crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { DbClient } from '../../../../../../common/database/transaction.helper.js';
import type { ProductRepositoryPort } from '../../../../domain/ports/output/product.repository.port.js';
import {
  Product,
  type ProductStatus,
  type ProductDimensions,
  type VariationAttribute,
  type ProductVariationData,
  type ProductPhotoData,
  type ProductCustomFieldData,
} from '../../../../domain/entities/product.entity.js';
import {
  products,
  productVariations,
  productPhotos,
  productCustomFields,
} from './product.schema.js';
import type { PaginationQuery } from '../../../../../../common/types/api-response.type.js';

@Injectable()
export class DrizzleProductRepository implements ProductRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(product: Product, tx?: DbClient): Promise<Product> {
    const db = tx ?? this.db;
    await db.insert(products).values({
      id: product.id,
      tenantId: product.tenantId,
      categoryId: product.categoryId,
      name: product.name,
      sku: product.sku,
      description: product.description,
      basePrice: String(product.basePrice),
      costPrice: product.costPrice != null ? String(product.costPrice) : null,
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      stockAlert: product.stockAlert,
      trackInventory: product.trackInventory,
      barcode: product.barcode,
      weight: product.weight != null ? String(product.weight) : null,
      dimensions: product.dimensions,
      tags: product.tags,
      imageUrl: product.imageUrl,
      status: product.status,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
    return product;
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const product = this.toDomain(row);
    await this.loadAggregates(product);
    return product;
  }

  async findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; categoryId?: string; search?: string },
  ): Promise<[Product[], number]> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(products.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(products.status, filters.status as 'active' | 'inactive' | 'draft'));
    if (filters?.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
    if (filters?.search) {
      conditions.push(
        sql`(${ilike(products.name, `%${escapeLikePattern(filters.search)}%`)} OR ${ilike(products.sku, `%${escapeLikePattern(filters.search)}%`)})`,

      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn = this.getSortColumn(sortBy);
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const rows = await this.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return [rows.map((row) => this.toDomain(row)), total];
  }

  private getSortColumn(sortBy?: string) {
    const sortMap: Record<string, any> = {
      name: products.name,
      basePrice: products.basePrice,
      stock: products.stock,
      status: products.status,
      createdAt: products.createdAt,
    };
    return sortMap[sortBy ?? 'createdAt'] ?? products.createdAt;
  }

  async update(product: Product, tx?: DbClient): Promise<Product> {
    const db = tx ?? this.db;
    await db
      .update(products)
      .set({
        categoryId: product.categoryId,
        name: product.name,
        sku: product.sku,
        description: product.description,
        basePrice: String(product.basePrice),
        costPrice:
          product.costPrice != null ? String(product.costPrice) : null,
        stock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        stockAlert: product.stockAlert,
        trackInventory: product.trackInventory,
        barcode: product.barcode,
        weight: product.weight != null ? String(product.weight) : null,
        dimensions: product.dimensions,
        tags: product.tags,
        imageUrl: product.imageUrl,
        status: product.status,
        isActive: product.isActive,
        updatedAt: product.updatedAt,
      })
      .where(
        and(
          eq(products.id, product.id),
          eq(products.tenantId, product.tenantId),
        ),
      );
    return product;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
  }

  async saveVariations(product: Product, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    // Delete existing and re-insert
    await db
      .delete(productVariations)
      .where(eq(productVariations.productId, product.id));

    if (product.variations.length > 0) {
      await db.insert(productVariations).values(
        product.variations.map((v) => ({
          id: v.id || randomUUID(),
          productId: product.id,
          name: v.name,
          sku: v.sku,
          attributes: v.attributes,
          price: String(v.price),
          stock: v.stock,
          imageUrl: v.imageUrl,
          sortOrder: v.sortOrder,
        })),
      );
    }
  }

  async savePhotos(product: Product, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    await db
      .delete(productPhotos)
      .where(eq(productPhotos.productId, product.id));

    if (product.photos.length > 0) {
      await db.insert(productPhotos).values(
        product.photos.map((p) => ({
          id: p.id || randomUUID(),
          productId: product.id,
          variationId: p.variationId,
          url: p.url,
          isMain: p.isMain,
          sortOrder: p.sortOrder,
        })),
      );
    }
  }

  async saveCustomFields(product: Product, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    await db
      .delete(productCustomFields)
      .where(eq(productCustomFields.productId, product.id));

    if (product.customFields.length > 0) {
      await db.insert(productCustomFields).values(
        product.customFields.map((cf) => ({
          id: cf.id || randomUUID(),
          productId: product.id,
          variationId: cf.variationId,
          key: cf.key,
          value: cf.value,
          type: cf.type,
          sortOrder: cf.sortOrder,
        })),
      );
    }
  }

  private async loadAggregates(product: Product): Promise<void> {
    const [variationRows, photoRows, customFieldRows] = await Promise.all([
      this.db
        .select()
        .from(productVariations)
        .where(eq(productVariations.productId, product.id))
        .orderBy(productVariations.sortOrder),
      this.db
        .select()
        .from(productPhotos)
        .where(eq(productPhotos.productId, product.id))
        .orderBy(productPhotos.sortOrder),
      this.db
        .select()
        .from(productCustomFields)
        .where(eq(productCustomFields.productId, product.id))
        .orderBy(productCustomFields.sortOrder),
    ]);

    product.setVariations(
      variationRows.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        attributes: (v.attributes as VariationAttribute[]) ?? [],
        price: Number(v.price),
        stock: v.stock,
        imageUrl: v.imageUrl,
        sortOrder: v.sortOrder,
      })),
    );

    product.setPhotos(
      photoRows.map((p) => ({
        id: p.id,
        url: p.url,
        isMain: p.isMain,
        sortOrder: p.sortOrder,
        variationId: p.variationId,
      })),
    );

    product.setCustomFields(
      customFieldRows.map((cf) => ({
        id: cf.id,
        key: cf.key,
        value: cf.value,
        type: cf.type as 'text' | 'number' | 'date' | 'boolean',
        sortOrder: cf.sortOrder,
        variationId: cf.variationId,
      })),
    );
  }

  private toDomain(row: typeof products.$inferSelect): Product {
    return new Product(
      row.id,
      row.tenantId,
      row.name,
      row.sku,
      row.description,
      row.categoryId,
      Number(row.basePrice),
      row.costPrice != null ? Number(row.costPrice) : null,
      row.stock,
      row.minStock,
      row.maxStock,
      row.stockAlert,
      row.trackInventory,
      row.barcode,
      row.weight != null ? Number(row.weight) : null,
      row.dimensions as ProductDimensions | null,
      (row.tags as string[]) ?? [],
      row.imageUrl,
      row.status as ProductStatus,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  // ── Variation sub-resource ──────────────────────────────

  async findVariationsByProduct(productId: string): Promise<ProductVariationData[]> {
    const rows = await this.db
      .select()
      .from(productVariations)
      .where(eq(productVariations.productId, productId))
      .orderBy(productVariations.sortOrder);

    return rows.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      attributes: (v.attributes as VariationAttribute[]) ?? [],
      price: Number(v.price),
      stock: v.stock,
      imageUrl: v.imageUrl,
      sortOrder: v.sortOrder,
    }));
  }

  async findVariationById(variationId: string, productId: string): Promise<ProductVariationData | null> {
    const rows = await this.db
      .select()
      .from(productVariations)
      .where(and(eq(productVariations.id, variationId), eq(productVariations.productId, productId)))
      .limit(1);

    const v = rows[0];
    if (!v) return null;
    return {
      id: v.id,
      name: v.name,
      sku: v.sku,
      attributes: (v.attributes as VariationAttribute[]) ?? [],
      price: Number(v.price),
      stock: v.stock,
      imageUrl: v.imageUrl,
      sortOrder: v.sortOrder,
    };
  }

  async addVariation(productId: string, variation: ProductVariationData): Promise<ProductVariationData> {
    await this.db.insert(productVariations).values({
      id: variation.id,
      productId,
      name: variation.name,
      sku: variation.sku,
      attributes: variation.attributes,
      price: String(variation.price),
      stock: variation.stock,
      imageUrl: variation.imageUrl,
      sortOrder: variation.sortOrder,
    });
    return variation;
  }

  async updateVariation(variationId: string, productId: string, data: Partial<ProductVariationData>): Promise<ProductVariationData | null> {
    const set: Record<string, unknown> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.sku !== undefined) set.sku = data.sku;
    if (data.attributes !== undefined) set.attributes = data.attributes;
    if (data.price !== undefined) set.price = String(data.price);
    if (data.stock !== undefined) set.stock = data.stock;
    if (data.imageUrl !== undefined) set.imageUrl = data.imageUrl;
    if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
    set.updatedAt = new Date();

    await this.db
      .update(productVariations)
      .set(set)
      .where(and(eq(productVariations.id, variationId), eq(productVariations.productId, productId)));

    return this.findVariationById(variationId, productId);
  }

  async deleteVariation(variationId: string, productId: string): Promise<boolean> {
    const result = await this.db
      .delete(productVariations)
      .where(and(eq(productVariations.id, variationId), eq(productVariations.productId, productId)));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Custom field sub-resource ───────────────────────────

  async findCustomFieldsByProduct(productId: string): Promise<ProductCustomFieldData[]> {
    const rows = await this.db
      .select()
      .from(productCustomFields)
      .where(eq(productCustomFields.productId, productId))
      .orderBy(productCustomFields.sortOrder);

    return rows.map((cf) => ({
      id: cf.id,
      key: cf.key,
      value: cf.value,
      type: cf.type as 'text' | 'number' | 'date' | 'boolean',
      sortOrder: cf.sortOrder,
      variationId: cf.variationId,
    }));
  }

  async findCustomFieldById(fieldId: string, productId: string): Promise<ProductCustomFieldData | null> {
    const rows = await this.db
      .select()
      .from(productCustomFields)
      .where(and(eq(productCustomFields.id, fieldId), eq(productCustomFields.productId, productId)))
      .limit(1);

    const cf = rows[0];
    if (!cf) return null;
    return {
      id: cf.id,
      key: cf.key,
      value: cf.value,
      type: cf.type as 'text' | 'number' | 'date' | 'boolean',
      sortOrder: cf.sortOrder,
      variationId: cf.variationId,
    };
  }

  async addCustomField(productId: string, field: ProductCustomFieldData): Promise<ProductCustomFieldData> {
    await this.db.insert(productCustomFields).values({
      id: field.id,
      productId,
      variationId: field.variationId,
      key: field.key,
      value: field.value,
      type: field.type,
      sortOrder: field.sortOrder,
    });
    return field;
  }

  async updateCustomField(fieldId: string, productId: string, data: Partial<ProductCustomFieldData>): Promise<ProductCustomFieldData | null> {
    const set: Record<string, unknown> = {};
    if (data.key !== undefined) set.key = data.key;
    if (data.value !== undefined) set.value = data.value;
    if (data.type !== undefined) set.type = data.type;
    if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
    if (data.variationId !== undefined) set.variationId = data.variationId;

    await this.db
      .update(productCustomFields)
      .set(set)
      .where(and(eq(productCustomFields.id, fieldId), eq(productCustomFields.productId, productId)));

    return this.findCustomFieldById(fieldId, productId);
  }

  async deleteCustomField(fieldId: string, productId: string): Promise<boolean> {
    const result = await this.db
      .delete(productCustomFields)
      .where(and(eq(productCustomFields.id, fieldId), eq(productCustomFields.productId, productId)));
    return (result.rowCount ?? 0) > 0;
  }
}
