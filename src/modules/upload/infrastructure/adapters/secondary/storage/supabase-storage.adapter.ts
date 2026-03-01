import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type {
  StoragePort,
  UploadedFile,
} from '../../../../domain/ports/output/storage.port.js';

const BUCKET_NAME = 'uploads';

@Injectable()
export class SupabaseStorageAdapter implements StoragePort {
  private supabase: SupabaseClient | null = null;
  private readonly logger = new Logger(SupabaseStorageAdapter.name);

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_KEY');

    if (url && serviceKey) {
      this.supabase = createClient(url, serviceKey);
    } else {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_KEY not set — uploads will fail until configured',
      );
    }
  }

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new InternalServerErrorException(
        'Supabase Storage não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.',
      );
    }
    return this.supabase;
  }

  async upload(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    tenantId: string,
    folder: string,
  ): Promise<UploadedFile> {
    const ext = this.extractExtension(originalName);
    const filePath = `${tenantId}/${folder}/${randomUUID()}${ext}`;

    const client = this.getClient();

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Upload failed: ${error.message}`, error);
      throw new InternalServerErrorException('Falha no upload do arquivo');
    }

    const {
      data: { publicUrl },
    } = client.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
      size: buffer.length,
      mimeType,
    };
  }

  async delete(filePath: string): Promise<void> {
    const { error } = await this.getClient().storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      this.logger.error(`Delete failed: ${error.message}`, error);
      throw new InternalServerErrorException('Falha ao remover arquivo');
    }
  }

  private extractExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot !== -1 ? filename.substring(dot) : '';
  }
}
