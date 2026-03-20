import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { MarketplaceUseCasePort } from '../../../domain/ports/input/marketplace.usecase.port.js';
import { ListToolsQueryDto } from '../../../application/dto/list-tools-query.dto.js';
import { SubscribeDto } from '../../../application/dto/subscribe.dto.js';
import { ChangePlanDto } from '../../../application/dto/change-plan.dto.js';
import {
  ToolPaginatedResponseDto,
  ToolDetailSuccessResponseDto,
  SubscriptionSuccessResponseDto,
  SubscriptionListResponseDto,
} from '../../../application/dto/marketplace-response-wrapper.dto.js';
import {
  ApiErrorResponseDto,
  ApiMessageResponseDto,
} from '../../../../../common/swagger/api-responses.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { Roles } from '../../../../../common/decorators/roles.decorator.js';

@ApiTags('Marketplace')
@ApiBearerAuth()
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    @Inject('MarketplaceUseCasePort')
    private readonly marketplaceService: MarketplaceUseCasePort,
  ) {}

  @Get('tools')
  @ApiOperation({ summary: 'Listar ferramentas disponÃ­veis' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de ferramentas',
    type: ToolPaginatedResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'NÃ£o autenticado',
    type: ApiErrorResponseDto,
  })
  async listTools(@Query() query: ListToolsQueryDto) {
    return this.marketplaceService.listTools(query);
  }

  @Get('tools/:id')
  @ApiOperation({ summary: 'Detalhe da ferramenta com planos' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiResponse({
    status: 200,
    description: 'Ferramenta encontrada com planos',
    type: ToolDetailSuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'NÃ£o autenticado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ferramenta nÃ£o encontrada',
    type: ApiErrorResponseDto,
  })
  async getToolDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.marketplaceService.getToolDetail(id, tenantId);
    return { success: true, data };
  }

  @Post('subscribe')
  @Roles('admin')
  @ApiOperation({ summary: 'Assinar um plano (admin)' })
  @ApiResponse({
    status: 201,
    description: 'Assinatura criada com sucesso',
    type: SubscriptionSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Plano ou ferramenta inativa',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'NÃ£o autenticado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado (somente admin)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plano nÃ£o encontrado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'JÃ¡ existe assinatura ativa para esta ferramenta',
    type: ApiErrorResponseDto,
  })
  async subscribe(
    @CurrentTenant() tenantId: string,
    @Body() dto: SubscribeDto,
  ) {
    const data = await this.marketplaceService.subscribe(tenantId, dto);
    return { success: true, data };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar ferramentas assinadas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de assinaturas ativas',
    type: SubscriptionListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'NÃ£o autenticado',
    type: ApiErrorResponseDto,
  })
  async listSubscriptions(@CurrentTenant() tenantId: string) {
    const data = await this.marketplaceService.listSubscriptions(tenantId);
    return { success: true, data };
  }

  @Get('expired-trials')
  @ApiOperation({ summary: 'Trials recentemente expirados (para popup)' })
  @ApiResponse({ status: 200, description: 'Lista de trials expirados nos Ãºltimos 7 dias' })
  async getExpiredTrials(@CurrentTenant() tenantId: string) {
    const data = await this.marketplaceService.getExpiredTrials(tenantId);
    return { success: true, data };
  }

  @Delete('subscriptions/:subscriptionId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar assinatura de uma ferramenta' })
  @ApiParam({ name: 'subscriptionId', description: 'UUID da assinatura' })
  @ApiResponse({
    status: 200,
    description: 'Assinatura cancelada com sucesso',
    type: ApiMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Assinatura jÃ¡ cancelada',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Assinatura nÃ£o encontrada',
    type: ApiErrorResponseDto,
  })
  async unsubscribeTool(
    @CurrentTenant() tenantId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    await this.marketplaceService.unsubscribeTool(tenantId, subscriptionId);
    return { success: true, message: 'Assinatura cancelada com sucesso' };
  }

  @Patch('subscriptions/:subscriptionId/change-plan')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar plano de uma assinatura (upgrade/downgrade)' })
  @ApiParam({ name: 'subscriptionId', description: 'UUID da assinatura' })
  @ApiResponse({
    status: 200,
    description: 'Plano alterado com sucesso',
    type: SubscriptionSuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Plano invÃ¡lido, mesmo plano, ou assinatura nÃ£o ativa',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Assinatura ou plano nÃ£o encontrado',
    type: ApiErrorResponseDto,
  })
  async changePlan(
    @CurrentTenant() tenantId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() dto: ChangePlanDto,
  ) {
    const data = await this.marketplaceService.changePlan(
      tenantId,
      subscriptionId,
      dto,
    );
    return { success: true, data };
  }
}
