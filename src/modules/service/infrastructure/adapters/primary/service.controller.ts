import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
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
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { ApiErrorResponseDto, ApiMessageResponseDto } from '../../../../../common/swagger/api-responses.dto.js';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServiceController {
  constructor(
    @Inject('ServiceUseCasePort')
    private readonly serviceService: ServiceUseCasePort,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar serviço' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso', type: ServiceSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServiceDto,
  ) {
    const data = await this.serviceService.create(tenantId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Listar serviços (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de serviços', type: ServicePaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListServicesQueryDto,
  ) {
    return this.serviceService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter serviço por ID' })
  @ApiParam({ name: 'id', description: 'UUID do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço encontrado', type: ServiceSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado', type: ApiErrorResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.serviceService.findById(id, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar serviço' })
  @ApiParam({ name: 'id', description: 'UUID do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado', type: ServiceSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado', type: ApiErrorResponseDto })
  async update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const data = await this.serviceService.update(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir serviço' })
  @ApiParam({ name: 'id', description: 'UUID do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço excluído', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado', type: ApiErrorResponseDto })
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceService.delete(id, tenantId);
    return { success: true, message: 'Serviço excluído com sucesso' };
  }
}
