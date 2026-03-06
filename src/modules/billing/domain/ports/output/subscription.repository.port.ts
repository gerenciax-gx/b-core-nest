import type { Subscription } from '../../entities/subscription.entity.js';

export interface SubscriptionRepositoryPort {
  save(subscription: Subscription): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByTenantId(tenantId: string): Promise<Subscription[]>;
  findActiveByTenantId(tenantId: string): Promise<Subscription[]>;
  findDueToBill(date: Date): Promise<Subscription[]>;
  update(subscription: Subscription): Promise<Subscription>;
}
