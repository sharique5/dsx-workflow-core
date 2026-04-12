export interface StorageUploadResult {
  storageKey: string;
}

export interface IStorageService {
  upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder?: string,
  ): Promise<StorageUploadResult>;

  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;

  delete(storageKey: string): Promise<void>;
}
