import { Module } from '@nestjs/common';
import { CategoryService } from './application/services/category.service.js';
import { CategoryController } from './infrastructure/adapters/primary/category.controller.js';
import { DrizzleCategoryRepository } from './infrastructure/adapters/secondary/persistence/drizzle-category.repository.js';

@Module({
  imports: [],
  controllers: [CategoryController],
  providers: [
    {
      provide: 'CategoryUseCasePort',
      useClass: CategoryService,
    },
    {
      provide: 'CategoryRepositoryPort',
      useClass: DrizzleCategoryRepository,
    },
  ],
  exports: ['CategoryUseCasePort'],
})
export class CategoryModule {}
