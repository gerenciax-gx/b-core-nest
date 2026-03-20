import { Module } from '@nestjs/common';
import { MarketplaceController } from './infrastructure/adapters/primary/marketplace.controller.js';
import { AdminMarketplaceController } from './infrastructure/adapters/primary/admin-marketplace.controller.js';
import { MarketplaceService } from './application/services/marketplace.service.js';
import { AdminMarketplaceService } from './application/services/admin-marketplace.service.js';
import { DrizzleMarketplaceRepository } from './infrastructure/adapters/secondary/persistence/drizzle-marketplace.repository.js';
import { DrizzleAdminMarketplaceRepository } from './infrastructure/adapters/secondary/persistence/drizzle-admin-marketplace.repository.js';

@Module({
  imports: [],
  controllers: [MarketplaceController, AdminMarketplaceController],
  providers: [
    {
      provide: 'MarketplaceUseCasePort',
      useClass: MarketplaceService,
    },
    {
      provide: 'MarketplaceRepositoryPort',
      useClass: DrizzleMarketplaceRepository,
    },
    {
      provide: 'AdminMarketplaceUseCasePort',
      useClass: AdminMarketplaceService,
    },
    {
      provide: 'AdminMarketplaceRepositoryPort',
      useClass: DrizzleAdminMarketplaceRepository,
    },
  ],
  exports: ['MarketplaceUseCasePort', 'MarketplaceRepositoryPort'],
})
export class MarketplaceModule {}
