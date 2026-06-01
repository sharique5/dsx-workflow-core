import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import {
  CreateScheduledEventDto,
  UpdateScheduledEventDto,
} from './dto/scheduled-events.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ScheduledEventsService {
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

    return this.prisma.scheduledEvent.findMany({
      where: { matterId, tenantId: user.tenantId },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async create(
    matterId: string,
    dto: CreateScheduledEventDto,
    user: AuthenticatedUser,
  ) {
    await this.assertMatterAccess(matterId, user);

    const event = await this.prisma.scheduledEvent.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        scheduledAt: new Date(dto.scheduledAt),
        outcomeNotes: dto.outcomeNotes,
        courtLink: dto.courtLink,
        judgeNotes: dto.judgeNotes,
        lawyerNotes: dto.lawyerNotes,
        createdBy: user.id,
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    const hearingDate = event.scheduledAt.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', weekday: 'long',
    });
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { title: true, internalRef: true, participantId: true },
    });
    if (matter?.participantId) {
      void this.notifications.notifyParticipant(
        matterId,
        user.tenantId,
        `A new hearing has been scheduled for your case "${matter.title}" (${matter.internalRef}) on ${hearingDate}.`,
      );
    }

    return event;
  }

  async update(
    matterId: string,
    id: string,
    dto: UpdateScheduledEventDto,
    user: AuthenticatedUser,
  ) {
    await this.assertMatterAccess(matterId, user);

    const event = await this.prisma.scheduledEvent.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!event) throw new NotFoundException('Hearing not found');

    return this.prisma.scheduledEvent.update({
      where: { id },
      data: {
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: new Date(dto.scheduledAt),
        }),
        ...(dto.outcomeNotes !== undefined && {
          outcomeNotes: dto.outcomeNotes,
        }),
        ...(dto.courtLink !== undefined && { courtLink: dto.courtLink }),
        ...(dto.judgeNotes !== undefined && { judgeNotes: dto.judgeNotes }),
        ...(dto.lawyerNotes !== undefined && { lawyerNotes: dto.lawyerNotes }),
      },
      include: { creator: { select: { id: true, name: true } } },
    });
  }

  async remove(matterId: string, id: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);

    const event = await this.prisma.scheduledEvent.findFirst({
      where: { id, matterId, tenantId: user.tenantId },
    });
    if (!event) throw new NotFoundException('Hearing not found');

    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete hearings');
    }

    return this.prisma.scheduledEvent.delete({ where: { id } });
  }
}
