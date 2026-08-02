import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaService } from '../../shared/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../../shared/email/email.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { 
  CreateFeeDto, 
  LogPaymentDto, 
  CreateRazorpayOrderDto, 
  VerifyRazorpayPaymentDto 
} from './dto/fee.dto';
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
  private razorpay: Razorpay;
  private readonly logger = new Logger(FeesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private config: ConfigService,
    private email: EmailService,
  ) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay credentials not configured. Payment features will not work.');
    } else {
      this.logger.log(`Razorpay initialized with Key ID: ${keyId.substring(0, 10)}...`);
    }

    this.razorpay = new Razorpay({
      key_id: keyId || '',
      key_secret: keySecret || '',
    });
  }

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

  async createRazorpayOrder(
    matterId: string,
    feeId: string,
    dto: CreateRazorpayOrderDto,
    user: AuthenticatedUser,
  ) {
    await this.assertMatterAccess(matterId, user);

    // Validate Razorpay configuration
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    
    if (!keyId || !keySecret) {
      throw new BadRequestException(
        'Razorpay payment gateway is not configured. Please contact support.',
      );
    }

    const fee = await this.prisma.fee.findFirst({
      where: { id: feeId, matterId, tenantId: user.tenantId },
      select: FEE_SELECT,
    });
    if (!fee) throw new NotFoundException('Fee not found');

    const currentPaid = Number(fee.paidAmount);
    const currentTotal = Number(fee.totalAmount);
    const dueAmount = currentTotal - currentPaid;

    // Validate payment amount
    if (dto.amount > dueAmount) {
      throw new BadRequestException(
        `Payment amount ₹${dto.amount} exceeds outstanding balance ₹${dueAmount}`,
      );
    }

    // Razorpay requires amount in paise (smallest currency unit)
    const amountInPaise = Math.round(dto.amount * 100);
    if (amountInPaise < 100) {
      throw new BadRequestException('Minimum payment amount is ₹1');
    }

    try {
      // Razorpay receipt max length is 40 characters
      // Using short format: fee_<first8chars>_<timestamp>
      const shortFeeId = feeId.substring(0, 8);
      const receipt = `fee_${shortFeeId}_${Date.now()}`;
      
      const order = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt, // Max 40 chars: fee_<8>_<13> = 26 chars
        notes: {
          feeId, // Full UUID stored here for reference
          matterId,
          tenantId: user.tenantId,
          userId: user.id,
        },
      });

      return {
        order_id: order.id,
        amount: dto.amount,
        currency: 'INR',
        key_id: this.config.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (error) {
      // Log full error for debugging
      console.error('Razorpay order creation error:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Razorpay errors might have nested structure
        errorMessage = JSON.stringify(error);
      }
      
      throw new BadRequestException(
        `Failed to create Razorpay order: ${errorMessage}`,
      );
    }
  }

  async verifyRazorpayPayment(
    matterId: string,
    feeId: string,
    dto: VerifyRazorpayPaymentDto,
    user: AuthenticatedUser,
  ) {
    await this.assertMatterAccess(matterId, user);

    const fee = await this.prisma.fee.findFirst({
      where: { id: feeId, matterId, tenantId: user.tenantId },
      select: FEE_SELECT,
    });
    if (!fee) throw new NotFoundException('Fee not found');

    // Verify signature
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') || '';
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== dto.razorpay_signature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Payment verified! Now record it
    const currentPaid = Number(fee.paidAmount);
    const currentTotal = Number(fee.totalAmount);
    const newPaid = currentPaid + dto.amount;

    if (newPaid > currentTotal) {
      throw new BadRequestException('Payment exceeds outstanding balance');
    }

    const history = (fee.paymentHistory as unknown as PaymentRecord[]) ?? [];
    const newRecord: PaymentRecord = {
      amount: dto.amount,
      paidAt: new Date().toISOString(),
      note: `Online payment via Razorpay (Payment ID: ${dto.razorpay_payment_id})`,
      razorpay_order_id: dto.razorpay_order_id,
      razorpay_payment_id: dto.razorpay_payment_id,
    };

    const updated = await this.prisma.fee.update({
      where: { id: feeId, tenantId: user.tenantId },
      data: {
        paidAmount: newPaid,
        paymentHistory: [...history, newRecord] as object[],
      },
      select: FEE_SELECT,
    });

    // Send notifications
    const remaining = currentTotal - newPaid;
    const msg = remaining > 0
      ? `Payment of ₹${dto.amount.toLocaleString('en-IN')} received successfully. Outstanding balance: ₹${remaining.toLocaleString('en-IN')}.`
      : `Payment of ₹${dto.amount.toLocaleString('en-IN')} received successfully. Your balance is now cleared. Thank you!`;
    
    void this.notifications.notifyParticipant(matterId, user.tenantId, msg);

    // Send email confirmation to client
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { 
        title: true, 
        participant: { 
          select: { name: true, email: true } 
        } 
      },
    });

    if (matter?.participant?.email) {
      void this.email.sendPaymentConfirmation(
        matter.participant.email,
        matter.participant.name,
        dto.amount,
        remaining,
        matter.title,
        dto.razorpay_payment_id,
      ).catch(err => {
        // Log but don't fail the payment if email fails
        console.error('Failed to send payment confirmation email:', err);
      });
    }

    // TODO: Send WhatsApp notification (requires approved template)

    return {
      success: true,
      payment: toFeeDto(updated),
      message: msg,
    };
  }
}
