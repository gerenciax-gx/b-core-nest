import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { AdminMarketplaceUseCasePort } from '../../domain/ports/input/admin-marketplace.usecase.port.js';
import type { AdminMarketplaceRepositoryPort } from '../../domain/ports/output/admin-marketplace.repository.port.js';
import type { Tool, ToolPlan, PlanFeature } from '../../domain/entities/marketplace.entity.js';
import type {
  ToolResponseDto,
  ToolPlanResponseDto,
  PlanFeatureResponseDto,
} from '../dto/marketplace.dto.js';
import type { CreateToolDto, UpdateToolDto, ToggleToolStatusDto } from '../dto/admin-tool.dto.js';
import type { CreatePlanDto, UpdatePlanDto } from '../dto/admin-plan.dto.js';
import type { CreatePlanFeatureDto, UpdatePlanFeatureDto } from '../dto/admin-plan-feature.dto.js';

@Injectable()
export class AdminMarketplaceService implements AdminMarketplaceUseCasePort {
  constructor(
    @Inject('AdminMarketplaceRepositoryPort')
    private readonly repo: AdminMarketplaceRepositoryPort,
  ) {}

  // ══════════════════════════════════════════════════════════
  // ── TOOLS ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  async createTool(dto: CreateToolDto): Promise<ToolResponseDto> {
    const existing = await this.repo.findToolBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Já existe uma ferramenta com o slug "${dto.slug}"`);
    }

    const tool = await this.repo.createTool({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      category: dto.category,
      type: dto.type,
      iconUrl: dto.iconUrl,
      trialDays: dto.trialDays,
    });

    return this.toToolResponse(tool);
  }

  async updateTool(toolId: string, dto: UpdateToolDto): Promise<ToolResponseDto> {
    const tool = await this.repo.findToolById(toolId);
    if (!tool) {
      throw new NotFoundException('Ferramenta não encontrada');
    }

    if (dto.slug && dto.slug !== tool.slug) {
      const existing = await this.repo.findToolBySlug(dto.slug);
      if (existing) {
        throw new ConflictException(`Já existe uma ferramenta com o slug "${dto.slug}"`);
      }
    }

    const updated = await this.repo.updateTool(toolId, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      category: dto.category,
      type: dto.type,
      iconUrl: dto.iconUrl,
      trialDays: dto.trialDays,
    });

    return this.toToolResponse(updated);
  }

  async toggleToolStatus(toolId: string, dto: ToggleToolStatusDto): Promise<ToolResponseDto> {
    const tool = await this.repo.findToolById(toolId);
    if (!tool) {
      throw new NotFoundException('Ferramenta não encontrada');
    }

    const updated = await this.repo.updateTool(toolId, { isActive: dto.isActive });
    return this.toToolResponse(updated);
  }

  async deleteTool(toolId: string): Promise<void> {
    const tool = await this.repo.findToolById(toolId);
    if (!tool) {
      throw new NotFoundException('Ferramenta não encontrada');
    }

    const hasSubscriptions = await this.repo.toolHasActiveSubscriptions(toolId);
    if (hasSubscriptions) {
      throw new BadRequestException(
        'Não é possível remover uma ferramenta com assinaturas ativas. Desative-a primeiro.',
      );
    }

    await this.repo.deleteTool(toolId);
  }

  // ══════════════════════════════════════════════════════════
  // ── PLANS ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  async createPlan(toolId: string, dto: CreatePlanDto): Promise<ToolPlanResponseDto> {
    const tool = await this.repo.findToolById(toolId);
    if (!tool) {
      throw new NotFoundException('Ferramenta não encontrada');
    }

    const plan = await this.repo.createPlan(toolId, {
      name: dto.name,
      price: dto.price,
      interval: dto.interval,
      isPopular: dto.isPopular,
      maxUsers: dto.maxUsers ?? null,
      maxItems: dto.maxItems ?? null,
    });

    return this.toPlanResponse(plan);
  }

  async updatePlan(toolId: string, planId: string, dto: UpdatePlanDto): Promise<ToolPlanResponseDto> {
    const plan = await this.repo.findPlanByIdAndToolId(planId, toolId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado para esta ferramenta');
    }

    const updated = await this.repo.updatePlan(planId, {
      name: dto.name,
      price: dto.price,
      interval: dto.interval,
      isPopular: dto.isPopular,
      isActive: dto.isActive,
      maxUsers: dto.maxUsers,
      maxItems: dto.maxItems,
    });

    return this.toPlanResponse(updated);
  }

  async deletePlan(toolId: string, planId: string): Promise<void> {
    const plan = await this.repo.findPlanByIdAndToolId(planId, toolId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado para esta ferramenta');
    }

    const hasSubscriptions = await this.repo.planHasActiveSubscriptions(planId);
    if (hasSubscriptions) {
      throw new BadRequestException(
        'Não é possível remover um plano com assinaturas ativas. Desative-o primeiro.',
      );
    }

    await this.repo.deletePlan(planId);
  }

  // ══════════════════════════════════════════════════════════
  // ── PLAN FEATURES ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  async createPlanFeature(
    toolId: string,
    planId: string,
    dto: CreatePlanFeatureDto,
  ): Promise<PlanFeatureResponseDto> {
    const plan = await this.repo.findPlanByIdAndToolId(planId, toolId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado para esta ferramenta');
    }

    const feature = await this.repo.createPlanFeature(planId, {
      featureKey: dto.featureKey,
      featureValue: dto.featureValue,
      isHighlighted: dto.isHighlighted,
      order: dto.order,
    });

    return this.toFeatureResponse(feature);
  }

  async updatePlanFeature(
    toolId: string,
    planId: string,
    featureId: string,
    dto: UpdatePlanFeatureDto,
  ): Promise<PlanFeatureResponseDto> {
    // Validate plan belongs to tool
    const plan = await this.repo.findPlanByIdAndToolId(planId, toolId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado para esta ferramenta');
    }

    const feature = await this.repo.findFeatureByIdAndPlanId(featureId, planId);
    if (!feature) {
      throw new NotFoundException('Feature não encontrada para este plano');
    }

    const updated = await this.repo.updatePlanFeature(featureId, {
      featureKey: dto.featureKey,
      featureValue: dto.featureValue,
      isHighlighted: dto.isHighlighted,
      order: dto.order,
    });

    return this.toFeatureResponse(updated);
  }

  async deletePlanFeature(toolId: string, planId: string, featureId: string): Promise<void> {
    const plan = await this.repo.findPlanByIdAndToolId(planId, toolId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado para esta ferramenta');
    }

    const feature = await this.repo.findFeatureByIdAndPlanId(featureId, planId);
    if (!feature) {
      throw new NotFoundException('Feature não encontrada para este plano');
    }

    await this.repo.deletePlanFeature(featureId);
  }

  // ══════════════════════════════════════════════════════════
  // ── MAPPERS ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════

  private toToolResponse(tool: Tool): ToolResponseDto {
    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      category: tool.category,
      type: tool.type,
      iconUrl: tool.iconUrl,
      isActive: tool.isActive,
      trialDays: tool.trialDays,
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
    };
  }

  private toPlanResponse(plan: ToolPlan): ToolPlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      maxUsers: plan.maxUsers,
      maxItems: plan.maxItems,
      features: plan.features.map((f) => this.toFeatureResponse(f)),
    };
  }

  private toFeatureResponse(feature: PlanFeature): PlanFeatureResponseDto {
    return {
      id: feature.id,
      featureKey: feature.featureKey,
      featureValue: feature.featureValue,
      isHighlighted: feature.isHighlighted,
      order: feature.order,
    };
  }
}
