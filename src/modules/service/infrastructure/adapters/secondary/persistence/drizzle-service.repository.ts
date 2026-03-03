import { Inject, Injectable } from '@nestjs/common';
import { eq, and, ilike, sql, asc, desc, inArray, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
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

  async save(service: Service): Promise<Service> {
    await this.db.insert(services).values({
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
      conditions.push(ilike(services.name, `%${filters.search}%`));
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

  async update(service: Service): Promise<Service> {
    await this.db
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

  async savePriceVariations(service: Service): Promise<void> {
    await this.db
      .delete(servicePriceVariations)
      .where(eq(servicePriceVariations.serviceId, service.id));

    if (service.priceVariations.length > 0) {
      await this.db.insert(servicePriceVariations).values(
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

  async savePhotos(service: Service): Promise<void> {
    await this.db
      .delete(servicePhotos)
      .where(eq(servicePhotos.serviceId, service.id));

    if (service.photos.length > 0) {
      await this.db.insert(servicePhotos).values(
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

  async saveProfessionals(service: Service): Promise<void> {
    await this.db
      .delete(serviceProfessionals)
      .where(eq(serviceProfessionals.serviceId, service.id));

    if (service.professionals.length > 0) {
      await this.db.insert(serviceProfessionals).values(
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
}
