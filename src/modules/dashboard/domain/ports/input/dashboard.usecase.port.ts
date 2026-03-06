import type { DashboardResponseDto } from '../../../application/dto/dashboard-response.dto.js';

export interface DashboardUseCasePort {
  getDashboard(userId: string, tenantId: string): Promise<DashboardResponseDto>;
}
