import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [
    // Port → Adapter bindings go here
    // { provide: 'StoragePort', useClass: SupabaseStorageAdapter },
  ],
  exports: [],
})
export class UploadModule {}
