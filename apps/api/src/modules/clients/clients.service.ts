import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

const CLIENT_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  portalInviteStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  /** List all clients for the authenticated user's tenant */
  async findAll(user: AuthenticatedUser) {
    return this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: UserRole.client,
        deletedAt: null,
      },
      select: CLIENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Find a single client by id within the tenant */
  async findOne(id: string, user: AuthenticatedUser) {
    const client = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        role: UserRole.client,
        deletedAt: null,
      },
      select: CLIENT_SELECT,
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  /** Create a new client record (not yet invited to portal) */
  async create(dto: CreateClientDto, user: AuthenticatedUser) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException(
        'At least one of email or phone is required',
      );
    }

    // Prevent duplicate client by email within tenant
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          email: dto.email.toLowerCase(),
          deletedAt: null,
        },
      });
      if (existing) {
        throw new ConflictException('A client with this email already exists');
      }
    }

    return this.prisma.user.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        email: dto.email ? dto.email.toLowerCase() : null,
        phone: dto.phone ?? null,
        role: UserRole.client,
        isActive: true,
      },
      select: CLIENT_SELECT,
    });
  }

  /** Update a client's name, email, or phone */
  async update(id: string, dto: UpdateClientDto, user: AuthenticatedUser) {
    const client = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        role: UserRole.client,
        deletedAt: null,
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    // Prevent duplicate email conflict with another user in tenant
    if (dto.email && dto.email.toLowerCase() !== client.email) {
      const conflict = await this.prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          email: dto.email.toLowerCase(),
          deletedAt: null,
        },
      });
      if (conflict) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email !== undefined && {
          email: dto.email ? dto.email.toLowerCase() : null,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone ?? null }),
      },
      select: CLIENT_SELECT,
    });
  }
}
