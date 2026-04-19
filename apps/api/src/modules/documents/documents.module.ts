import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
