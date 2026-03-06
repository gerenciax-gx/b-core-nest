import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ProductUseCasePort } from '../../domain/ports/input/product.usecase.port.js';
import type { ProductRepositoryPort } from '../../domain/ports/output/product.repository.port.js';
import { Product } from '../../domain/entities/product.entity.js';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductListItemDto,
} from '../dto/product.dto.js';
import type { ListProductsQueryDto } from '../dto/list-products-query.dto.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';
import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';

@Injectable()
export class ProductService implements ProductUseCasePort {
  constructor(
    @Inject('ProductRepositoryPort')
    private readonly productRepo: ProductRepositoryPort,
  ) {}

  async create(
    tenantId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = Product.create({
      tenantId,
      name: dto.name,
      sku: dto.sku,
      description: dto.description,
      categoryId: dto.category,
      basePrice: dto.basePrice,
      costPrice: dto.costPrice,
      stock: dto.stock,
      minStock: dto.minStock,
      maxStock: dto.maxStock,
      stockAlert: dto.stockAlert,
      trackInventory: dto.trackInventory,
      barcode: dto.barcode,
      weight: dto.weight,
      dimensions: dto.dimensions,
      tags: dto.tags,
      status: dto.status,
    });

    await this.productRepo.save(product);

    // Save variations
    if (dto.variations && dto.variations.length > 0) {
      product.setVariations(
        dto.variations.map((v, i) => ({
          id: v.id || randomUUID(),
          name: v.name,
          sku: v.sku ?? null,
          attributes: v.attributes,
          price: v.price,
          stock: v.stock,
          imageUrl: v.imageUrl ?? null,
          sortOrder: i,
        })),
      );
      await this.productRepo.saveVariations(product);
    }

    // Save photos
    if (dto.photos && dto.photos.length > 0) {
      product.setPhotos(
        dto.photos.map((url, i) => ({
          id: randomUUID(),
          url,
          isMain: i === 0,
          sortOrder: i,
          variationId: null,
        })),
      );
      await this.productRepo.savePhotos(product);
    }

    // Save custom fields
    if (dto.customFields && dto.customFields.length > 0) {
      product.setCustomFields(
        dto.customFields.map((cf, i) => ({
          id: cf.id || randomUUID(),
          key: cf.key,
          value: cf.value,
          type: cf.type ?? 'text',
          sortOrder: i,
          variationId: null,
        })),
      );
      await this.productRepo.saveCustomFields(product);
    }

    return this.toResponse(product);
  }

  async findAll(
    tenantId: string,
    query: ListProductsQueryDto,
  ): Promise<PaginatedResponse<ProductListItemDto>> {
    const { page = 1, limit = 20 } = query;

    const [products, total] = await this.productRepo.findAllByTenant(
      tenantId,
      { page, limit, sortBy: query.sortBy, sortOrder: query.sortOrder },
      { status: query.status, categoryId: query.categoryId, search: query.search },
    );

    const data = products.map((p) => this.toListItem(p));
    return createPaginatedResponse(data, total, page, limit);
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepo.findById(id, tenantId);
    if (!product) throw new NotFoundException('Produto não encontrado');
    return this.toResponse(product);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepo.findById(id, tenantId);
    if (!product) throw new NotFoundException('Produto não encontrado');

    product.update({
      name: dto.name,
      sku: dto.sku,
      description: dto.description,
      categoryId: dto.category,
      basePrice: dto.basePrice,
      costPrice: dto.costPrice,
      stock: dto.stock,
      minStock: dto.minStock,
      maxStock: dto.maxStock,
      stockAlert: dto.stockAlert,
      trackInventory: dto.trackInventory,
      barcode: dto.barcode,
      weight: dto.weight,
      dimensions: dto.dimensions,
      tags: dto.tags,
      status: dto.status,
    });

    await this.productRepo.update(product);

    // Update variations if provided
    if (dto.variations !== undefined) {
      product.setVariations(
        (dto.variations ?? []).map((v, i) => ({
          id: v.id || randomUUID(),
          name: v.name,
          sku: v.sku ?? null,
          attributes: v.attributes,
          price: v.price,
          stock: v.stock,
          imageUrl: v.imageUrl ?? null,
          sortOrder: i,
        })),
      );
      await this.productRepo.saveVariations(product);
    }

    // Update photos if provided
    if (dto.photos !== undefined) {
      product.setPhotos(
        (dto.photos ?? []).map((url, i) => ({
          id: randomUUID(),
          url,
          isMain: i === 0,
          sortOrder: i,
          variationId: null,
        })),
      );
      await this.productRepo.savePhotos(product);
    }

    // Update custom fields if provided
    if (dto.customFields !== undefined) {
      product.setCustomFields(
        (dto.customFields ?? []).map((cf, i) => ({
          id: cf.id || randomUUID(),
          key: cf.key,
          value: cf.value,
          type: cf.type ?? 'text',
          sortOrder: i,
          variationId: null,
        })),
      );
      await this.productRepo.saveCustomFields(product);
    }

    return this.toResponse(product);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const product = await this.productRepo.findById(id, tenantId);
    if (!product) throw new NotFoundException('Produto não encontrado');
    await this.productRepo.delete(id, tenantId);
  }

  private toResponse(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      categoryId: product.categoryId,
      basePrice: product.basePrice,
      costPrice: product.costPrice,
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      stockAlert: product.stockAlert,
      trackInventory: product.trackInventory,
      barcode: product.barcode,
      weight: product.weight,
      dimensions: product.dimensions,
      tags: product.tags,
      imageUrl: product.imageUrl,
      status: product.status,
      isActive: product.isActive,
      variations: product.variations.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        attributes: v.attributes,
        price: v.price,
        stock: v.stock,
        imageUrl: v.imageUrl,
      })),
      photos: product.photos.map((p) => ({
        id: p.id,
        url: p.url,
        isMain: p.isMain,
        sortOrder: p.sortOrder,
      })),
      customFields: product.customFields.map((cf) => ({
        id: cf.id,
        key: cf.key,
        value: cf.value,
        type: cf.type,
      })),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private toListItem(product: Product): ProductListItemDto {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.basePrice,
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock ?? undefined,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
