import { Module } from '@nestjs/common';
import { DrizzleTenantRepository } from './infrastructure/adapters/secondary/persistence/drizzle-tenant.repository.js';

@Module({
  providers: [
    {
      provide: 'TenantRepositoryPort',
      useClass: DrizzleTenantRepository,
    },
  ],
  exports: ['TenantRepositoryPort'],
})
export class TenantModule {}
