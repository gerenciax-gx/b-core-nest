import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from '../../../application/services/dashboard.service.js';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator.js';
import { CurrentTenant } from '../../../../../common/decorators/current-tenant.decorator.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Dados do dashboard (resumo geral)' })
  async getDashboard(
    @CurrentUser('sub') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    const data = await this.dashboardService.getDashboard(userId, tenantId);
    return { success: true, data };
  }
}
