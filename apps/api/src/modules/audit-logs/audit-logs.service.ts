import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findByMatter(matterId: string, user: AuthenticatedUser) {
    // Verify the matter belongs to this tenant
    const matter = await this.prisma.matter.findFirst({
      where: { id: matterId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    return this.prisma.auditLog.findMany({
      where: { matterId, tenantId: user.tenantId },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
