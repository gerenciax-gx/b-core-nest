import { Module } from '@nestjs/common';
import { ServiceService } from './application/services/service.service.js';
import { ServiceController } from './infrastructure/adapters/primary/service.controller.js';
import { DrizzleServiceRepository } from './infrastructure/adapters/secondary/persistence/drizzle-service.repository.js';

@Module({
  imports: [],
  controllers: [ServiceController],
  providers: [
    ServiceService,
    {
      provide: 'ServiceRepositoryPort',
      useClass: DrizzleServiceRepository,
    },
  ],
  exports: [ServiceService],
})
export class ServiceModule {}
