import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DashboardUseCasePort } from '../../domain/ports/input/dashboard.usecase.port.js';
import type { UserRepositoryPort } from '../../../auth/domain/ports/output/user.repository.port.js';
import type { TenantRepositoryPort } from '../../../tenant/domain/ports/output/tenant.repository.port.js';
import type { DashboardRepositoryPort } from '../../domain/ports/output/dashboard.repository.port.js';
import type { DashboardResponseDto } from '../dto/dashboard-response.dto.js';

@Injectable()
export class DashboardService implements DashboardUseCasePort {
  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    @Inject('TenantRepositoryPort')
    private readonly tenantRepo: TenantRepositoryPort,

    @Inject('DashboardRepositoryPort')
    private readonly dashboardRepo: DashboardRepositoryPort,
  ) {}

  async getDashboard(
    userId: string,
    tenantId: string,
  ): Promise<DashboardResponseDto> {
    const [user, tenant, metrics] = await Promise.all([
      this.userRepo.findById(userId),
      this.tenantRepo.findById(tenantId),
      this.dashboardRepo.getMetrics(tenantId),
    ]);

    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tenant: {
        companyName: tenant.companyName,
        companyType: tenant.companyType,
        status: tenant.status,
        logoUrl: tenant.logoUrl,
      },
      activeToolsCount: metrics.activeToolsCount,
      unreadNotifications: metrics.unreadNotifications,
      activeCollaborators: metrics.activeCollaborators,
      totalProducts: metrics.totalProducts,
      totalServices: metrics.totalServices,
      subscription: metrics.subscription,
    };
  }
}
