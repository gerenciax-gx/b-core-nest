import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from '../../../application/services/dashboard.service.js';
import { DashboardSuccessResponseDto } from '../../../application/dto/dashboard-response-wrapper.dto.js';
import { ApiErrorResponseDto } from '../../../../../common/swagger/api-responses.dto.js';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Dados do dashboard (resumo geral)' })
  @ApiResponse({ status: 200, description: 'Dados do dashboard retornados', type: DashboardSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ApiErrorResponseDto })
  async getDashboard(
    @CurrentUser('sub') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.dashboardService.getDashboard(userId, tenantId);
    return { success: true, data };
  }
}
