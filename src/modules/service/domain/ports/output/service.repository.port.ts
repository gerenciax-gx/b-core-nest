import type { Service } from '../../entities/service.entity.js';

export interface ServiceRepositoryPort {
  save(service: Service): Promise<Service>;
  findById(id: string, tenantId: string): Promise<Service | null>;
  findAllByTenant(tenantId: string): Promise<Service[]>;
  update(service: Service): Promise<Service>;
  delete(id: string, tenantId: string): Promise<void>;
  savePriceVariations(service: Service): Promise<void>;
  savePhotos(service: Service): Promise<void>;
  saveProfessionals(service: Service): Promise<void>;
}
