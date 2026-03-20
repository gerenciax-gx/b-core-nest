import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from '../../../../../../common/database/database.module.js';
import type {
  AdminMarketplaceRepositoryPort,
  AdminToolData,
  AdminPlanData,
  AdminPlanFeatureData,
} from '../../../../domain/ports/output/admin-marketplace.repository.port.js';
import {
  Tool,
  ToolPlan,
  PlanFeature,
  type ToolType,
  type PlanInterval,
} from '../../../../domain/entities/marketplace.entity.js';
import {
  tools,
  toolPlans,
  planFeatures,
  tenantToolSubscriptions,
} from './marketplace.schema.js';

@Injectable()
export class DrizzleAdminMarketplaceRepository
  implements AdminMarketplaceRepositoryPort
{
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase,
  ) {}

  // ══════════════════════════════════════════════════════════
  // ── TOOLS ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  async findToolById(id: string): Promise<Tool | null> {
    const rows = await this.db
      .select()
      .from(tools)
      .where(eq(tools.id, id))
      .limit(1);

    const row = rows[0];
    return row ? this.toToolDomain(row) : null;
  }

  async findToolBySlug(slug: string): Promise<Tool | null> {
    const rows = await this.db
      .select()
      .from(tools)
      .where(eq(tools.slug, slug))
      .limit(1);

    const row = rows[0];
    return row ? this.toToolDomain(row) : null;
  }

  async createTool(data: AdminToolData): Promise<Tool> {
    const [row] = await this.db
      .insert(tools)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        category: data.category ?? null,
        type: data.type as ToolType,
        iconUrl: data.iconUrl ?? null,
        trialDays: data.trialDays ?? 0,
      })
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to create tool');
    return this.toToolDomain(row);
  }

  async updateTool(
    id: string,
    data: Partial<AdminToolData> & { isActive?: boolean },
  ): Promise<Tool> {
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateValues['name'] = data.name;
    if (data.slug !== undefined) updateValues['slug'] = data.slug;
    if (data.description !== undefined) updateValues['description'] = data.description;
    if (data.category !== undefined) updateValues['category'] = data.category;
    if (data.type !== undefined) updateValues['type'] = data.type;
    if (data.iconUrl !== undefined) updateValues['iconUrl'] = data.iconUrl;
    if (data.isActive !== undefined) updateValues['isActive'] = data.isActive;
    if (data.trialDays !== undefined) updateValues['trialDays'] = data.trialDays;

    const [row] = await this.db
      .update(tools)
      .set(updateValues)
      .where(eq(tools.id, id))
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to update tool');
    return this.toToolDomain(row);
  }

  async deleteTool(id: string): Promise<void> {
    await this.db.delete(tools).where(eq(tools.id, id));
  }

  async toolHasActiveSubscriptions(toolId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenantToolSubscriptions)
      .innerJoin(toolPlans, eq(toolPlans.id, tenantToolSubscriptions.planId))
      .where(
        and(
          eq(toolPlans.toolId, toolId),
          sql`${tenantToolSubscriptions.status} IN ('active', 'trialing')`,
        ),
      );

    return (result?.count ?? 0) > 0;
  }

  // ══════════════════════════════════════════════════════════
  // ── PLANS ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  async findPlanById(planId: string): Promise<ToolPlan | null> {
    const rows = await this.db
      .select()
      .from(toolPlans)
      .where(eq(toolPlans.id, planId))
      .limit(1);

    const row = rows[0];
    return row ? this.toPlanDomain(row) : null;
  }

  async findPlanByIdAndToolId(
    planId: string,
    toolId: string,
  ): Promise<ToolPlan | null> {
    const rows = await this.db
      .select()
      .from(toolPlans)
      .where(and(eq(toolPlans.id, planId), eq(toolPlans.toolId, toolId)))
      .limit(1);

    const row = rows[0];
    return row ? this.toPlanDomain(row) : null;
  }

  async createPlan(toolId: string, data: AdminPlanData): Promise<ToolPlan> {
    const [row] = await this.db
      .insert(toolPlans)
      .values({
        toolId,
        name: data.name,
        price: String(data.price),
        interval: (data.interval ?? 'monthly') as PlanInterval,
        isPopular: data.isPopular ?? false,
        maxUsers: data.maxUsers ?? null,
        maxItems: data.maxItems ?? null,
      })
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to create plan');
    return this.toPlanDomain(row);
  }

  async updatePlan(
    planId: string,
    data: Partial<AdminPlanData>,
  ): Promise<ToolPlan> {
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateValues['name'] = data.name;
    if (data.price !== undefined) updateValues['price'] = String(data.price);
    if (data.interval !== undefined) updateValues['interval'] = data.interval;
    if (data.isPopular !== undefined) updateValues['isPopular'] = data.isPopular;
    if (data.isActive !== undefined) updateValues['isActive'] = data.isActive;
    if (data.maxUsers !== undefined) updateValues['maxUsers'] = data.maxUsers;
    if (data.maxItems !== undefined) updateValues['maxItems'] = data.maxItems;

    const [row] = await this.db
      .update(toolPlans)
      .set(updateValues)
      .where(eq(toolPlans.id, planId))
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to update plan');
    return this.toPlanDomain(row);
  }

  async deletePlan(planId: string): Promise<void> {
    await this.db.delete(toolPlans).where(eq(toolPlans.id, planId));
  }

  async planHasActiveSubscriptions(planId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tenantToolSubscriptions)
      .where(
        and(
          eq(tenantToolSubscriptions.planId, planId),
          sql`${tenantToolSubscriptions.status} IN ('active', 'trialing')`,
        ),
      );

    return (result?.count ?? 0) > 0;
  }

  // ══════════════════════════════════════════════════════════
  // ── PLAN FEATURES ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  async findFeatureById(featureId: string): Promise<PlanFeature | null> {
    const rows = await this.db
      .select()
      .from(planFeatures)
      .where(eq(planFeatures.id, featureId))
      .limit(1);

    const row = rows[0];
    return row ? this.toFeatureDomain(row) : null;
  }

  async findFeatureByIdAndPlanId(
    featureId: string,
    planId: string,
  ): Promise<PlanFeature | null> {
    const rows = await this.db
      .select()
      .from(planFeatures)
      .where(
        and(eq(planFeatures.id, featureId), eq(planFeatures.planId, planId)),
      )
      .limit(1);

    const row = rows[0];
    return row ? this.toFeatureDomain(row) : null;
  }

  async createPlanFeature(
    planId: string,
    data: AdminPlanFeatureData,
  ): Promise<PlanFeature> {
    const [row] = await this.db
      .insert(planFeatures)
      .values({
        planId,
        featureKey: data.featureKey,
        featureValue: data.featureValue,
        isHighlighted: data.isHighlighted ?? false,
        order: data.order ?? 0,
      })
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to create plan feature');
    return this.toFeatureDomain(row);
  }

  async updatePlanFeature(
    featureId: string,
    data: Partial<AdminPlanFeatureData>,
  ): Promise<PlanFeature> {
    const updateValues: Record<string, unknown> = {};

    if (data.featureKey !== undefined) updateValues['featureKey'] = data.featureKey;
    if (data.featureValue !== undefined) updateValues['featureValue'] = data.featureValue;
    if (data.isHighlighted !== undefined) updateValues['isHighlighted'] = data.isHighlighted;
    if (data.order !== undefined) updateValues['order'] = data.order;

    const [row] = await this.db
      .update(planFeatures)
      .set(updateValues)
      .where(eq(planFeatures.id, featureId))
      .returning();

    if (!row) throw new InternalServerErrorException('Failed to update plan feature');
    return this.toFeatureDomain(row);
  }

  async deletePlanFeature(featureId: string): Promise<void> {
    await this.db
      .delete(planFeatures)
      .where(eq(planFeatures.id, featureId));
  }

  // ══════════════════════════════════════════════════════════
  // ── DOMAIN MAPPERS ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

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

  private toPlanDomain(row: typeof toolPlans.$inferSelect): ToolPlan {
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
      [],
      row.createdAt,
      row.updatedAt,
    );
  }

  private toFeatureDomain(row: typeof planFeatures.$inferSelect): PlanFeature {
    return new PlanFeature(
      row.id,
      row.planId,
      row.featureKey,
      row.featureValue,
      row.isHighlighted,
      row.order,
    );
  }
}
