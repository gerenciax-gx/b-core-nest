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
    trialDays?: number,
  ): Promise<TenantSubscription>;

  findSubscriptionById(
    subscriptionId: string,
  ): Promise<TenantSubscription | null>;

  cancelSubscription(subscriptionId: string): Promise<void>;

  updateSubscriptionPlan(
    subscriptionId: string,
    newPlanId: string,
    activateFromTrial?: boolean,
  ): Promise<TenantSubscription>;

  /** Subscriptions com status 'trialing' e trialEndsAt <= now */
  findExpiredTrialSubscriptions(): Promise<TenantSubscription[]>;

  /** Verifica se tenant já teve trial (qualquer status) para uma tool */
  hasHadTrialForTool(tenantId: string, toolId: string): Promise<boolean>;

  /** Trials que expiraram recentemente (últimos N dias), para popup */
  findRecentlyExpiredTrials(
    tenantId: string,
    withinDays: number,
  ): Promise<{ subscriptionId: string; toolId: string; toolName: string; toolSlug: string; expiredAt: Date }[]>;
}
