import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  private async assertMatterAccess(matterId: string, tenantId: string) {
    const matter = await this.prisma.matter.findFirst({
      where: { id: matterId, tenantId, deletedAt: null },
    });
    if (!matter) throw new NotFoundException('Matter not found');
    return matter;
  }

  async findAll(matterId: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user.tenantId);

    return this.prisma.note.findMany({
      where: { matterId, tenantId: user.tenantId },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(matterId: string, dto: CreateNoteDto, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user.tenantId);

    return this.prisma.note.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        content: dto.content,
        isPublished: dto.isPublished ?? false,
        createdBy: user.id,
      },
      include: { creator: { select: { id: true, name: true } } },
    });
  }

  async update(matterId: string, id: string, dto: UpdateNoteDto, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user.tenantId);

    const note = await this.prisma.note.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!note) throw new NotFoundException('Note not found');

    // Only the author or an admin can edit a note
    if (note.createdBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You can only edit your own notes');
    }

    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: { creator: { select: { id: true, name: true } } },
    });
  }

  async remove(matterId: string, id: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user.tenantId);

    const note = await this.prisma.note.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!note) throw new NotFoundException('Note not found');

    if (note.createdBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You can only delete your own notes');
    }

    return this.prisma.note.delete({ where: { id } });
  }
}
