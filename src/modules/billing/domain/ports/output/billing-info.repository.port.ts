import type { BillingInfo } from '../../entities/billing-info.entity.js';

export interface BillingInfoRepositoryPort {
  save(billingInfo: BillingInfo): Promise<BillingInfo>;
  findByTenantId(tenantId: string): Promise<BillingInfo | null>;
  update(billingInfo: BillingInfo): Promise<BillingInfo>;
}
