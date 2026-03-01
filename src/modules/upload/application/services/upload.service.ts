import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  StoragePort,
  UploadedFile,
} from '../../domain/ports/output/storage.port.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject('StoragePort')
    private readonly storage: StoragePort,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    tenantId: string,
    folder: string,
  ): Promise<UploadedFile> {
    this.validateFile(file);

    const result = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      tenantId,
      folder,
    );

    this.logger.log(
      `Image uploaded: ${result.path} (${result.size} bytes) for tenant ${tenantId}`,
    );

    return result;
  }

  async uploadImages(
    files: Express.Multer.File[],
    tenantId: string,
    folder: string,
  ): Promise<UploadedFile[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    if (files.length > 10) {
      throw new BadRequestException('Máximo de 10 imagens por upload');
    }

    const results = await Promise.all(
      files.map((file) => this.uploadImage(file, tenantId, folder)),
    );

    return results;
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.storage.delete(filePath);
    this.logger.log(`File deleted: ${filePath}`);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }
}
