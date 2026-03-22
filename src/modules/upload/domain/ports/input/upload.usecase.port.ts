import type { UploadedFile } from '../output/storage.port.js';

export interface UploadUseCasePort {
  uploadImage(
    file: Express.Multer.File,
    tenantId: string,
    folder: string,
  ): Promise<UploadedFile>;
  uploadImages(
    files: Express.Multer.File[],
    tenantId: string,
    folder: string,
  ): Promise<UploadedFile[]>;
  getSignedUrl(filePath: string, tenantId: string): Promise<string>;
  deleteFile(filePath: string, tenantId: string): Promise<void>;
}
