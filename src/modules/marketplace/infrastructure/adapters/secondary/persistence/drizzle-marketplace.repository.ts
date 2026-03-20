import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { eq, and, ilike, sql, asc, desc, type SQL } from 'drizzle-orm';
import { escapeLikePattern } from '../../../../../../common/utils/sql.util.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type {
  MarketplaceRepositoryPort,
  SubscriptionWithDetails,
} from '../../../../domain/ports/output/marketplace.repository.port.js';
import {
  Tool,
  ToolPlan,
  PlanFeature,
  TenantSubscription,
  type ToolType,
  type PlanInterval,
  type SubscriptionStatus,
} from '../../../../domain/entities/marketplace.entity.js';
import {
  tools,
  toolPlans,
  planFeatures,
  tenantToolSubscriptions,
} from './marketplace.schema.js';
import type { PaginationQuery } from '../../../../../../common/types/api-response.type.js';

@Injectable()
export class DrizzleMarketplaceRepository implements MarketplaceRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  // ── List tools (paginated, filtered) ─────────────────────
  async findAllTools(
    pagination: PaginationQuery,
    filters?: { type?: ToolType; search?: string; category?: string },
  ): Promise<[Tool[], number]> {
    const { page = 1, limit = 20, sortBy, sortOrder = 'asc' } = pagination;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(tools.isActive, true)];

    if (filters?.type) {
      conditions.push(eq(tools.type, filters.type));
    }
    if (filters?.search) {
      conditions.push(ilike(tools.name, `%${escapeLikePattern(filters.search)}%`));
    }
    if (filters?.category) {
      conditions.push(ilike(tools.category, `%${escapeLikePattern(filters.category)}%`));
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tools)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn = this.getToolSortColumn(sortBy);
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const rows = await this.db
      .select()
      .from(tools)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    return [rows.map((row) => this.toToolDomain(row)), total];
  }

  // ── Tool with plans + features ───────────────────────────
  async findToolWithPlansAndFeatures(id: string): Promise<Tool | null> {
    const toolRows = await this.db
      .select()
      .from(tools)
      .where(eq(tools.id, id))
      .limit(1);

    const toolRow = toolRows[0];
    if (!toolRow) return null;

    const planRows = await this.db
      .select()
      .from(toolPlans)
      .where(and(eq(toolPlans.toolId, id), eq(toolPlans.isActive, true)))
      .orderBy(asc(toolPlans.price));

    const planIds = planRows.map((p) => p.id);

    let featureRows: (typeof planFeatures.$inferSelect)[] = [];
    if (planIds.length > 0) {
      featureRows = await this.db
        .select()
        .from(planFeatures)
        .where(
          sql`${planFeatures.planId} IN ${planIds}`,
        )
        .orderBy(asc(planFeatures.order));
    }

    // Group features by planId
    const featureMap = new Map<string, PlanFeature[]>();
    for (const f of featureRows) {
      const list = featureMap.get(f.planId) ?? [];
      list.push(
        new PlanFeature(
          f.id,
          f.planId,
          f.featureKey,
          f.featureValue,
          f.isHighlighted,
          f.order,
        ),
      );
      featureMap.set(f.planId, list);
    }

    const domainPlans = planRows.map(
      (p) =>
        new ToolPlan(
          p.id,
          p.toolId,
          p.name,
          Number(p.price),
          p.interval as PlanInterval,
          p.isPopular,
          p.isActive,
          p.maxUsers,
          p.maxItems,
          featureMap.get(p.id) ?? [],
          p.createdAt,
          p.updatedAt,
        ),
    );

    return new Tool(
      toolRow.id,
      toolRow.name,
      toolRow.slug,
      toolRow.description,
      toolRow.category,
      toolRow.type as ToolType,
      toolRow.iconUrl,
      toolRow.isActive,
      toolRow.trialDays,
      toolRow.metadata as Record<string, unknown> | null,
      toolRow.createdAt,
      toolRow.updatedAt,
      domainPlans,
    );
  }

  // ── Find plan by ID ──────────────────────────────────────
  async findPlanById(planId: string): Promise<ToolPlan | null> {
    const rows = await this.db
      .select()
      .from(toolPlans)
      .where(eq(toolPlans.id, planId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const features = await this.db
      .select()
      .from(planFeatures)
      .where(eq(planFeatures.planId, planId))
      .orderBy(asc(planFeatures.order));

    return new ToolPlan(
      row.id,
      row.toolId,
      row.name,
      Number(row.price),
      row.interval as PlanInterval,
      row.isPopular,
      row.isActive,
      row.maxUsers,
      row.maxItems,
      features.map(
        (f) =>
          new PlanFeature(
            f.id,
            f.planId,
            f.featureKey,
            f.featureValue,
            f.isHighlighted,
            f.order,
          ),
      ),
      row.createdAt,
      row.updatedAt,
    );
  }

  // ── Find tool by plan ID ─────────────────────────────────
  async findToolByPlanId(planId: string): Promise<Tool | null> {
    const rows = await this.db
      .select({ tool: tools })
      .from(toolPlans)
      .innerJoin(tools, eq(tools.id, toolPlans.toolId))
      .where(eq(toolPlans.id, planId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.toToolDomain(row.tool);
  }

  // ── Active subscription for a specific tool ──────────────
  async findActiveSubscriptionForTool(
    tenantId: string,
    toolId: string,
  ): Promise<TenantSubscription | null> {
    const rows = await this.db
      .select({ sub: tenantToolSubscriptions })
      .from(tenantToolSubscriptions)
      .innerJoin(toolPlans, eq(toolPlans.id, tenantToolSubscriptions.planId))
      .where(
        and(
          eq(tenantToolSubscriptions.tenantId, tenantId),
          eq(toolPlans.toolId, toolId),
          sql`${tenantToolSubscriptions.status} IN ('active', 'trialing')`,
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.toSubscriptionDomain(row.sub);
  }

  // ── All subscriptions for a tenant ───────────────────────
  async findSubscriptionsByTenant(
    tenantId: string,
  ): Promise<SubscriptionWithDetails[]> {
    const rows = await this.db
      .select({
        sub: tenantToolSubscriptions,
        tool: tools,
        plan: toolPlans,
      })
      .from(tenantToolSubscriptions)
      .innerJoin(toolPlans, eq(toolPlans.id, tenantToolSubscriptions.planId))
      .innerJoin(tools, eq(tools.id, toolPlans.toolId))
      .where(
        and(
          eq(tenantToolSubscriptions.tenantId, tenantId),
          sql`${tenantToolSubscriptions.status} IN ('active', 'trialing')`,
        ),
      )
      .orderBy(desc(tenantToolSubscriptions.createdAt));

    return rows.map((row) => ({
      subscription: this.toSubscriptionDomain(row.sub),
      tool: this.toToolDomain(row.tool),
      plan: new ToolPlan(
        row.plan.id,
        row.plan.toolId,
        row.plan.name,
        Number(row.plan.price),
        row.plan.interval as PlanInterval,
        row.plan.isPopular,
        row.plan.isActive,
        row.plan.maxUsers,
        row.plan.maxItems,
        [],
        row.plan.createdAt,
        row.plan.updatedAt,
      ),
    }));
  }

  // ── Create subscription ──────────────────────────────────
  async createSubscription(
    tenantId: string,
    planId: string,
    trialDays?: number,
  ): Promise<TenantSubscription> {
    const isTrial = trialDays !== undefined && trialDays > 0;
    const trialEndsAt = isTrial
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null;

    const [row] = await this.db
      .insert(tenantToolSubscriptions)
      .values({
        tenantId,
        planId,
        status: isTrial ? 'trialing' : 'active',
        trialEndsAt,
      })
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to create subscription');
    return this.toSubscriptionDomain(row);
  }

  // ── Find subscription by ID ──────────────────────────────
  async findSubscriptionById(
    subscriptionId: string,
  ): Promise<TenantSubscription | null> {
    const [row] = await this.db
      .select()
      .from(tenantToolSubscriptions)
      .where(eq(tenantToolSubscriptions.id, subscriptionId))
      .limit(1);
    return row ? this.toSubscriptionDomain(row) : null;
  }

  // ── Cancel subscription ──────────────────────────────────
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.db
      .update(tenantToolSubscriptions)
      .set({
        status: 'cancelled',
        endDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantToolSubscriptions.id, subscriptionId));
  }

  // ── Update subscription plan ─────────────────────────────
  async updateSubscriptionPlan(
    subscriptionId: string,
    newPlanId: string,
    activateFromTrial?: boolean,
  ): Promise<TenantSubscription> {
    const setValues: Record<string, unknown> = {
      planId: newPlanId,
      updatedAt: new Date(),
    };
    if (activateFromTrial) {
      setValues['status'] = 'active';
      setValues['trialEndsAt'] = null;
    }
    const [row] = await this.db
      .update(tenantToolSubscriptions)
      .set(setValues)
      .where(eq(tenantToolSubscriptions.id, subscriptionId))
      .returning();
    if (!row) throw new InternalServerErrorException('Failed to update subscription plan');
    return this.toSubscriptionDomain(row);
  }

  // ── Private helpers ──────────────────────────────────────
  private getToolSortColumn(sortBy?: string) {
    const sortMap: Record<string, any> = {
      name: tools.name,
      type: tools.type,
      category: tools.category,
      createdAt: tools.createdAt,
    };
    return sortMap[sortBy ?? 'name'] ?? tools.name;
  }

  private toToolDomain(row: typeof tools.$inferSelect): Tool {
    return new Tool(
      row.id,
      row.name,
      row.slug,
      row.description,
      row.category,
      row.type as ToolType,
      row.iconUrl,
      row.isActive,
      row.trialDays,
      row.metadata as Record<string, unknown> | null,
      row.createdAt,
      row.updatedAt,
    );
  }

  private toSubscriptionDomain(
    row: typeof tenantToolSubscriptions.$inferSelect,
  ): TenantSubscription {
    return new TenantSubscription(
      row.id,
      row.tenantId,
      row.planId,
      row.status as SubscriptionStatus,
      row.trialEndsAt,
      row.startDate,
      row.endDate,
      row.createdAt,
      row.updatedAt,
    );
  }

  // ── Trial helpers ────────────────────────────────────────

  async findExpiredTrialSubscriptions(): Promise<TenantSubscription[]> {
    const rows = await this.db
      .select()
      .from(tenantToolSubscriptions)
      .where(
        and(
          eq(tenantToolSubscriptions.status, 'trialing'),
          sql`${tenantToolSubscriptions.trialEndsAt} <= NOW()`,
        ),
      );

    return rows.map((row) => this.toSubscriptionDomain(row));
  }

  async hasHadTrialForTool(tenantId: string, toolId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: tenantToolSubscriptions.id })
      .from(tenantToolSubscriptions)
      .innerJoin(toolPlans, eq(toolPlans.id, tenantToolSubscriptions.planId))
      .where(
        and(
          eq(tenantToolSubscriptions.tenantId, tenantId),
          eq(toolPlans.toolId, toolId),
          sql`${tenantToolSubscriptions.trialEndsAt} IS NOT NULL`,
        ),
      )
      .limit(1);

    return rows.length > 0;
  }

  async findRecentlyExpiredTrials(
    tenantId: string,
    withinDays: number,
  ): Promise<{ subscriptionId: string; toolId: string; toolName: string; toolSlug: string; expiredAt: Date }[]> {
    const rows = await this.db
      .select({
        subscriptionId: tenantToolSubscriptions.id,
        toolId: tools.id,
        toolName: tools.name,
        toolSlug: tools.slug,
        expiredAt: tenantToolSubscriptions.trialEndsAt,
      })
      .from(tenantToolSubscriptions)
      .innerJoin(toolPlans, eq(toolPlans.id, tenantToolSubscriptions.planId))
      .innerJoin(tools, eq(tools.id, toolPlans.toolId))
      .where(
        and(
          eq(tenantToolSubscriptions.tenantId, tenantId),
          eq(tenantToolSubscriptions.status, 'cancelled'),
          sql`${tenantToolSubscriptions.trialEndsAt} IS NOT NULL`,
          sql`${tenantToolSubscriptions.trialEndsAt} >= (NOW() - make_interval(days => ${withinDays}))`,
        ),
      );

    return rows.map((r) => ({
      subscriptionId: r.subscriptionId,
      toolId: r.toolId,
      toolName: r.toolName,
      toolSlug: r.toolSlug,
      expiredAt: r.expiredAt!,
    }));
  }
}
