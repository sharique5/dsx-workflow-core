import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentRequestsService } from './document-requests.service';
import { CreateDocumentRequestDto } from './dto/document-request.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Controller('matters/:matterId/document-requests')
@UseGuards(JwtAuthGuard)
export class DocumentRequestsController {
  constructor(private documentRequestsService: DocumentRequestsService) {}

  /** GET /api/v1/matters/:matterId/document-requests */
  @Get()
  findAll(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentRequestsService.findAll(matterId, user);
  }

  /** POST /api/v1/matters/:matterId/document-requests */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() dto: CreateDocumentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentRequestsService.create(matterId, dto, user);
  }

  /** POST /api/v1/matters/:matterId/document-requests/:id/upload */
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadFile(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentRequestsService.uploadFile(matterId, id, file, user);
  }

  /** GET /api/v1/matters/:matterId/document-requests/:id/download */
  @Get(':id/download')
  getDownloadUrl(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentRequestsService.getDownloadUrl(matterId, id, user);
  }

  /** PATCH /api/v1/matters/:matterId/document-requests/:id/revert */
  @Patch(':id/revert')
  revert(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentRequestsService.revert(matterId, id, user);
  }

  /** PATCH /api/v1/matters/:matterId/document-requests/:id/receive */
  @Patch(':id/receive')
  markReceived(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentRequestsService.markReceived(matterId, id, user);
  }
}
