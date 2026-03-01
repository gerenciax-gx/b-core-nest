export interface UploadedFile {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface StoragePort {
  upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    tenantId: string,
    folder: string,
  ): Promise<UploadedFile>;

  delete(filePath: string): Promise<void>;
}
