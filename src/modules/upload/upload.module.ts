import { Module } from '@nestjs/common';
import { UploadService } from './application/services/upload.service.js';
import { UploadController } from './infrastructure/adapters/primary/upload.controller.js';
import { SupabaseStorageAdapter } from './infrastructure/adapters/secondary/storage/supabase-storage.adapter.js';

@Module({
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: 'StoragePort',
      useClass: SupabaseStorageAdapter,
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
