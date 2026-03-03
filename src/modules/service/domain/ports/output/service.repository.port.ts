import type { Service } from '../../entities/service.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';

export interface ServiceRepositoryPort {
  save(service: Service): Promise<Service>;
  findById(id: string, tenantId: string): Promise<Service | null>;
  findAllByTenant(
    tenantId: string,
    pagination: PaginationQuery,
    filters?: { status?: string; categoryId?: string; search?: string },
  ): Promise<[Service[], number]>;
  update(service: Service): Promise<Service>;
  delete(id: string, tenantId: string): Promise<void>;
  savePriceVariations(service: Service): Promise<void>;
  savePhotos(service: Service): Promise<void>;
  saveProfessionals(service: Service): Promise<void>;
}
