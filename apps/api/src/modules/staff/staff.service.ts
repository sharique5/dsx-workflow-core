import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { EmailService } from '../../shared/email/email.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateStaffDto } from './dto/staff.dto';

const STAFF_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async findAll(user: AuthenticatedUser) {
    return this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: { in: [UserRole.admin, UserRole.staff] },
        deletedAt: null,
      },
      select: STAFF_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateStaffDto, user: AuthenticatedUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can add staff');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId: user.tenantId,
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this email already exists in your workspace',
      );
    }

    const newUser = await this.prisma.user.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        role: dto.role,
        isActive: true,
      },
      select: STAFF_SELECT,
    });

    // Send welcome / first-login email (best-effort — don't fail the request)
    await this.email
      .sendStaffWelcome(newUser.email!, newUser.name)
      .catch(() => null);

    return newUser;
  }

  async deactivate(id: string, user: AuthenticatedUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can deactivate staff');
    }

    if (id === user.id) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const target = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!target) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: STAFF_SELECT,
    });
  }

  async reactivate(id: string, user: AuthenticatedUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can reactivate staff');
    }

    const target = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!target) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: STAFF_SELECT,
    });
  }
}
