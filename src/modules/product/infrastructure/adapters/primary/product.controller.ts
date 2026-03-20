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
import type { ProductUseCasePort } from '../../../domain/ports/input/product.usecase.port.js';
import {
  CreateProductDto,
  UpdateProductDto,
} from '../../../application/dto/product.dto.js';
import { ListProductsQueryDto } from '../../../application/dto/list-products-query.dto.js';
import { ProductSuccessResponseDto, ProductPaginatedResponseDto } from '../../../application/dto/product-response-wrapper.dto.js';
import { CreateVariationDto, UpdateVariationDto } from '../../../application/dto/product-variation.dto.js';
import { CreateCustomFieldDto, UpdateCustomFieldDto } from '../../../application/dto/product-custom-field.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';
import { Roles } from '../../../../../common/decorators/roles.decorator.js';
import { ApiErrorResponseDto, ApiMessageResponseDto } from '../../../../../common/swagger/api-responses.dto.js';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(
    @Inject('ProductUseCasePort')
    private readonly productService: ProductUseCasePort,
  ) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Criar produto' })
  @ApiResponse({ status: 201, description: 'Produto criado com sucesso', type: ProductSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProductDto,
  ) {
    const data = await this.productService.create(tenantId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos (paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de produtos', type: ProductPaginatedResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.productService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter produto por ID' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Produto encontrado', type: ProductSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Produto nÃ£o encontrado', type: ApiErrorResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.productService.findById(id, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Produto atualizado', type: ProductSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Dados de entrada invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Produto nÃ£o encontrado', type: ApiErrorResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productService.update(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Produto excluÃ­do', type: ApiMessageResponseDto })
  @ApiResponse({ status: 401, description: 'NÃ£o autenticado', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Produto nÃ£o encontrado', type: ApiErrorResponseDto })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.productService.delete(id, tenantId);
    return { success: true, message: 'Produto excluÃ­do com sucesso' };
  }

  // â”€â”€ Variation sub-resource â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get(':id/variations')
  @ApiOperation({ summary: 'Listar variaÃ§Ãµes do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Lista de variaÃ§Ãµes' })
  @ApiResponse({ status: 404, description: 'Produto nÃ£o encontrado', type: ApiErrorResponseDto })
  async listVariations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.productService.listVariations(id, tenantId);
    return { success: true, data };
  }

  @Post(':id/variations')  @Roles('admin')  @ApiOperation({ summary: 'Criar variaÃ§Ã£o do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 201, description: 'VariaÃ§Ã£o criada' })
  @ApiResponse({ status: 400, description: 'Dados invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Produto nÃ£o encontrado', type: ApiErrorResponseDto })
  async createVariation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateVariationDto,
  ) {
    const data = await this.productService.createVariation(id, tenantId, dto);
    return { success: true, data };
  }

  @Put(':id/variations/:variationId')  @Roles('admin')  @ApiOperation({ summary: 'Atualizar variaÃ§Ã£o do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiParam({ name: 'variationId', description: 'UUID da variaÃ§Ã£o' })
  @ApiResponse({ status: 200, description: 'VariaÃ§Ã£o atualizada' })
  @ApiResponse({ status: 404, description: 'Produto ou variaÃ§Ã£o nÃ£o encontrado', type: ApiErrorResponseDto })
  async updateVariation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateVariationDto,
  ) {
    const data = await this.productService.updateVariation(id, variationId, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id/variations/:variationId')  @Roles('admin')  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover variaÃ§Ã£o do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiParam({ name: 'variationId', description: 'UUID da variaÃ§Ã£o' })
  @ApiResponse({ status: 200, description: 'VariaÃ§Ã£o removida', type: ApiMessageResponseDto })
  @ApiResponse({ status: 404, description: 'Produto ou variaÃ§Ã£o nÃ£o encontrado', type: ApiErrorResponseDto })
  async deleteVariation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variationId', ParseUUIDPipe) variationId: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.productService.deleteVariation(id, variationId, tenantId);
    return { success: true, message: 'VariaÃ§Ã£o removida com sucesso' };
  }

  // â”€â”€ Custom field sub-resource â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get(':id/custom-fields')
  @ApiOperation({ summary: 'Listar campos customizados do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Lista de campos customizados' })
  @ApiResponse({ status: 404, description: 'Produto nÃ£o encontrado', type: ApiErrorResponseDto })
  async listCustomFields(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.productService.listCustomFields(id, tenantId);
    return { success: true, data };
  }

  @Post(':id/custom-fields')
  @Roles('admin')
  @ApiOperation({ summary: 'Criar campo customizado do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 201, description: 'Campo criado' })
  @ApiResponse({ status: 400, description: 'Dados invÃ¡lidos', type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Produto nÃ£o encontrado', type: ApiErrorResponseDto })
  async createCustomField(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCustomFieldDto,
  ) {
    const data = await this.productService.createCustomField(id, tenantId, dto);
    return { success: true, data };
  }

  @Put(':id/custom-fields/:fieldId')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar campo customizado do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiParam({ name: 'fieldId', description: 'UUID do campo' })
  @ApiResponse({ status: 200, description: 'Campo atualizado' })
  @ApiResponse({ status: 404, description: 'Produto ou campo nÃ£o encontrado', type: ApiErrorResponseDto })
  async updateCustomField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    const data = await this.productService.updateCustomField(id, fieldId, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id/custom-fields/:fieldId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover campo customizado do produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiParam({ name: 'fieldId', description: 'UUID do campo' })
  @ApiResponse({ status: 200, description: 'Campo removido', type: ApiMessageResponseDto })
  @ApiResponse({ status: 404, description: 'Produto ou campo nÃ£o encontrado', type: ApiErrorResponseDto })
  async deleteCustomField(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.productService.deleteCustomField(id, fieldId, tenantId);
    return { success: true, message: 'Campo customizado removido com sucesso' };
  }
}
