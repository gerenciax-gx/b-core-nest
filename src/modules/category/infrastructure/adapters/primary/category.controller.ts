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
import type { CategoryUseCasePort } from '../../../domain/ports/input/category.usecase.port.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../../../application/dto/category.dto.js';
import { ListCategoriesQueryDto } from '../../../application/dto/list-categories-query.dto.js';
import { CategorySuccessResponseDto, CategoryPaginatedResponseDto } from '../../../application/dto/category-response-wrapper.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { ApiErrorResponseDto, ApiMessageResponseDto } from '../../../../../common/swagger/api-responses.dto.js';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoryController {
  constructor(
    @Inject('CategoryUseCasePort')
    private readonly categoryService: CategoryUseCasePort,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar categoria' })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso', type: CategorySuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const data = await this.categoryService.create(tenantId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorias (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de categorias', type: CategoryPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListCategoriesQueryDto,
  ) {
    return this.categoryService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter categoria por ID' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada', type: CategorySuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ApiErrorResponseDto })
  async findById(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.categoryService.findById(id, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada', type: CategorySuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ApiErrorResponseDto })
  async update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.categoryService.update(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir categoria' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  @ApiResponse({ status: 200, description: 'Categoria excluída', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada', type: ApiErrorResponseDto })
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.categoryService.delete(id, tenantId);
    return { success: true, message: 'Categoria excluída com sucesso' };
  }
}
