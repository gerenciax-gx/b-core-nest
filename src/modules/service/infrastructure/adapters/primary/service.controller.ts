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
import { ServiceService } from '../../../application/services/service.service.js';
import {
  CreateServiceDto,
  UpdateServiceDto,
} from '../../../application/dto/service.dto.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @ApiOperation({ summary: 'Criar serviço' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateServiceDto,
  ) {
    const data = await this.serviceService.create(tenantId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Listar serviços' })
  async findAll(@CurrentTenant() tenantId: string) {
    const data = await this.serviceService.findAll(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter serviço por ID' })
  async findById(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.serviceService.findById(id, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar serviço' })
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
  async delete(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceService.delete(id, tenantId);
    return { success: true, message: 'Serviço excluído com sucesso' };
  }
}
