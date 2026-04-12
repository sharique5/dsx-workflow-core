import { Global, Module } from '@nestjs/common';
import { AzureStorageService } from './azure-storage.service';
import { IStorageService } from './storage.interface';

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER ?? 'azure';

const storageServiceFactory = {
  provide: 'STORAGE_SERVICE',
  useFactory: (): IStorageService => {
    if (STORAGE_PROVIDER === 'azure') {
      return new AzureStorageService();
    }
    // Future: add 'r2' provider here
    throw new Error(`Unknown STORAGE_PROVIDER: ${STORAGE_PROVIDER}`);
  },
};

@Global()
@Module({
  providers: [storageServiceFactory],
  exports: ['STORAGE_SERVICE'],
})
export class StorageModule {}
