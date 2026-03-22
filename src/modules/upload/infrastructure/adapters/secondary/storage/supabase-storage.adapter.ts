import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import type {
  StoragePort,
  UploadedFile,
} from '../../../../domain/ports/output/storage.port.js';

const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour in seconds

@Injectable()
export class SupabaseStorageAdapter implements StoragePort {
  private s3: S3Client | null = null;
  private bucketName: string;
  private readonly logger = new Logger(SupabaseStorageAdapter.name);

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY');
    const region = this.config.get<string>('S3_REGION') || 'sa-east-1';
    this.bucketName = this.config.get<string>('S3_BUCKET') || 'gx-core-dev';

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        endpoint,
        region,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
    } else {
      this.logger.warn(
        'S3_ENDPOINT, S3_ACCESS_KEY ou S3_SECRET_KEY não configurados — uploads falharão',
      );
    }
  }

  private getClient(): S3Client {
    if (!this.s3) {
      throw new InternalServerErrorException(
        'S3 Storage não configurado. Defina S3_ENDPOINT, S3_ACCESS_KEY e S3_SECRET_KEY.',
      );
    }
    return this.s3;
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

    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: filePath,
          Body: buffer,
          ContentType: mimeType,
        }),
      );
    } catch (error: any) {
      this.logger.error(`Upload failed: ${error.message}`, error);
      throw new InternalServerErrorException('Falha no upload do arquivo');
    }

    const url = await this.getSignedUrl(filePath);

    return {
      url,
      path: filePath,
      size: buffer.length,
      mimeType,
    };
  }

  async getSignedUrl(filePath: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });
      return await getSignedUrl(this.getClient(), command, {
        expiresIn: SIGNED_URL_EXPIRY,
      });
    } catch (error: any) {
      this.logger.error(`Signed URL failed for ${filePath}: ${error.message}`);
      throw new InternalServerErrorException('Falha ao gerar URL do arquivo');
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: filePath,
        }),
      );
    } catch (error: any) {
      this.logger.error(`Delete failed: ${error.message}`, error);
      throw new InternalServerErrorException('Falha ao remover arquivo');
    }
  }

  private extractExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot !== -1 ? filename.substring(dot) : '';
  }
}
