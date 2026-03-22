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

  getSignedUrl(filePath: string): Promise<string>;

  delete(filePath: string): Promise<void>;
}
