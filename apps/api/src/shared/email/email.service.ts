import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
      this.logger.error(
        `Failed to send OTP email to ${to}: ${JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException('Failed to send login code');
    }
  }

  async sendPortalInvite(
    to: string,
    inviteUrl: string,
    lawyerName: string,
  ): Promise<void> {
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
      this.logger.error(
        `Failed to send portal invite to ${to}: ${JSON.stringify(error)}`,
      );
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
      this.logger.error(
        `Failed to send staff welcome to ${to}: ${JSON.stringify(error)}`,
      );
      // Intentionally not throwing — staff is created regardless of email delivery
    }
  }

  async sendCaseNotification(
    to: string,
    name: string,
    message: string,
    caseTitle: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to,
      subject: `Update on your case: ${caseTitle}`,
      html: `
        <p>Hi ${name},</p>
        <p>${message}</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">
          This is an automated message from your legal team's case management system.
        </p>
      `,
    });

    if (error) {
      this.logger.error(
        `Failed to send case notification to ${to}: ${JSON.stringify(error)}`,
      );
      throw new Error('Failed to send notification email');
    }
  }

  async sendPaymentConfirmation(
    to: string,
    name: string,
    amount: number,
    remainingBalance: number,
    caseTitle: string,
    paymentId: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
      to,
      subject: `Payment Received - ${caseTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Payment Successful!</h2>
          <p>Hi ${name},</p>
          <p>Your payment has been received successfully.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Amount Paid:</strong></td>
                <td style="padding: 8px 0; text-align: right;">₹${amount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Remaining Balance:</strong></td>
                <td style="padding: 8px 0; text-align: right;">₹${remainingBalance.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-top: 1px solid #d1d5db; padding-top: 12px;"><strong>Case:</strong></td>
                <td style="padding: 8px 0; border-top: 1px solid #d1d5db; padding-top: 12px; text-align: right;">${caseTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Transaction ID:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${paymentId}</td>
              </tr>
            </table>
          </div>

          <p style="color: #059669; font-weight: 600;">
            ${remainingBalance === 0 ? '✓ Your balance is now fully cleared. Thank you!' : 'Thank you for your payment!'}
          </p>

          <p style="color:#6b7280;font-size:12px;margin-top:24px;">
            This is an automated receipt from your legal team's case management system. 
            Please retain this email for your records.
          </p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(
        `Failed to send payment confirmation to ${to}: ${JSON.stringify(error)}`,
      );
      // Don't throw - payment was already processed
    }
  }
}
