import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ilike, sql, asc, desc, inArray, type SQL } from 'drizzle-orm';
import { escapeLikePattern } from '../../../../../../common/utils/sql.util.js';
import { randomUUID } from 'node:crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type { DbClient } from '../../../../../../common/database/transaction.helper.js';
import type { ServiceRepositoryPort } from '../../../../domain/ports/output/service.repository.port.js';
import {
  Service,
  type ServiceStatus,
  type PriceVariationData,
  type ServicePhotoData,
  type ServiceProfessionalData,
} from '../../../../domain/entities/service.entity.js';
import {
  services,
  servicePriceVariations,
  servicePhotos,
  serviceProfessionals,
} from './service.schema.js';
import type { PaginationQuery } from '../../../../../../common/types/api-response.type.js';

@Injectable()
export class DrizzleServiceRepository implements ServiceRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  async save(service: Service, tx?: DbClient): Promise<Service> {
    const db = tx ?? this.db;
    await db.insert(services).values({
      id: service.id,
      tenantId: service.tenantId,
      categoryId: service.categoryId,
      name: service.name,
      description: service.description,
      basePrice: String(service.basePrice),
      durationMinutes: service.durationMinutes,
      imageUrl: service.imageUrl,
      status: service.status,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    });
    return service;
  }

  async findById(id: string, tenantId: string): Promise<Service | null> {
    const rows = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const service = this.toDomain(row);
    await this.loadAggregates(service);
    return service;
  }

  async findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; categoryId?: string; search?: string },
  ): Promise<[Service[], number]> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(services.tenantId, tenantId)];
    if (filters?.status) conditions.push(eq(services.status, filters.status as 'active' | 'inactive' | 'paused'));
    if (filters?.categoryId) conditions.push(eq(services.categoryId, filters.categoryId));
    if (filters?.search) {
      conditions.push(ilike(services.name, `%${escapeLikePattern(filters.search)}%`));
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(services)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn = this.getSortColumn(sortBy);
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const rows = await this.db
      .select()
      .from(services)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const serviceList = rows.map((row) => this.toDomain(row));

    // Batch load professionals (avoid N+1)
    if (serviceList.length > 0) {
      const serviceIds = serviceList.map((s) => s.id);
      const profRows = await this.db
        .select()
        .from(serviceProfessionals)
        .where(inArray(serviceProfessionals.serviceId, serviceIds));

      const profMap = new Map<string, { id: string; collaboratorId: string | null }[]>();
      for (const p of profRows) {
        const list = profMap.get(p.serviceId) ?? [];
        list.push({ id: p.id, collaboratorId: p.collaboratorId });
        profMap.set(p.serviceId, list);
      }
      for (const service of serviceList) {
        service.setProfessionals(profMap.get(service.id) ?? []);
      }
    }

    return [serviceList, total];
  }

  private getSortColumn(sortBy?: string) {
    const sortMap: Record<string, any> = {
      name: services.name,
      basePrice: services.basePrice,
      durationMinutes: services.durationMinutes,
      status: services.status,
      createdAt: services.createdAt,
    };
    return sortMap[sortBy ?? 'createdAt'] ?? services.createdAt;
  }

  async update(service: Service, tx?: DbClient): Promise<Service> {
    const db = tx ?? this.db;
    await db
      .update(services)
      .set({
        categoryId: service.categoryId,
        name: service.name,
        description: service.description,
        basePrice: String(service.basePrice),
        durationMinutes: service.durationMinutes,
        imageUrl: service.imageUrl,
        status: service.status,
        isActive: service.isActive,
        updatedAt: service.updatedAt,
      })
      .where(
        and(
          eq(services.id, service.id),
          eq(services.tenantId, service.tenantId),
        ),
      );
    return service;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.db
      .delete(services)
      .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
  }

  async savePriceVariations(service: Service, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    await db
      .delete(servicePriceVariations)
      .where(eq(servicePriceVariations.serviceId, service.id));

    if (service.priceVariations.length > 0) {
      await db.insert(servicePriceVariations).values(
        service.priceVariations.map((v) => ({
          id: v.id || randomUUID(),
          serviceId: service.id,
          name: v.name,
          price: String(v.price),
          durationMinutes: v.durationMinutes,
          durationMinMinutes: v.durationMinMinutes,
          durationMaxMinutes: v.durationMaxMinutes,
          sortOrder: v.sortOrder,
        })),
      );
    }
  }

  async savePhotos(service: Service, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    await db
      .delete(servicePhotos)
      .where(eq(servicePhotos.serviceId, service.id));

    if (service.photos.length > 0) {
      await db.insert(servicePhotos).values(
        service.photos.map((p) => ({
          id: p.id || randomUUID(),
          serviceId: service.id,
          priceVariationId: p.priceVariationId,
          url: p.url,
          isMain: p.isMain,
          sortOrder: p.sortOrder,
        })),
      );
    }
  }

  async saveProfessionals(service: Service, tx?: DbClient): Promise<void> {
    const db = tx ?? this.db;
    await db
      .delete(serviceProfessionals)
      .where(eq(serviceProfessionals.serviceId, service.id));

    if (service.professionals.length > 0) {
      await db.insert(serviceProfessionals).values(
        service.professionals.map((p) => ({
          id: p.id || randomUUID(),
          serviceId: service.id,
          collaboratorId: p.collaboratorId,
        })),
      );
    }
  }

  private async loadAggregates(service: Service): Promise<void> {
    const [variationRows, photoRows, profRows] = await Promise.all([
      this.db
        .select()
        .from(servicePriceVariations)
        .where(eq(servicePriceVariations.serviceId, service.id))
        .orderBy(servicePriceVariations.sortOrder),
      this.db
        .select()
        .from(servicePhotos)
        .where(eq(servicePhotos.serviceId, service.id))
        .orderBy(servicePhotos.sortOrder),
      this.db
        .select()
        .from(serviceProfessionals)
        .where(eq(serviceProfessionals.serviceId, service.id)),
    ]);

    service.setPriceVariations(
      variationRows.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        durationMinutes: v.durationMinutes,
        durationMinMinutes: v.durationMinMinutes,
        durationMaxMinutes: v.durationMaxMinutes,
        sortOrder: v.sortOrder,
      })),
    );

    service.setPhotos(
      photoRows.map((p) => ({
        id: p.id,
        url: p.url,
        isMain: p.isMain,
        sortOrder: p.sortOrder,
        priceVariationId: p.priceVariationId,
      })),
    );

    service.setProfessionals(
      profRows.map((p) => ({
        id: p.id,
        collaboratorId: p.collaboratorId,
      })),
    );
  }

  private toDomain(row: typeof services.$inferSelect): Service {
    return new Service(
      row.id,
      row.tenantId,
      row.name,
      row.description,
      row.categoryId,
      Number(row.basePrice),
      row.durationMinutes,
      row.imageUrl,
      row.status as ServiceStatus,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  // ── Price Variation sub-resource ────────────────────────

  async findPriceVariationsByService(serviceId: string): Promise<PriceVariationData[]> {
    const rows = await this.db
      .select()
      .from(servicePriceVariations)
      .where(eq(servicePriceVariations.serviceId, serviceId))
      .orderBy(servicePriceVariations.sortOrder);

    return rows.map((v) => ({
      id: v.id,
      name: v.name,
      price: Number(v.price),
      durationMinutes: v.durationMinutes,
      durationMinMinutes: v.durationMinMinutes,
      durationMaxMinutes: v.durationMaxMinutes,
      sortOrder: v.sortOrder,
    }));
  }

  async findPriceVariationById(variationId: string, serviceId: string): Promise<PriceVariationData | null> {
    const rows = await this.db
      .select()
      .from(servicePriceVariations)
      .where(and(eq(servicePriceVariations.id, variationId), eq(servicePriceVariations.serviceId, serviceId)))
      .limit(1);

    const v = rows[0];
    if (!v) return null;
    return {
      id: v.id,
      name: v.name,
      price: Number(v.price),
      durationMinutes: v.durationMinutes,
      durationMinMinutes: v.durationMinMinutes,
      durationMaxMinutes: v.durationMaxMinutes,
      sortOrder: v.sortOrder,
    };
  }

  async addPriceVariation(serviceId: string, variation: PriceVariationData): Promise<PriceVariationData> {
    await this.db.insert(servicePriceVariations).values({
      id: variation.id,
      serviceId,
      name: variation.name,
      price: String(variation.price),
      durationMinutes: variation.durationMinutes,
      durationMinMinutes: variation.durationMinMinutes,
      durationMaxMinutes: variation.durationMaxMinutes,
      sortOrder: variation.sortOrder,
    });
    return variation;
  }

  async updatePriceVariation(variationId: string, serviceId: string, data: Partial<PriceVariationData>): Promise<PriceVariationData | null> {
    const set: Record<string, unknown> = {};
    if (data.name !== undefined) set.name = data.name;
    if (data.price !== undefined) set.price = String(data.price);
    if (data.durationMinutes !== undefined) set.durationMinutes = data.durationMinutes;
    if (data.durationMinMinutes !== undefined) set.durationMinMinutes = data.durationMinMinutes;
    if (data.durationMaxMinutes !== undefined) set.durationMaxMinutes = data.durationMaxMinutes;
    if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
    set.updatedAt = new Date();

    await this.db
      .update(servicePriceVariations)
      .set(set)
      .where(and(eq(servicePriceVariations.id, variationId), eq(servicePriceVariations.serviceId, serviceId)));

    return this.findPriceVariationById(variationId, serviceId);
  }

  async deletePriceVariation(variationId: string, serviceId: string): Promise<boolean> {
    const result = await this.db
      .delete(servicePriceVariations)
      .where(and(eq(servicePriceVariations.id, variationId), eq(servicePriceVariations.serviceId, serviceId)));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Photo sub-resource ──────────────────────────────────

  async findPhotosByService(serviceId: string): Promise<ServicePhotoData[]> {
    const rows = await this.db
      .select()
      .from(servicePhotos)
      .where(eq(servicePhotos.serviceId, serviceId))
      .orderBy(servicePhotos.sortOrder);

    return rows.map((p) => ({
      id: p.id,
      url: p.url,
      isMain: p.isMain,
      sortOrder: p.sortOrder,
      priceVariationId: p.priceVariationId,
    }));
  }

  async addPhoto(serviceId: string, photo: ServicePhotoData): Promise<ServicePhotoData> {
    await this.db.insert(servicePhotos).values({
      id: photo.id,
      serviceId,
      priceVariationId: photo.priceVariationId,
      url: photo.url,
      isMain: photo.isMain,
      sortOrder: photo.sortOrder,
    });
    return photo;
  }

  async deletePhoto(photoId: string, serviceId: string): Promise<boolean> {
    const result = await this.db
      .delete(servicePhotos)
      .where(and(eq(servicePhotos.id, photoId), eq(servicePhotos.serviceId, serviceId)));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Professional sub-resource ───────────────────────────

  async findProfessionalsByService(serviceId: string): Promise<ServiceProfessionalData[]> {
    const rows = await this.db
      .select()
      .from(serviceProfessionals)
      .where(eq(serviceProfessionals.serviceId, serviceId));

    return rows.map((p) => ({
      id: p.id,
      collaboratorId: p.collaboratorId,
    }));
  }

  async addProfessional(serviceId: string, professional: ServiceProfessionalData): Promise<ServiceProfessionalData> {
    await this.db.insert(serviceProfessionals).values({
      id: professional.id,
      serviceId,
      collaboratorId: professional.collaboratorId,
    });
    return professional;
  }

  async deleteProfessional(collaboratorId: string, serviceId: string): Promise<boolean> {
    const result = await this.db
      .delete(serviceProfessionals)
      .where(and(eq(serviceProfessionals.collaboratorId, collaboratorId), eq(serviceProfessionals.serviceId, serviceId)));
    return (result.rowCount ?? 0) > 0;
  }
}
