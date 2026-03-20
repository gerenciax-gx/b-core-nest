import type {
  Tool,
  ToolPlan,
  PlanFeature,
} from '../../entities/marketplace.entity.js';

export interface AdminToolData {
  name: string;
  slug: string;
  description?: string;
  category?: string;
  type: string;
  iconUrl?: string;
  trialDays?: number;
}

export interface AdminPlanData {
  name: string;
  price: number;
  interval?: string;
  isPopular?: boolean;
  isActive?: boolean;
  maxUsers?: number | null;
  maxItems?: number | null;
}

export interface AdminPlanFeatureData {
  featureKey: string;
  featureValue: string;
  isHighlighted?: boolean;
  order?: number;
}

export interface AdminMarketplaceRepositoryPort {
  // ── Tools ─────────────────────────────────────
  findToolById(id: string): Promise<Tool | null>;
  findToolBySlug(slug: string): Promise<Tool | null>;
  createTool(data: AdminToolData): Promise<Tool>;
  updateTool(id: string, data: Partial<AdminToolData> & { isActive?: boolean }): Promise<Tool>;
  deleteTool(id: string): Promise<void>;
  toolHasActiveSubscriptions(toolId: string): Promise<boolean>;

  // ── Plans ─────────────────────────────────────
  findPlanById(planId: string): Promise<ToolPlan | null>;
  findPlanByIdAndToolId(planId: string, toolId: string): Promise<ToolPlan | null>;
  createPlan(toolId: string, data: AdminPlanData): Promise<ToolPlan>;
  updatePlan(planId: string, data: Partial<AdminPlanData>): Promise<ToolPlan>;
  deletePlan(planId: string): Promise<void>;
  planHasActiveSubscriptions(planId: string): Promise<boolean>;

  // ── Plan Features ─────────────────────────────
  findFeatureById(featureId: string): Promise<PlanFeature | null>;
  findFeatureByIdAndPlanId(featureId: string, planId: string): Promise<PlanFeature | null>;
  createPlanFeature(planId: string, data: AdminPlanFeatureData): Promise<PlanFeature>;
  updatePlanFeature(featureId: string, data: Partial<AdminPlanFeatureData>): Promise<PlanFeature>;
  deletePlanFeature(featureId: string): Promise<void>;
}
