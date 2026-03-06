import type {
  Tool,
  ToolPlan,
  TenantSubscription,
  ToolType,
} from '../../entities/marketplace.entity.js';
import type { PaginationQuery } from '../../../../../common/types/api-response.type.js';

export interface SubscriptionWithDetails {
  subscription: TenantSubscription;
  tool: Tool;
  plan: ToolPlan;
}

export interface MarketplaceRepositoryPort {
  findAllTools(
    pagination: PaginationQuery,
    filters?: { type?: ToolType; search?: string; category?: string },
  ): Promise<[Tool[], number]>;

  findToolWithPlansAndFeatures(id: string): Promise<Tool | null>;

  findPlanById(planId: string): Promise<ToolPlan | null>;

  findToolByPlanId(planId: string): Promise<Tool | null>;

  findActiveSubscriptionForTool(
    tenantId: string,
    toolId: string,
  ): Promise<TenantSubscription | null>;

  findSubscriptionsByTenant(
    tenantId: string,
  ): Promise<SubscriptionWithDetails[]>;

  createSubscription(
    tenantId: string,
    planId: string,
  ): Promise<TenantSubscription>;
}
