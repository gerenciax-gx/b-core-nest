import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CollaboratorService } from './application/services/collaborator.service.js';
import { CollaboratorController } from './infrastructure/adapters/primary/collaborator.controller.js';
import { DrizzleCollaboratorRepository } from './infrastructure/adapters/secondary/persistence/drizzle-collaborator.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [CollaboratorController],
  providers: [
    {
      provide: 'CollaboratorUseCasePort',
      useClass: CollaboratorService,
    },
    {
      provide: 'CollaboratorRepositoryPort',
      useClass: DrizzleCollaboratorRepository,
    },
  ],
  exports: ['CollaboratorUseCasePort'],
})
export class CollaboratorModule {}
