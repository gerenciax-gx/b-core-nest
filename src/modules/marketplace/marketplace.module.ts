import { Module } from '@nestjs/common';
import { MarketplaceController } from './infrastructure/adapters/primary/marketplace.controller.js';
import { MarketplaceService } from './application/services/marketplace.service.js';
import { DrizzleMarketplaceRepository } from './infrastructure/adapters/secondary/persistence/drizzle-marketplace.repository.js';

@Module({
  imports: [],
  controllers: [MarketplaceController],
  providers: [
    {
      provide: 'MarketplaceUseCasePort',
      useClass: MarketplaceService,
    },
    {
      provide: 'MarketplaceRepositoryPort',
      useClass: DrizzleMarketplaceRepository,
    },
  ],
  exports: ['MarketplaceUseCasePort'],
})
export class MarketplaceModule {}
