import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { IStorageService, StorageUploadResult } from './storage.interface';

@Injectable()
export class AzureStorageService implements IStorageService {
  private client: BlobServiceClient;
  private containerName: string;
  private accountName: string;
  private accountKey: string;

  constructor() {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT ?? '';
    this.accountKey = process.env.AZURE_STORAGE_KEY ?? '';
    this.containerName =
      process.env.AZURE_STORAGE_CONTAINER ?? 'dsx-workflow-files';

    if (!this.accountName || !this.accountKey) {
      throw new NotImplementedException(
        'Azure Storage credentials not configured',
      );
    }

    const credential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey,
    );
    this.client = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      credential,
    );
  }

  async upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder = 'documents',
  ): Promise<StorageUploadResult> {
    const storageKey = `${folder}/${Date.now()}-${fileName}`;
    const containerClient = this.client.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlockBlobClient(storageKey);

    await blobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });

    return { storageKey };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSignedUrl(
    storageKey: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const credential = new StorageSharedKeyCredential(
      this.accountName,
      this.accountKey,
    );
    const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: storageKey,
        permissions: BlobSASPermissions.parse('r'),
        expiresOn,
      },
      credential,
    ).toString();

    return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${storageKey}?${sas}`;
  }

  async delete(storageKey: string): Promise<void> {
    const containerClient = this.client.getContainerClient(this.containerName);
    await containerClient.deleteBlob(storageKey);
  }
}
