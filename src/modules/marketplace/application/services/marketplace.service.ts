import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { EventBusPort } from '../../../../common/types/event-bus.port.js';
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
import type { ChangePlanDto } from '../dto/change-plan.dto.js';
import type { PaginatedResponse } from '../../../../common/types/api-response.type.js';
import type { ToolType } from '../../domain/entities/marketplace.entity.js';
import { createPaginatedResponse } from '../../../../common/helpers/paginated-response.helper.js';

@Injectable()
export class MarketplaceService implements MarketplaceUseCasePort {
  constructor(
    @Inject('MarketplaceRepositoryPort')
    private readonly marketplaceRepo: MarketplaceRepositoryPort,

    @Inject('EventBusPort')
    private readonly eventBus: EventBusPort,
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
      trialDays: tool.trialDays,
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

    // Trial is per tool (trialDays on the tool, not on the plan)
    let effectiveTrialDays = tool.trialDays;
    if (effectiveTrialDays > 0) {
      const hadTrial = await this.marketplaceRepo.hasHadTrialForTool(
        tenantId,
        tool.id,
      );
      if (hadTrial) {
        effectiveTrialDays = 0;
      }
    }

    // During trial, auto-pick the best plan (isPopular, or most expensive)
    let selectedPlanId = dto.planId;
    let selectedPlan = plan;
    if (effectiveTrialDays > 0) {
      const toolWithPlans =
        await this.marketplaceRepo.findToolWithPlansAndFeatures(tool.id);
      if (toolWithPlans && toolWithPlans.plans.length > 0) {
        const bestPlan =
          toolWithPlans.plans.find((p) => p.isPopular && p.isActive) ??
          toolWithPlans.plans
            .filter((p) => p.isActive)
            .sort((a, b) => b.price - a.price)[0];
        if (bestPlan) {
          selectedPlanId = bestPlan.id;
          selectedPlan = bestPlan;
        }
      }
    }

    // Create the subscription (with trial if tool has trialDays)
    const subscription = await this.marketplaceRepo.createSubscription(
      tenantId,
      selectedPlanId,
      effectiveTrialDays,
    );

    return {
      id: subscription.id,
      toolId: tool.id,
      toolName: tool.name,
      planName: selectedPlan.name,
      planPrice: selectedPlan.price,
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

  // ── Unsubscribe from a tool ───────────────────────────────
  async unsubscribeTool(
    tenantId: string,
    subscriptionId: string,
  ): Promise<void> {
    const subscription =
      await this.marketplaceRepo.findSubscriptionById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    if (subscription.tenantId !== tenantId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (subscription.status === 'cancelled') {
      throw new BadRequestException('Assinatura já está cancelada');
    }

    await this.marketplaceRepo.cancelSubscription(subscriptionId);

    this.eventBus.emit('tool.unsubscribed', {
      tenantId,
      subscriptionId,
      planId: subscription.planId,
    });
  }

  // ── Change plan (upgrade/downgrade) ──────────────────────
  async changePlan(
    tenantId: string,
    subscriptionId: string,
    dto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription =
      await this.marketplaceRepo.findSubscriptionById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    if (subscription.tenantId !== tenantId) {
      throw new ForbiddenException('Acesso negado');
    }

    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      throw new BadRequestException(
        'Só é possível alterar plano de assinaturas ativas ou em trial',
      );
    }

    if (subscription.planId === dto.newPlanId) {
      throw new BadRequestException('Você já está neste plano');
    }

    // Validate new plan exists, is active, and belongs to the same tool
    const newPlan = await this.marketplaceRepo.findPlanById(dto.newPlanId);
    if (!newPlan) {
      throw new NotFoundException('Plano não encontrado');
    }
    if (!newPlan.isActive) {
      throw new BadRequestException('Plano não está ativo');
    }

    // Get current tool via current plan
    const currentTool = await this.marketplaceRepo.findToolByPlanId(
      subscription.planId,
    );
    const newTool = await this.marketplaceRepo.findToolByPlanId(dto.newPlanId);

    if (!currentTool || !newTool || currentTool.id !== newTool.id) {
      throw new BadRequestException(
        'O novo plano deve pertencer à mesma ferramenta',
      );
    }

    // Update subscription plan (activate if trialing)
    const updated = await this.marketplaceRepo.updateSubscriptionPlan(
      subscriptionId,
      dto.newPlanId,
      subscription.status === 'trialing',
    );

    this.eventBus.emit('tool.plan.changed', {
      tenantId,
      subscriptionId,
      oldPlanId: subscription.planId,
      newPlanId: dto.newPlanId,
      toolId: currentTool.id,
    });

    return {
      id: updated.id,
      toolId: currentTool.id,
      toolName: currentTool.name,
      planName: newPlan.name,
      planPrice: newPlan.price,
      iconUrl: currentTool.iconUrl,
      status: updated.status,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate?.toISOString() ?? null,
    };
  }

  // ── Private helpers ──────────────────────────────────────
  // ── Expired trials (for popup) ───────────────────────
  async getExpiredTrials(
    tenantId: string,
  ): Promise<{ toolId: string; toolName: string; toolSlug: string; expiredAt: string }[]> {
    const expired = await this.marketplaceRepo.findRecentlyExpiredTrials(
      tenantId,
      7, // últimos 7 dias
    );

    return expired.map((e) => ({
      toolId: e.toolId,
      toolName: e.toolName,
      toolSlug: e.toolSlug,
      expiredAt: e.expiredAt.toISOString(),
    }));
  }
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
