import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
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

@Injectable()
export class DrizzleProductRepository implements ProductRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(product: Product): Promise<Product> {
    await this.db.insert(products).values({
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

  async findAllByTenant(tenantId: string): Promise<Product[]> {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(products.createdAt);

    return rows.map((row) => this.toDomain(row));
  }

  async update(product: Product): Promise<Product> {
    await this.db
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

  async saveVariations(product: Product): Promise<void> {
    // Delete existing and re-insert
    await this.db
      .delete(productVariations)
      .where(eq(productVariations.productId, product.id));

    if (product.variations.length > 0) {
      await this.db.insert(productVariations).values(
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

  async savePhotos(product: Product): Promise<void> {
    await this.db
      .delete(productPhotos)
      .where(eq(productPhotos.productId, product.id));

    if (product.photos.length > 0) {
      await this.db.insert(productPhotos).values(
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

  async saveCustomFields(product: Product): Promise<void> {
    await this.db
      .delete(productCustomFields)
      .where(eq(productCustomFields.productId, product.id));

    if (product.customFields.length > 0) {
      await this.db.insert(productCustomFields).values(
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
}
