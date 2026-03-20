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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { CollaboratorUseCasePort } from '../../../domain/ports/input/collaborator.usecase.port.js';
import {
  CreateCollaboratorDto,
  UpdateCollaboratorDto,
  ChangeStatusDto,
} from '../../../application/dto/collaborator.dto.js';
import { ListCollaboratorsQueryDto } from '../../../application/dto/list-collaborators-query.dto.js';
import {
  CollaboratorSuccessResponseDto,
  CollaboratorCreateSuccessResponseDto,
  CollaboratorPaginatedResponseDto,
} from '../../../application/dto/collaborator-response-wrapper.dto.js';
import {
  ApiErrorResponseDto,
  ApiMessageResponseDto,
} from '../../../../../common/swagger/api-responses.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { Roles } from '../../../../../common/decorators/roles.decorator.js';

@ApiTags('Collaborators')
@ApiBearerAuth()
@Controller('collaborators')
export class CollaboratorController {
  constructor(
    @Inject('CollaboratorUseCasePort')
    private readonly collaboratorService: CollaboratorUseCasePort,
  ) {}

  @Post()  @Roles('admin')  @ApiOperation({ summary: 'Criar colaborador (admin only â€” gera User + senha temporÃ¡ria)' })
  @ApiResponse({ status: 201, description: 'Colaborador criado com sucesso', type: CollaboratorCreateSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Apenas administradores', type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Email ou CPF jÃ¡ cadastrado', type: ApiErrorResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCollaboratorDto,
  ) {
    const result = await this.collaboratorService.create(tenantId, dto);
    return {
      success: true,
      data: {
        ...result.collaborator,
        temporaryPassword: result.temporaryPassword,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar colaboradores (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de colaboradores', type: CollaboratorPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListCollaboratorsQueryDto,
  ) {
    return this.collaboratorService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter colaborador por ID' })
  @ApiParam({ name: 'id', description: 'UUID do colaborador' })
  @ApiResponse({ status: 200, description: 'Colaborador encontrado', type: CollaboratorSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Colaborador nÃ£o encontrado', type: ApiErrorResponseDto })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.collaboratorService.findById(tenantId, id);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar colaborador' })
  @ApiParam({ name: 'id', description: 'UUID do colaborador' })
  @ApiResponse({ status: 200, description: 'Colaborador atualizado', type: CollaboratorSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Colaborador nÃ£o encontrado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, description: 'Email ou CPF duplicado', type: ApiErrorResponseDto })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollaboratorDto,
  ) {
    const data = await this.collaboratorService.update(tenantId, id, dto);
    return { success: true, data };
  }

  @Patch(':id/status')
  @Roles('admin')
  @ApiOperation({ summary: 'Alterar status do colaborador' })
  @ApiParam({ name: 'id', description: 'UUID do colaborador' })
  @ApiResponse({ status: 200, description: 'Status atualizado', type: CollaboratorSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Status invÃ¡lido', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Colaborador nÃ£o encontrado', type: ApiErrorResponseDto })
  async changeStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    const data = await this.collaboratorService.changeStatus(tenantId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir colaborador (desativa user vinculado)' })
  @ApiParam({ name: 'id', description: 'UUID do colaborador' })
  @ApiResponse({ status: 200, description: 'Colaborador excluÃ­do', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Colaborador nÃ£o encontrado', type: ApiErrorResponseDto })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.collaboratorService.remove(tenantId, id);
    return { success: true, message: 'Colaborador excluÃ­do com sucesso' };
  }
}
