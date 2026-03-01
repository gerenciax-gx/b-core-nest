import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CategoryService } from '../../../application/services/category.service.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../../../application/dto/category.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Criar categoria' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const data = await this.categoryService.create(tenantId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorias' })
  @ApiQuery({ name: 'type', required: false, enum: ['product', 'service'] })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
  ) {
    const data = await this.categoryService.findAll(tenantId, type);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter categoria por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.categoryService.findById(id, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
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
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.categoryService.delete(id, tenantId);
    return { success: true, message: 'Categoria excluída com sucesso' };
  }
}
