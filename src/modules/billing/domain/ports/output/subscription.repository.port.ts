import type { Subscription } from '../../entities/subscription.entity.js';
import type { DbClient } from '../../../../../common/database/transaction.helper.js';

export interface SubscriptionRepositoryPort {
  save(subscription: Subscription): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByTenantId(tenantId: string): Promise<Subscription[]>;
  findActiveByTenantId(tenantId: string): Promise<Subscription[]>;
  findDueToBill(date: Date): Promise<Subscription[]>;
  findExpiredTrials(): Promise<Subscription[]>;
  update(subscription: Subscription, tx?: DbClient): Promise<Subscription>;
}
