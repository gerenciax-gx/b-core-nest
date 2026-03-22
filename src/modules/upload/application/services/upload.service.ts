import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { UploadUseCasePort } from '../../domain/ports/input/upload.usecase.port.js';
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
];

/** Magic byte signatures for allowed image types */
const MAGIC_BYTES: { mime: string; check: (buf: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/gif', check: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { mime: 'image/webp', check: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

@Injectable()
export class UploadService implements UploadUseCasePort {
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

  async getSignedUrl(filePath: string, tenantId: string): Promise<string> {
    if (!filePath.startsWith(`${tenantId}/`)) {
      throw new ForbiddenException('Sem permissão para acessar este arquivo');
    }
    return this.storage.getSignedUrl(filePath);
  }

  async deleteFile(filePath: string, tenantId: string): Promise<void> {
    if (!filePath.startsWith(`${tenantId}/`)) {
      throw new ForbiddenException('Sem permissão para deletar este arquivo');
    }
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

    // Validate magic bytes — don't trust client-provided mimetype alone
    const detected = MAGIC_BYTES.find((m) => m.check(file.buffer));
    if (!detected) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }
  }
}
