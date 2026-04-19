import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DocumentRequestStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateDocumentRequestDto } from './dto/document-request.dto';

const DR_SELECT = {
  id: true,
  tenantId: true,
  matterId: true,
  description: true,
  requestedBy: true,
  requester: { select: { id: true, name: true } },
  status: true,
  dueDate: true,
  createdAt: true,
} as const;

@Injectable()
export class DocumentRequestsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.documentRequest.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        description: dto.description,
        requestedBy: user.id,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      select: DR_SELECT,
    });
  }

  /** Mark a document request as received — admin/staff only */
  async markReceived(matterId: string, id: string, user: AuthenticatedUser) {
    if (user.role === 'client') {
      throw new ForbiddenException(
        'Clients cannot update document request status',
      );
    }

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
