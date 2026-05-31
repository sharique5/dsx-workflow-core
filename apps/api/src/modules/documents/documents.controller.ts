import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard)
@Controller('matters/:matterId/documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  findAll(
    @Param('matterId') matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findAll(matterId, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('matterId') matterId: string,
    @UploadedFile() file: any,
    @Body('description') description: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.upload(matterId, file, user, description);
  }

  @Get(':docId/download')
  getDownloadUrl(
    @Param('matterId') matterId: string,
    @Param('docId') docId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.getDownloadUrl(matterId, docId, user);
  }

  @Delete(':docId')
  remove(
    @Param('matterId') matterId: string,
    @Param('docId') docId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.remove(matterId, docId, user);
  }
}
