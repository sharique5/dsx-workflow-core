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

  async findAll(user: AuthenticatedUser) {
    return this.prisma.matter.findMany({
      where: {
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
            portalInviteStatus: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
}
