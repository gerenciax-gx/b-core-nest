import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [
    // Port → Adapter bindings go here
    // { provide: 'ProductRepositoryPort', useClass: DrizzleProductRepository },
  ],
  exports: [],
})
export class ProductModule {}
