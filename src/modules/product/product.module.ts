import { Module } from '@nestjs/common';
import { ProductService } from './application/services/product.service.js';
import { ProductController } from './infrastructure/adapters/primary/product.controller.js';
import { DrizzleProductRepository } from './infrastructure/adapters/secondary/persistence/drizzle-product.repository.js';

@Module({
  imports: [],
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: 'ProductRepositoryPort',
      useClass: DrizzleProductRepository,
    },
  ],
  exports: [ProductService],
})
export class ProductModule {}
