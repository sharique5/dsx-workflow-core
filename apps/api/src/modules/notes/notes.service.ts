import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateNoteDto, UpdateNoteDto } from './dto/notes.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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

    return this.prisma.note.findMany({
      where: {
        matterId,
        tenantId: user.tenantId,
        ...(user.role === 'client' && { isPublished: true }),
      },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(matterId: string, dto: CreateNoteDto, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    const note = await this.prisma.note.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        content: dto.content,
        isPublished: dto.isPublished ?? false,
        createdBy: user.id,
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    if (note.isPublished) {
      void this.notifications.notifyParticipant(
        matterId,
        user.tenantId,
        `Your lawyer has shared a new note on your case: "${note.content.slice(0, 120)}${note.content.length > 120 ? '…' : ''}"`,
      );
    }

    return note;
  }

  async update(
    matterId: string,
    id: string,
    dto: UpdateNoteDto,
    user: AuthenticatedUser,
  ) {
    await this.assertMatterAccess(matterId, user);

    const note = await this.prisma.note.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!note) throw new NotFoundException('Note not found');

    // Only the author or an admin can edit a note
    if (note.createdBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You can only edit your own notes');
    }

    const updated = await this.prisma.note.update({
      where: { id, tenantId: user.tenantId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    // Notify when a previously internal note is published
    if (dto.isPublished === true && !note.isPublished) {
      void this.notifications.notifyParticipant(
        matterId,
        user.tenantId,
        `Your lawyer has shared a note on your case: "${updated.content.slice(0, 120)}${updated.content.length > 120 ? '…' : ''}"`,
      );
    }

    return updated;
  }

  async remove(matterId: string, id: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    const note = await this.prisma.note.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!note) throw new NotFoundException('Note not found');

    if (note.createdBy !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You can only delete your own notes');
    }

    return this.prisma.note.delete({ where: { id, tenantId: user.tenantId } });
  }
}
