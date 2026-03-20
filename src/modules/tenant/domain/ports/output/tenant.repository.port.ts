import { Tenant } from '../../entities/tenant.entity.js';
import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface TenantRepositoryPort {
  save(tenant: Tenant, tx?: DbClient): Promise<Tenant>;
  findById(id: string): Promise<Tenant | null>;
  update(tenant: Tenant): Promise<Tenant>;
}
