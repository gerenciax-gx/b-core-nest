import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { MarketplaceUseCasePort } from '../../domain/ports/input/marketplace.usecase.port.js';
import type { MarketplaceRepositoryPort } from '../../domain/ports/output/marketplace.repository.port.js';
import type { Tool, ToolPlan, PlanFeature } from '../../domain/entities/marketplace.entity.js';
import type {
  ToolResponseDto,
  ToolDetailResponseDto,
  ToolPlanResponseDto,
  PlanFeatureResponseDto,
  SubscriptionResponseDto,
} from '../dto/marketplace.dto.js';
import type { ListToolsQueryDto } from '../dto/list-tools-query.dto.js';
import type { SubscribeDto } from '../dto/subscribe.dto.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';
import type { ToolType } from '../../domain/entities/marketplace.entity.js';
import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';

@Injectable()
export class MarketplaceService implements MarketplaceUseCasePort {
  constructor(
    @Inject('MarketplaceRepositoryPort')
    private readonly marketplaceRepo: MarketplaceRepositoryPort,
  ) {}

  // ── List tools (paginated) ───────────────────────────────
  async listTools(
    query: ListToolsQueryDto,
  ): Promise<PaginatedResponse<ToolResponseDto>> {
    const { page = 1, limit = 20 } = query;

    const [tools, total] = await this.marketplaceRepo.findAllTools(
      { page, limit, sortBy: query.sortBy, sortOrder: query.sortOrder },
      {
        type: query.type as ToolType | undefined,
        search: query.search,
        category: query.category,
      },
    );

    const data = tools.map((t) => this.toToolResponse(t));
    return createPaginatedResponse(data, total, page, limit);
  }

  // ── Tool detail with plans ───────────────────────────────
  async getToolDetail(
    toolId: string,
    tenantId: string,
  ): Promise<ToolDetailResponseDto> {
    const tool = await this.marketplaceRepo.findToolWithPlansAndFeatures(toolId);
    if (!tool) {
      throw new NotFoundException('Ferramenta não encontrada');
    }

    // Check if this tenant already subscribes to this tool
    const activeSub =
      await this.marketplaceRepo.findActiveSubscriptionForTool(
        tenantId,
        toolId,
      );

    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      category: tool.category,
      type: tool.type,
      iconUrl: tool.iconUrl,
      isActive: tool.isActive,
      isSubscribed: activeSub !== null,
      currentPlanId: activeSub?.planId ?? null,
      plans: tool.plans.map((p) => this.toPlanResponse(p)),
      createdAt: tool.createdAt.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
    };
  }

  // ── Subscribe to a plan ──────────────────────────────────
  async subscribe(
    tenantId: string,
    dto: SubscribeDto,
  ): Promise<SubscriptionResponseDto> {
    // Validate plan exists and is active
    const plan = await this.marketplaceRepo.findPlanById(dto.planId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }
    if (!plan.isActive) {
      throw new BadRequestException('Plano não está ativo');
    }

    // Find the parent tool
    const tool = await this.marketplaceRepo.findToolByPlanId(dto.planId);
    if (!tool) {
      throw new NotFoundException('Ferramenta não encontrada');
    }
    if (!tool.isActive) {
      throw new BadRequestException('Ferramenta não está ativa');
    }

    // Check if tenant already has an active subscription for this tool
    const existing =
      await this.marketplaceRepo.findActiveSubscriptionForTool(
        tenantId,
        tool.id,
      );
    if (existing) {
      throw new ConflictException(
        'Já existe uma assinatura ativa para esta ferramenta',
      );
    }

    // Create the subscription
    const subscription = await this.marketplaceRepo.createSubscription(
      tenantId,
      dto.planId,
    );

    return {
      id: subscription.id,
      toolId: tool.id,
      toolName: tool.name,
      planName: plan.name,
      planPrice: plan.price,
      iconUrl: tool.iconUrl,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate?.toISOString() ?? null,
    };
  }

  // ── List tenant subscriptions ────────────────────────────
  async listSubscriptions(
    tenantId: string,
  ): Promise<SubscriptionResponseDto[]> {
    const subscriptions =
      await this.marketplaceRepo.findSubscriptionsByTenant(tenantId);

    return subscriptions.map(({ subscription, tool, plan }) => ({
      id: subscription.id,
      toolId: tool.id,
      toolName: tool.name,
      planName: plan.name,
      planPrice: plan.price,
      iconUrl: tool.iconUrl,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate?.toISOString() ?? null,
    }));
  }

  // ── Private helpers ──────────────────────────────────────
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
      trialDays: plan.trialDays,
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
