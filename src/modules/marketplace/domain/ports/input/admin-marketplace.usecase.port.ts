import type {
  ToolResponseDto,
  ToolPlanResponseDto,
  PlanFeatureResponseDto,
} from '../../../application/dto/marketplace.dto.js';
import type { CreateToolDto, UpdateToolDto, ToggleToolStatusDto } from '../../../application/dto/admin-tool.dto.js';
import type { CreatePlanDto, UpdatePlanDto } from '../../../application/dto/admin-plan.dto.js';
import type { CreatePlanFeatureDto, UpdatePlanFeatureDto } from '../../../application/dto/admin-plan-feature.dto.js';

export interface AdminMarketplaceUseCasePort {
  // ── Tools ─────────────────────────────────────
  createTool(dto: CreateToolDto): Promise<ToolResponseDto>;
  updateTool(toolId: string, dto: UpdateToolDto): Promise<ToolResponseDto>;
  toggleToolStatus(toolId: string, dto: ToggleToolStatusDto): Promise<ToolResponseDto>;
  deleteTool(toolId: string): Promise<void>;

  // ── Plans ─────────────────────────────────────
  createPlan(toolId: string, dto: CreatePlanDto): Promise<ToolPlanResponseDto>;
  updatePlan(toolId: string, planId: string, dto: UpdatePlanDto): Promise<ToolPlanResponseDto>;
  deletePlan(toolId: string, planId: string): Promise<void>;

  // ── Plan Features ─────────────────────────────
  createPlanFeature(toolId: string, planId: string, dto: CreatePlanFeatureDto): Promise<PlanFeatureResponseDto>;
  updatePlanFeature(toolId: string, planId: string, featureId: string, dto: UpdatePlanFeatureDto): Promise<PlanFeatureResponseDto>;
  deletePlanFeature(toolId: string, planId: string, featureId: string): Promise<void>;
}
