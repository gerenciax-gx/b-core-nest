import { Module } from '@nestjs/common';
import { UploadService } from './application/services/upload.service.js';
import { UploadController } from './infrastructure/adapters/primary/upload.controller.js';
import { SupabaseStorageAdapter } from './infrastructure/adapters/secondary/storage/supabase-storage.adapter.js';

@Module({
  controllers: [UploadController],
  providers: [
    {
      provide: 'UploadUseCasePort',
      useClass: UploadService,
    },
    {
      provide: 'StoragePort',
      useClass: SupabaseStorageAdapter,
    },
  ],
  exports: ['UploadUseCasePort'],
})
export class UploadModule {}
