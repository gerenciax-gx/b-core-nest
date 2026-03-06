import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DashboardUseCasePort } from '../../domain/ports/input/dashboard.usecase.port.js';
import type { UserRepositoryPort } from '../../../auth/domain/ports/output/user.repository.port.js';
import type { TenantRepositoryPort } from '../../../tenant/domain/ports/output/tenant.repository.port.js';
import type { DashboardResponseDto } from '../dto/dashboard-response.dto.js';

@Injectable()
export class DashboardService implements DashboardUseCasePort {
  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepo: UserRepositoryPort,

    @Inject('TenantRepositoryPort')
    private readonly tenantRepo: TenantRepositoryPort,
  ) {}

  async getDashboard(
    userId: string,
    tenantId: string,
  ): Promise<DashboardResponseDto> {
    const [user, tenant] = await Promise.all([
      this.userRepo.findById(userId),
      this.tenantRepo.findById(tenantId),
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
      // Placeholders — serão preenchidos nas fases seguintes
      activeToolsCount: 0,
      unreadNotifications: 0,
      subscription: null,
    };
  }
}
