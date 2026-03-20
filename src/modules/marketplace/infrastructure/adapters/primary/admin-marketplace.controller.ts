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
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { AdminMarketplaceUseCasePort } from '../../../domain/ports/input/admin-marketplace.usecase.port.js';
import { CreateToolDto, UpdateToolDto, ToggleToolStatusDto } from '../../../application/dto/admin-tool.dto.js';
import { CreatePlanDto, UpdatePlanDto } from '../../../application/dto/admin-plan.dto.js';
import { CreatePlanFeatureDto, UpdatePlanFeatureDto } from '../../../application/dto/admin-plan-feature.dto.js';
import { Roles } from '../../../../../common/decorators/roles.decorator.js';
import {
  ApiErrorResponseDto,
  ApiMessageResponseDto,
} from '../../../../../common/swagger/api-responses.dto.js';

@ApiTags('Admin â€” Marketplace')
@ApiBearerAuth()
@Controller('admin/tools')
@Roles('master')
export class AdminMarketplaceController {
  constructor(
    @Inject('AdminMarketplaceUseCasePort')
    private readonly adminService: AdminMarketplaceUseCasePort,
  ) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€ TOOLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  @Post()
  @ApiOperation({ summary: 'Criar ferramenta (master)' })
  @ApiResponse({ status: 201, description: 'Ferramenta criada' })
  @ApiResponse({ status: 403, description: 'Acesso negado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Slug jÃ¡ existente', type: ApiErrorResponseDto })
  async createTool(@Body() dto: CreateToolDto) {
    const data = await this.adminService.createTool(dto);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar ferramenta (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiResponse({ status: 200, description: 'Ferramenta atualizada' })
  @ApiResponse({ status: 404, description: 'NÃ£o encontrada', type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Slug jÃ¡ existente', type: ApiErrorResponseDto })
  async updateTool(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateToolDto) {
    const data = await this.adminService.updateTool(id, dto);
    return { success: true, data };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativar/Desativar ferramenta (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  @ApiResponse({ status: 404, description: 'NÃ£o encontrada', type: ApiErrorResponseDto })
  async toggleStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ToggleToolStatusDto) {
    const data = await this.adminService.toggleToolStatus(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ferramenta (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiResponse({ status: 204, description: 'Ferramenta removida' })
  @ApiResponse({ status: 400, description: 'Possui assinaturas ativas', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'NÃ£o encontrada', type: ApiErrorResponseDto })
  async deleteTool(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.deleteTool(id);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€ PLANS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  @Post(':id/plans')
  @ApiOperation({ summary: 'Criar plano para ferramenta (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiResponse({ status: 201, description: 'Plano criado' })
  @ApiResponse({ status: 404, description: 'Ferramenta nÃ£o encontrada', type: ApiErrorResponseDto })
  async createPlan(@Param('id', ParseUUIDPipe) toolId: string, @Body() dto: CreatePlanDto) {
    const data = await this.adminService.createPlan(toolId, dto);
    return { success: true, data };
  }

  @Put(':id/plans/:planId')
  @ApiOperation({ summary: 'Atualizar plano (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiParam({ name: 'planId', description: 'UUID do plano' })
  @ApiResponse({ status: 200, description: 'Plano atualizado' })
  @ApiResponse({ status: 404, description: 'NÃ£o encontrado', type: ApiErrorResponseDto })
  async updatePlan(
    @Param('id', ParseUUIDPipe) toolId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    const data = await this.adminService.updatePlan(toolId, planId, dto);
    return { success: true, data };
  }

  @Delete(':id/plans/:planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover plano (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiParam({ name: 'planId', description: 'UUID do plano' })
  @ApiResponse({ status: 204, description: 'Plano removido' })
  @ApiResponse({ status: 400, description: 'Possui assinaturas ativas', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'NÃ£o encontrado', type: ApiErrorResponseDto })
  async deletePlan(
    @Param('id', ParseUUIDPipe) toolId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    await this.adminService.deletePlan(toolId, planId);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // â”€â”€ PLAN FEATURES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  @Post(':id/plans/:planId/features')
  @ApiOperation({ summary: 'Adicionar feature ao plano (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiParam({ name: 'planId', description: 'UUID do plano' })
  @ApiResponse({ status: 201, description: 'Feature criada' })
  @ApiResponse({ status: 404, description: 'Plano nÃ£o encontrado', type: ApiErrorResponseDto })
  async createFeature(
    @Param('id', ParseUUIDPipe) toolId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreatePlanFeatureDto,
  ) {
    const data = await this.adminService.createPlanFeature(toolId, planId, dto);
    return { success: true, data };
  }

  @Put(':id/plans/:planId/features/:featureId')
  @ApiOperation({ summary: 'Atualizar feature do plano (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiParam({ name: 'planId', description: 'UUID do plano' })
  @ApiParam({ name: 'featureId', description: 'UUID da feature' })
  @ApiResponse({ status: 200, description: 'Feature atualizada' })
  @ApiResponse({ status: 404, description: 'NÃ£o encontrada', type: ApiErrorResponseDto })
  async updateFeature(
    @Param('id', ParseUUIDPipe) toolId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('featureId', ParseUUIDPipe) featureId: string,
    @Body() dto: UpdatePlanFeatureDto,
  ) {
    const data = await this.adminService.updatePlanFeature(toolId, planId, featureId, dto);
    return { success: true, data };
  }

  @Delete(':id/plans/:planId/features/:featureId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover feature do plano (master)' })
  @ApiParam({ name: 'id', description: 'UUID da ferramenta' })
  @ApiParam({ name: 'planId', description: 'UUID do plano' })
  @ApiParam({ name: 'featureId', description: 'UUID da feature' })
  @ApiResponse({ status: 204, description: 'Feature removida' })
  @ApiResponse({ status: 404, description: 'NÃ£o encontrada', type: ApiErrorResponseDto })
  async deleteFeature(
    @Param('id', ParseUUIDPipe) toolId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('featureId', ParseUUIDPipe) featureId: string,
  ) {
    await this.adminService.deletePlanFeature(toolId, planId, featureId);
  }
}
