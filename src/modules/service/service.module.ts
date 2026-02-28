import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [
    // Port → Adapter bindings go here
    // { provide: 'ServiceRepositoryPort', useClass: DrizzleServiceRepository },
  ],
  exports: [],
})
export class ServiceModule {}
