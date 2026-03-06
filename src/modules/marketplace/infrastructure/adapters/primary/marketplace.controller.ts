import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
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
import {
  ToolPaginatedResponseDto,
  ToolDetailSuccessResponseDto,
  SubscriptionSuccessResponseDto,
  SubscriptionListResponseDto,
} from '../../../application/dto/marketplace-response-wrapper.dto.js';
import {
  ApiErrorResponseDto,
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
  @ApiOperation({ summary: 'Listar ferramentas disponíveis' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de ferramentas',
    type: ToolPaginatedResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autenticado',
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
    description: 'Não autenticado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ferramenta não encontrada',
    type: ApiErrorResponseDto,
  })
  async getToolDetail(
    @Param('id') id: string,
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
    description: 'Não autenticado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado (somente admin)',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plano não encontrado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe assinatura ativa para esta ferramenta',
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
    description: 'Não autenticado',
    type: ApiErrorResponseDto,
  })
  async listSubscriptions(@CurrentTenant() tenantId: string) {
    const data = await this.marketplaceService.listSubscriptions(tenantId);
    return { success: true, data };
  }
}
