import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DocumentRequestStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateDocumentRequestDto } from './dto/document-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import type { IStorageService } from '../../shared/storage/storage.interface';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DR_SELECT = {
  id: true,
  tenantId: true,
  matterId: true,
  description: true,
  requestedBy: true,
  requester: { select: { id: true, name: true } },
  status: true,
  dueDate: true,
  uploadedFileName: true,
  uploadedStorageKey: true,
  uploadedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class DocumentRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject('STORAGE_SERVICE') private storage: IStorageService,
  ) {}

  private async assertMatterAccess(matterId: string, user: AuthenticatedUser) {
    const matter = await this.prisma.matter.findFirst({
      where: {
        id: matterId,
        tenantId: user.tenantId,
        deletedAt: null,
        ...(user.role === 'client' && { participantId: user.id }),
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');
    return matter;
  }

  async findAll(matterId: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    return this.prisma.documentRequest.findMany({
      where: { matterId, tenantId: user.tenantId },
      select: DR_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    matterId: string,
    dto: CreateDocumentRequestDto,
    user: AuthenticatedUser,
  ) {
    if (user.role === 'client') {
      throw new ForbiddenException('Clients cannot create document requests');
    }

    await this.assertMatterAccess(matterId, user);

    const dr = await this.prisma.documentRequest.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        description: dto.description,
        requestedBy: user.id,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      select: DR_SELECT,
    });

    void this.notifications.notifyParticipant(
      matterId,
      user.tenantId,
      `Your lawyer has requested a document: "${dto.description}".${dto.dueDate ? ` Please submit it by ${new Date(dto.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.` : ''}`,
    );

    return dr;
  }

  /** Client uploads a file in response to a document request */
  async uploadFile(
    matterId: string,
    id: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ) {
    if (user.role !== 'client') {
      throw new ForbiddenException('Only clients can upload via this endpoint');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('File type not allowed. Use PDF, JPG, PNG, or Word documents.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10 MB limit.');
    }

    await this.assertMatterAccess(matterId, user);

    const dr = await this.prisma.documentRequest.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!dr) throw new NotFoundException('Document request not found');
    if (dr.status === DocumentRequestStatus.received) {
      throw new BadRequestException('This document request has already been fulfilled.');
    }

    const { storageKey } = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `document-requests/${matterId}`,
    );

    return this.prisma.documentRequest.update({
      where: { id },
      data: {
        status: DocumentRequestStatus.received,
        uploadedFileName: file.originalname,
        uploadedStorageKey: storageKey,
        uploadedAt: new Date(),
      },
      select: DR_SELECT,
    });
  }

  /** Lawyer reverts a received document request back to pending */
  async revert(matterId: string, id: string, user: AuthenticatedUser) {
    if (user.role === 'client') {
      throw new ForbiddenException('Clients cannot revert document requests');
    }

    await this.assertMatterAccess(matterId, user);

    const dr = await this.prisma.documentRequest.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!dr) throw new NotFoundException('Document request not found');

    // Delete the uploaded file from storage if present
    if (dr.uploadedStorageKey) {
      try {
        await this.storage.delete(dr.uploadedStorageKey);
      } catch {
        // Non-fatal — continue with revert even if blob delete fails
      }
    }

    return this.prisma.documentRequest.update({
      where: { id },
      data: {
        status: DocumentRequestStatus.pending,
        uploadedFileName: null,
        uploadedStorageKey: null,
        uploadedAt: null,
      },
      select: DR_SELECT,
    });
  }

  /** Get a signed download URL for the uploaded file */
  async getDownloadUrl(matterId: string, id: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    const dr = await this.prisma.documentRequest.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!dr) throw new NotFoundException('Document request not found');
    if (!dr.uploadedStorageKey) {
      throw new NotFoundException('No file has been uploaded for this request');
    }

    const downloadUrl = await this.storage.getSignedUrl(dr.uploadedStorageKey, 300);
    return { downloadUrl, fileName: dr.uploadedFileName };
  }

  /** Mark a document request as received — staff/lawyer manual override */
  async markReceived(matterId: string, id: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    const dr = await this.prisma.documentRequest.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!dr) throw new NotFoundException('Document request not found');

    return this.prisma.documentRequest.update({
      where: { id },
      data: { status: DocumentRequestStatus.received },
      select: DR_SELECT,
    });
  }
}
