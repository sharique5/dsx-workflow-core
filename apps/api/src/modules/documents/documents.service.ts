import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { IStorageService } from '../../shared/storage/storage.interface';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const DOC_SELECT = {
  id: true,
  tenantId: true,
  matterId: true,
  fileName: true,
  storageKey: true,
  fileSizeBytes: true,
  mimeType: true,
  description: true,
  uploadedBy: true,
  createdAt: true,
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    @Inject('STORAGE_SERVICE') private storage: IStorageService,
  ) {}

  private async assertMatterAccess(
    matterId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const matter = await this.prisma.matter.findFirst({
      where: {
        id: matterId,
        tenantId: user.tenantId,
        ...(user.role === 'client' && { participantId: user.id }),
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  async findAll(matterId: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);
    const docs = await this.prisma.document.findMany({
      where: { matterId, tenantId: user.tenantId },
      select: DOC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => ({
      ...d,
      storageKey: undefined,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async upload(
    matterId: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
    description?: string,
  ) {
    if (user.role === 'client') {
      throw new ForbiddenException('Clients cannot upload documents');
    }
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'File type not allowed. Allowed: PDF, Word, Excel, JPEG, PNG, WebP',
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 10 MB limit');
    }

    await this.assertMatterAccess(matterId, user);

    const { storageKey } = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      `tenants/${user.tenantId}/matters/${matterId}`,
    );

    const doc = await this.prisma.document.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        fileName: file.originalname,
        storageKey,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        description: description ?? null,
        uploadedBy: user.id,
      },
      select: DOC_SELECT,
    });

    return {
      ...doc,
      storageKey: undefined,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async getDownloadUrl(
    matterId: string,
    docId: string,
    user: AuthenticatedUser,
  ) {
    await this.assertMatterAccess(matterId, user);

    const doc = await this.prisma.document.findFirst({
      where: { id: docId, matterId, tenantId: user.tenantId },
      select: DOC_SELECT,
    });
    if (!doc) throw new NotFoundException('Document not found');

    const downloadUrl = await this.storage.getSignedUrl(doc.storageKey, 900);
    return { downloadUrl };
  }

  async remove(matterId: string, docId: string, user: AuthenticatedUser) {
    if (user.role === 'client') {
      throw new ForbiddenException('Clients cannot delete documents');
    }

    await this.assertMatterAccess(matterId, user);

    const doc = await this.prisma.document.findFirst({
      where: { id: docId, matterId, tenantId: user.tenantId },
      select: DOC_SELECT,
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.storage.delete(doc.storageKey);
    await this.prisma.document.delete({ where: { id: docId } });
    return { success: true };
  }
}
