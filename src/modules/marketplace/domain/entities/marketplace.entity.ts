// ── Tool Types ──────────────────────────────────────────────
export type ToolType = 'core' | 'addon';
export type PlanInterval = 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

// ── Plan Feature ────────────────────────────────────────────
export class PlanFeature {
  constructor(
    public readonly id: string,
    public readonly planId: string,
    public readonly featureKey: string,
    public readonly featureValue: string,
    public readonly isHighlighted: boolean,
    public readonly order: number,
  ) {}
}

// ── Tool Plan ───────────────────────────────────────────────
export class ToolPlan {
  constructor(
    public readonly id: string,
    public readonly toolId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly interval: PlanInterval,
    public readonly isPopular: boolean,
    public readonly isActive: boolean,
    public readonly maxUsers: number | null,
    public readonly maxItems: number | null,
    public readonly features: PlanFeature[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

// ── Tool ────────────────────────────────────────────────────
export class Tool {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly category: string | null,
    public readonly type: ToolType,
    public readonly iconUrl: string | null,
    public readonly isActive: boolean,
    public readonly trialDays: number,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly plans: ToolPlan[] = [],
  ) {}
}

// ── Tenant Subscription ─────────────────────────────────────
export class TenantSubscription {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly planId: string,
    public readonly status: SubscriptionStatus,
    public readonly trialEndsAt: Date | null,
    public readonly startDate: Date,
    public readonly endDate: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
