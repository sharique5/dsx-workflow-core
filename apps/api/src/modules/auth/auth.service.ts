import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/database/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { EmailService } from '../../shared/email/email.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import crypto from 'crypto';

const OTP_PREFIX = 'otp:';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private email: EmailService,
    private jwt: JwtService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ message: string }> {
    const identifier = dto.identifier.trim().toLowerCase();

    // Resolve user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      // Return generic message to prevent user enumeration
      return { message: 'If your account exists, a code has been sent.' };
    }

    const otp = this.generateOtp();
    const expirySeconds = parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10) * 60;

    await this.redis.set(`${OTP_PREFIX}${identifier}`, otp, expirySeconds);

    // Send via email if identifier looks like an email
    if (identifier.includes('@')) {
      await this.email.sendOtp(identifier, otp);
    }
    // WhatsApp / SMS — placeholder for now
    // else { await this.whatsapp.sendOtp(identifier, otp); }

    return { message: 'If your account exists, a code has been sent.' };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<{ accessToken: string; user: Omit<AuthenticatedUser, 'role'> & { role: string } }> {
    const identifier = dto.identifier.trim().toLowerCase();
    const storedOtp = await this.redis.get(`${OTP_PREFIX}${identifier}`);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    // Constant-time comparison to prevent timing attacks
    const otpBuffer = Buffer.from(dto.otp);
    const storedBuffer = Buffer.from(storedOtp);
    const isMatch =
      otpBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(otpBuffer, storedBuffer);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Consume OTP — single use
    await this.redis.del(`${OTP_PREFIX}${identifier}`);

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [{ email: identifier }, { phone: identifier }],
      },
      include: { tenant: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const payload: AuthenticatedUser = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
    };

    const accessToken = this.jwt.sign(payload);

    return {
      accessToken,
      user: payload,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account is inactive');
    }

    return user;
  }

  private generateOtp(): string {
    // 6-digit cryptographically random OTP
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0) % 1_000_000;
    return num.toString().padStart(6, '0');
  }
}
