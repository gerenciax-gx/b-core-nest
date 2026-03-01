import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TenantModule } from '../tenant/tenant.module.js';
import { DashboardService } from './application/services/dashboard.service.js';
import { DashboardController } from './infrastructure/adapters/primary/dashboard.controller.js';

@Module({
  imports: [AuthModule, TenantModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
