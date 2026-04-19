import { Injectable } from '@nestjs/common';
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { IStorageService, StorageUploadResult } from './storage.interface';

@Injectable()
export class AzureStorageService implements IStorageService {
  private client: BlobServiceClient;
  private containerName: string;
  private accountName: string;

  constructor() {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT ?? '';
    this.containerName =
      process.env.AZURE_STORAGE_CONTAINER ?? 'dsx-workflow-files';

    if (!this.accountName) {
      throw new Error('AZURE_STORAGE_ACCOUNT is not configured');
    }

    const credential = new DefaultAzureCredential();
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

  async getSignedUrl(
    storageKey: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const startsOn = new Date();
    const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);

    const userDelegationKey = await this.client.getUserDelegationKey(
      startsOn,
      expiresOn,
    );

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: storageKey,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      userDelegationKey,
      this.accountName,
    ).toString();

    return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${storageKey}?${sas}`;
  }

  async delete(storageKey: string): Promise<void> {
    const containerClient = this.client.getContainerClient(this.containerName);
    await containerClient.deleteBlob(storageKey);
  }
}
