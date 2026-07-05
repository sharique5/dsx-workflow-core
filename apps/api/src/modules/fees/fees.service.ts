import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { CreateFeeDto, LogPaymentDto } from './dto/fee.dto';
import type { PaymentRecord } from '@dsx/shared';

const FEE_SELECT = {
  id: true,
  tenantId: true,
  matterId: true,
  type: true,
  billingCycle: true,
  totalAmount: true,
  paidAmount: true,
  paymentHistory: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toFeeDto(fee: {
  id: string;
  tenantId: string;
  matterId: string;
  type: string;
  billingCycle: string | null;
  totalAmount: { toNumber?: () => number } | string | number;
  paidAmount: { toNumber?: () => number } | string | number;
  paymentHistory: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const total =
    typeof fee.totalAmount === 'object' &&
    fee.totalAmount !== null &&
    'toNumber' in fee.totalAmount
      ? (fee.totalAmount as { toNumber: () => number }).toNumber()
      : Number(fee.totalAmount);
  const paid =
    typeof fee.paidAmount === 'object' &&
    fee.paidAmount !== null &&
    'toNumber' in fee.paidAmount
      ? (fee.paidAmount as { toNumber: () => number }).toNumber()
      : Number(fee.paidAmount);
  return {
    ...fee,
    totalAmount: total,
    paidAmount: paid,
    dueAmount: Math.max(0, total - paid),
    paymentHistory: fee.paymentHistory as PaymentRecord[],
    createdAt: fee.createdAt.toISOString(),
    updatedAt: fee.updatedAt.toISOString(),
  };
}

@Injectable()
export class FeesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async assertMatterAccess(matterId: string, user: AuthenticatedUser) {
    const matter = await this.prisma.matter.findFirst({
      where: {
        id: matterId,
        tenantId: user.tenantId,
        ...(user.role === 'client' && { participantId: user.id }),
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  async findAll(matterId: string, user: AuthenticatedUser) {
    await this.assertMatterAccess(matterId, user);
    const fees = await this.prisma.fee.findMany({
      where: { matterId, tenantId: user.tenantId },
      select: FEE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return fees.map(toFeeDto);
  }

  async create(matterId: string, dto: CreateFeeDto, user: AuthenticatedUser) {
    if (user.role === 'client') {
      throw new ForbiddenException('Clients cannot create fees');
    }
    await this.assertMatterAccess(matterId, user);
    const fee = await this.prisma.fee.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        type: dto.type,
        billingCycle: dto.billingCycle ?? null,
        totalAmount: dto.totalAmount,
      },
      select: FEE_SELECT,
    });

    // Notify client about new fee
    void this.notifications.notifyParticipant(
      matterId,
      user.tenantId,
      `A new fee of ₹${dto.totalAmount.toLocaleString('en-IN')} (${dto.type.replace(/_/g, ' ')}) has been added to your case.`,
    );

    return toFeeDto(fee);
  }

  async logPayment(
    matterId: string,
    feeId: string,
    dto: LogPaymentDto,
    user: AuthenticatedUser,
  ) {
    if (user.role === 'client') {
      throw new ForbiddenException('Clients cannot log payments');
    }
    await this.assertMatterAccess(matterId, user);

    const fee = await this.prisma.fee.findFirst({
      where: { id: feeId, matterId, tenantId: user.tenantId },
      select: FEE_SELECT,
    });
    if (!fee) throw new NotFoundException('Fee not found');

    const currentPaid = Number(fee.paidAmount);
    const currentTotal = Number(fee.totalAmount);
    const newPaid = currentPaid + dto.amount;
    if (newPaid > currentTotal) {
      throw new BadRequestException('Payment exceeds outstanding balance');
    }

    const history = (fee.paymentHistory as unknown as PaymentRecord[]) ?? [];
    const newRecord: PaymentRecord = {
      amount: dto.amount,
      paidAt: dto.paidAt ?? new Date().toISOString(),
      ...(dto.note ? { note: dto.note } : {}),
    };

    const updated = await this.prisma.fee.update({
      where: { id: feeId, tenantId: user.tenantId },
      data: {
        paidAmount: newPaid,
        paymentHistory: [...history, newRecord] as object[],
      },
      select: FEE_SELECT,
    });

    const remaining = currentTotal - newPaid;
    const msg = remaining > 0
      ? `Payment of ₹${dto.amount.toLocaleString('en-IN')} received. Outstanding balance: ₹${remaining.toLocaleString('en-IN')}.`
      : `Payment of ₹${dto.amount.toLocaleString('en-IN')} received. Your balance is now cleared.`;
    void this.notifications.notifyParticipant(matterId, user.tenantId, msg);

    return toFeeDto(updated);
  }
}
