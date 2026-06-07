import { Module } from '@nestjs/common';
import { DocumentRequestsController } from './document-requests.controller';
import { DocumentRequestsService } from './document-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [NotificationsModule, StorageModule],
  controllers: [DocumentRequestsController],
  providers: [DocumentRequestsService],
})
export class DocumentRequestsModule {}
