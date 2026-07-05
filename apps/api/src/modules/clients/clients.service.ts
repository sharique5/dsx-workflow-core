import { randomBytes } from 'crypto';
import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PortalInviteStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { EmailService } from '../../shared/email/email.service';
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
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  /** List clients for the authenticated user's tenant (paginated) */
  async findAll(user: AuthenticatedUser, page = 1, limit = 25) {
    const where = {
      tenantId: user.tenantId,
      role: UserRole.client,
      deletedAt: null,
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: CLIENT_SELECT,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit };
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

    // Prevent duplicate client by phone within tenant
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          phone: dto.phone,
          deletedAt: null,
        },
      });
      if (existingPhone) {
          throw new ConflictException('A client with this phone number already exists');
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

    // Prevent duplicate phone conflict with another user in tenant
    if (dto.phone !== undefined && dto.phone !== null && dto.phone !== client.phone) {
      const phoneConflict = await this.prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          phone: dto.phone,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (phoneConflict) {
        throw new ConflictException('A user with this phone number already exists');
      }
    }

    return this.prisma.user.update({
      where: { id, tenantId: user.tenantId },
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

  /**
   * Send a portal invite to a client.
   * Generates a secure random token, stores it, and emails the invite link.
   * Admin only. Client must have an email address.
   */
  async invite(id: string, user: AuthenticatedUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can invite clients');
    }

    const client = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, role: UserRole.client, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');

    if (!client.email) {
      throw new BadRequestException(
        'Client must have an email address to receive a portal invite',
      );
    }

    // Generate a 32-byte hex token (64 chars) — secure and unguessable
    const token = randomBytes(32).toString('hex');

    const portalUrl = process.env.PORTAL_APP_URL ?? 'http://localhost:5174';
    const inviteUrl = `${portalUrl}/accept-invite?token=${token}`;

    // Persist token and flip status to 'invited'
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        portalInviteToken: token,
        portalInviteStatus: PortalInviteStatus.invited,
      },
      select: CLIENT_SELECT,
    });

    // Send invite email (fire-and-forget — don't fail the request on email error)
    await this.email
      .sendPortalInvite(client.email, inviteUrl, user.name)
      .catch(() => null);

    return updated;
  }
}
