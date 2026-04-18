import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendOtp(to: string, otp: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to,
      subject: 'Your DSX Workflow login code',
      html: `
        <p>Your one-time login code is:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>This code expires in ${process.env.OTP_EXPIRY_MINUTES ?? 10} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send OTP email to ${to}: ${JSON.stringify(error)}`);
      throw new InternalServerErrorException('Failed to send login code');
    }
  }

  async sendPortalInvite(to: string, inviteUrl: string, lawyerName: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to,
      subject: `${lawyerName} invited you to view your case`,
      html: `
        <p>You have been invited by <strong>${lawyerName}</strong> to access your case portal.</p>
        <p><a href="${inviteUrl}" style="padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;">View your case</a></p>
        <p>This link expires in 72 hours.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send portal invite to ${to}: ${JSON.stringify(error)}`);
      throw new InternalServerErrorException('Failed to send portal invite');
    }
  }

  async sendStaffWelcome(to: string, name: string): Promise<void> {
    const loginUrl = `${process.env.WEB_APP_URL ?? 'http://localhost:5173'}/login`;

    const { error } = await this.resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to,
      subject: 'You have been added to DSX Workflow',
      html: `
        <p>Hi ${name},</p>
        <p>An admin has added you to the DSX Workflow workspace.</p>
        <p>You can sign in using this email address and a one-time login code:</p>
        <p><a href="${loginUrl}" style="padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 4px;">Sign in to DSX Workflow</a></p>
        <p>If you were not expecting this, please ignore this email.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send staff welcome to ${to}: ${JSON.stringify(error)}`);
      // Intentionally not throwing — staff is created regardless of email delivery
    }
  }
}
