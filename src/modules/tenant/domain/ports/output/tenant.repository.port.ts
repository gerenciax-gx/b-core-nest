import { Tenant } from '../../entities/tenant.entity.js';

export interface TenantRepositoryPort {
  save(tenant: Tenant): Promise<Tenant>;
  findById(id: string): Promise<Tenant | null>;
  update(tenant: Tenant): Promise<Tenant>;
}
