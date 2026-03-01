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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from '../../../application/services/product.service.js';
import {
  CreateProductDto,
  UpdateProductDto,
} from '../../../application/dto/product.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Criar produto' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProductDto,
  ) {
    const data = await this.productService.create(tenantId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  async findAll(@CurrentTenant() tenantId: string) {
    const data = await this.productService.findAll(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter produto por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.productService.findById(id, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productService.update(id, tenantId, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir produto' })
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.productService.delete(id, tenantId);
    return { success: true, message: 'Produto excluído com sucesso' };
  }
}
