import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateMatterDto, UpdateMatterDto } from './dto/matters.dto';

@Injectable()
export class MattersService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: AuthenticatedUser, page = 1, limit = 50) {
    const where: Prisma.MatterWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
      ...(user.role === 'client' && { participantId: user.id }),
    };

    const [data, total] = await Promise.all([
      this.prisma.matter.findMany({
        where,
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              email: true,
              portalInviteStatus: true,
            },
          },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.matter.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const matter = await this.prisma.matter.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        deletedAt: null,
        ...(user.role === 'client' && { participantId: user.id }),
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            portalInviteStatus: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!matter) throw new NotFoundException('Matter not found');
    return matter;
  }

  async create(dto: CreateMatterDto, user: AuthenticatedUser) {
    // Check internalRef is unique within this tenant
    const existing = await this.prisma.matter.findFirst({
      where: {
        tenantId: user.tenantId,
        internalRef: dto.internalRef,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        `A matter with ref "${dto.internalRef}" already exists`,
      );
    }

    return this.prisma.matter.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        internalRef: dto.internalRef,
        externalRef: dto.externalRef,
        participantId: dto.participantId,
        statusKey: dto.statusKey,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        createdBy: user.id,
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            portalInviteStatus: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateMatterDto, user: AuthenticatedUser) {
    await this.findOne(id, user); // throws if not found / wrong tenant

    return this.prisma.matter.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.externalRef !== undefined && { externalRef: dto.externalRef }),
        ...(dto.participantId !== undefined && {
          participantId: dto.participantId,
        }),
        ...(dto.statusKey !== undefined && { statusKey: dto.statusKey }),
        ...(dto.metadata !== undefined && {
          metadata: dto.metadata as Prisma.InputJsonValue,
        }),
      } as Prisma.MatterUncheckedUpdateInput,
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            portalInviteStatus: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async close(id: string, user: AuthenticatedUser) {
    const matter = await this.findOne(id, user);

    if (matter.statusKey === 'closed') {
      throw new ConflictException('Matter is already closed');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can close matters');
    }

    return this.prisma.matter.update({
      where: { id },
      data: { statusKey: 'closed' },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            portalInviteStatus: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);

    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete matters');
    }

    return this.prisma.matter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getClientNextHearing(user: AuthenticatedUser) {
    const matterWhere =
      user.role === 'client'
        ? { tenantId: user.tenantId, participantId: user.id, deletedAt: null }
        : { tenantId: user.tenantId, deletedAt: null };

    const event = await this.prisma.scheduledEvent.findFirst({
      where: {
        tenantId: user.tenantId,
        scheduledAt: { gte: new Date() },
        matter: matterWhere,
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        matter: { select: { id: true, title: true, internalRef: true } },
      },
    });

    if (!event) return null;

    return {
      id: event.id,
      matterId: event.matterId,
      matterTitle: event.matter.title,
      matterRef: event.matter.internalRef,
      scheduledAt: event.scheduledAt.toISOString(),
    };
  }

  async getDashboardStats(user: AuthenticatedUser) {
    const tenantWhere = { tenantId: user.tenantId, deletedAt: null };

    const [totalMatters, openMatters, closedMatters, upcomingEvents] =
      await Promise.all([
        this.prisma.matter.count({ where: tenantWhere }),
        this.prisma.matter.count({ where: { ...tenantWhere, statusKey: { not: 'closed' } } }),
        this.prisma.matter.count({ where: { ...tenantWhere, statusKey: 'closed' } }),
        this.prisma.scheduledEvent.findMany({
          where: {
            tenantId: user.tenantId,
            scheduledAt: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 30,
          include: {
            matter: { select: { id: true, title: true, internalRef: true } },
          },
        }),
      ]);

    return {
      totalMatters,
      openMatters,
      closedMatters,
      upcomingHearings: upcomingEvents.map((e) => ({
        id: e.id,
        matterId: e.matterId,
        matterTitle: e.matter.title,
        matterRef: e.matter.internalRef,
        scheduledAt: e.scheduledAt.toISOString(),
      })),
    };
  }
}
