import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/messages.dto';
import { NotificationsService } from '../notifications/notifications.service';

const MSG_SELECT = {
  id: true,
  tenantId: true,
  matterId: true,
  senderId: true,
  sender: { select: { id: true, name: true, role: true } },
  content: true,
  isReadByLawyer: true,
  isReadByClient: true,
  createdAt: true,
} as const;

@Injectable()
export class MessagesService {
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

    const messages = await this.prisma.message.findMany({
      where: { matterId, tenantId: user.tenantId },
      select: MSG_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
  }

  async create(matterId: string, dto: CreateMessageDto, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    const message = await this.prisma.message.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        senderId: user.id,
        content: dto.content,
        // Sender's own side is already "read"
        isReadByLawyer: user.role !== 'client',
        isReadByClient: user.role === 'client',
      },
      select: MSG_SELECT,
    });

    // Notify the other party
    if (user.role === 'client') {
      // Client sent → notify the matter's creator (lawyer)
      const matter = await this.prisma.matter.findUnique({
        where: { id: matterId },
        select: { title: true, internalRef: true, createdBy: true },
      });
      if (matter) {
        void this.notifications.notifyUser(
          matter.createdBy,
          user.tenantId,
          `Your client has sent a new message on case "${matter.title}" (${matter.internalRef}): "${dto.content.slice(0, 120)}${dto.content.length > 120 ? '…' : ''}"`,
          matter.title,
        );
      }
    } else {
      // Lawyer/staff sent → notify client
      void this.notifications.notifyParticipant(
        matterId,
        user.tenantId,
        `Your lawyer has sent you a message: "${dto.content.slice(0, 120)}${dto.content.length > 120 ? '…' : ''}"`,
      );
    }

    return { ...message, createdAt: message.createdAt.toISOString() };
  }

  async markRead(matterId: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    if (user.role === 'client') {
      await this.prisma.message.updateMany({
        where: { matterId, tenantId: user.tenantId, isReadByClient: false },
        data: { isReadByClient: true },
      });
    } else {
      await this.prisma.message.updateMany({
        where: { matterId, tenantId: user.tenantId, isReadByLawyer: false },
        data: { isReadByLawyer: true },
      });
    }

    return { ok: true };
  }

  async unreadCount(matterId: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    const unread = await this.prisma.message.count({
      where: {
        matterId,
        tenantId: user.tenantId,
        ...(user.role === 'client'
          ? { isReadByClient: false }
          : { isReadByLawyer: false }),
      },
    });

    return { unread };
  }
}
