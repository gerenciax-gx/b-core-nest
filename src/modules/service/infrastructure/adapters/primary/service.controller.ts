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
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { ServiceUseCasePort } from '../../../domain/ports/input/service.usecase.port.js';
import {
  CreateServiceDto,
  UpdateServiceDto,
} from '../../../application/dto/service.dto.js';
import { ListServicesQueryDto } from '../../../application/dto/list-services-query.dto.js';
import { ServiceSuccessResponseDto, ServicePaginatedResponseDto } from '../../../application/dto/service-response-wrapper.dto.js';
import { CreatePriceVariationDto, UpdatePriceVariationDto } from '../../../application/dto/service-price-variation.dto.js';
import { CreateServicePhotoDto } from '../../../application/dto/service-photo.dto.js';
import { LinkProfessionalDto } from '../../../application/dto/service-professional.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { Roles } from '../../../../../common/decorators/roles.decorator.js';
import { ApiErrorResponseDto, ApiMessageResponseDto } from '../../../../../common/swagger/api-responses.dto.js';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServiceController {
  constructor(
    @Inject('ServiceUseCasePort')
    private readonly serviceService: ServiceUseCasePort,
  ) {}

  @Post()  @Roles('admin')  @ApiOperation({ summary: 'Criar serviÃ§o' })
  @ApiResponse({ status: 201, description: 'ServiÃ§o criado com sucesso', type: ServiceSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServiceDto,
  ) {
    const data = await this.serviceService.create(tenantId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Listar serviÃ§os (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de serviÃ§os', type: ServicePaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListServicesQueryDto,
  ) {
    return this.serviceService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter serviÃ§o por ID' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 200, description: 'ServiÃ§o encontrado', type: ServiceSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.serviceService.findById(id, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar serviço' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 200, description: 'ServiÃ§o atualizado', type: ServiceSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const data = await this.serviceService.update(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')  @Roles('admin')  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 200, description: 'ServiÃ§o excluÃ­do', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceService.delete(id, tenantId);
    return { success: true, message: 'ServiÃ§o excluÃ­do com sucesso' };
  }

  // â”€â”€ Price Variation sub-resource â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get(':id/price-variations')
  @ApiOperation({ summary: 'Listar variaÃ§Ãµes de preÃ§o do serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 200, description: 'Lista de variaÃ§Ãµes de preÃ§o' })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async listPriceVariations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.serviceService.listPriceVariations(id, tenantId);
    return { success: true, data };
  }

  @Post(':id/price-variations')
  @ApiOperation({ summary: 'Criar variaÃ§Ã£o de preÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 201, description: 'VariaÃ§Ã£o criada' })
  @ApiResponse({ status: 400, description: 'Dados invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async createPriceVariation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePriceVariationDto,
  ) {
    const data = await this.serviceService.createPriceVariation(id, tenantId, dto);
    return { success: true, data };
  }

  @Put(':id/price-variations/:variationId')  @Roles('admin')  @ApiOperation({ summary: 'Atualizar variaÃ§Ã£o de preÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiParam({ name: 'variationId', description: 'UUID da variaÃ§Ã£o' })
  @ApiResponse({ status: 200, description: 'VariaÃ§Ã£o atualizada' })
  @ApiResponse({ status: 404, description: 'ServiÃ§o ou variaÃ§Ã£o nÃ£o encontrado', type: ApiErrorResponseDto })
  async updatePriceVariation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdatePriceVariationDto,
  ) {
    const data = await this.serviceService.updatePriceVariation(id, variationId, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id/price-variations/:variationId')  @Roles('admin')  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover variaÃ§Ã£o de preÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiParam({ name: 'variationId', description: 'UUID da variaÃ§Ã£o' })
  @ApiResponse({ status: 200, description: 'VariaÃ§Ã£o removida', type: ApiMessageResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o ou variaÃ§Ã£o nÃ£o encontrado', type: ApiErrorResponseDto })
  async deletePriceVariation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceService.deletePriceVariation(id, variationId, tenantId);
    return { success: true, message: 'VariaÃ§Ã£o de preÃ§o removida com sucesso' };
  }

  // â”€â”€ Professional sub-resource â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get(':id/professionals')
  @ApiOperation({ summary: 'Listar profissionais vinculados ao serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 200, description: 'Lista de profissionais' })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async listProfessionals(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.serviceService.listProfessionals(id, tenantId);
    return { success: true, data };
  }

  @Post(':id/professionals')  @Roles('admin')  @ApiOperation({ summary: 'Vincular profissional ao serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 201, description: 'Profissional vinculado' })
  @ApiResponse({ status: 400, description: 'Dados invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async linkProfessional(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: LinkProfessionalDto,
  ) {
    const data = await this.serviceService.linkProfessional(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id/professionals/:collaboratorId')  @Roles('admin')  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desvincular profissional do serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiParam({ name: 'collaboratorId', description: 'UUID do colaborador' })
  @ApiResponse({ status: 200, description: 'Profissional desvinculado', type: ApiMessageResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o ou profissional nÃ£o encontrado', type: ApiErrorResponseDto })
  async unlinkProfessional(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceService.unlinkProfessional(id, collaboratorId, tenantId);
    return { success: true, message: 'Profissional desvinculado com sucesso' };
  }

  // â”€â”€ Photo sub-resource â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get(':id/photos')
  @ApiOperation({ summary: 'Listar fotos do serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 200, description: 'Lista de fotos' })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async listPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.serviceService.listPhotos(id, tenantId);
    return { success: true, data };
  }

  @Post(':id/photos')  @Roles('admin')  @ApiOperation({ summary: 'Adicionar foto ao serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiResponse({ status: 201, description: 'Foto adicionada' })
  @ApiResponse({ status: 400, description: 'Dados invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o nÃ£o encontrado', type: ApiErrorResponseDto })
  async addPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServicePhotoDto,
  ) {
    const data = await this.serviceService.addPhoto(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id/photos/:photoId')  @Roles('admin')  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover foto do serviÃ§o' })
  @ApiParam({ name: 'id', description: 'UUID do serviÃ§o' })
  @ApiParam({ name: 'photoId', description: 'UUID da foto' })
  @ApiResponse({ status: 200, description: 'Foto removida', type: ApiMessageResponseDto })
  @ApiResponse({ status: 404, description: 'ServiÃ§o ou foto nÃ£o encontrado', type: ApiErrorResponseDto })
  async removePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceService.removePhoto(id, photoId, tenantId);
    return { success: true, message: 'Foto removida com sucesso' };
  }
}
