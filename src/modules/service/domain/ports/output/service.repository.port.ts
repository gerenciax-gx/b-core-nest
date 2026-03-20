import type { Service, PriceVariationData, ServicePhotoData, ServiceProfessionalData } from '../../entities/service.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';
import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface ServiceRepositoryPort {
  save(service: Service, tx?: DbClient): Promise<Service>;
  findById(id: string, tenantId: string): Promise<Service | null>;
  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; categoryId?: string; search?: string },
  ): Promise<[Service[], number]>;
  update(service: Service, tx?: DbClient): Promise<Service>;
  delete(id: string, tenantId: string): Promise<void>;
  savePriceVariations(service: Service, tx?: DbClient): Promise<void>;
  savePhotos(service: Service, tx?: DbClient): Promise<void>;
  saveProfessionals(service: Service, tx?: DbClient): Promise<void>;

  // ── Price Variation sub-resource ─────────────────────────
  findPriceVariationsByService(serviceId: string): Promise<PriceVariationData[]>;
  findPriceVariationById(variationId: string, serviceId: string): Promise<PriceVariationData | null>;
  addPriceVariation(serviceId: string, variation: PriceVariationData): Promise<PriceVariationData>;
  updatePriceVariation(variationId: string, serviceId: string, data: Partial<PriceVariationData>): Promise<PriceVariationData | null>;
  deletePriceVariation(variationId: string, serviceId: string): Promise<boolean>;

  // ── Photo sub-resource ──────────────────────────────────
  findPhotosByService(serviceId: string): Promise<ServicePhotoData[]>;
  addPhoto(serviceId: string, photo: ServicePhotoData): Promise<ServicePhotoData>;
  deletePhoto(photoId: string, serviceId: string): Promise<boolean>;

  // ── Professional sub-resource ───────────────────────────
  findProfessionalsByService(serviceId: string): Promise<ServiceProfessionalData[]>;
  addProfessional(serviceId: string, professional: ServiceProfessionalData): Promise<ServiceProfessionalData>;
  deleteProfessional(collaboratorId: string, serviceId: string): Promise<boolean>;
}
