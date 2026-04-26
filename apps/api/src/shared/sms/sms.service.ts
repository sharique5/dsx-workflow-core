import { Injectable, Logger } from '@nestjs/common';

/**
 * Provider-agnostic SMS/WhatsApp OTP service.
 *
 * Configure via env vars:
 *   SMS_PROVIDER=msg91        → MSG91 (recommended for India; SMS + WhatsApp)
 *   SMS_PROVIDER=twofactor    → 2Factor.in (simpler, SMS only)
 *   (unset)                   → Dev mode: logs OTP to console
 *
 * MSG91 env vars:
 *   MSG91_AUTH_KEY            → Auth key from MSG91 dashboard
 *   MSG91_OTP_TEMPLATE_ID     → Approved DLT template ID
 *
 * 2Factor env vars:
 *   TWOFACTOR_API_KEY         → API key from 2factor.in dashboard
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phone: string, otp: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER;

    if (!provider) {
      // Development fallback — never fires real SMS
      this.logger.warn(`[DEV] SMS OTP for ${phone}: ${otp}`);
      return;
    }

    if (provider === 'msg91') {
      await this.sendViaMSG91(phone, otp);
    } else if (provider === 'twofactor') {
      await this.sendViaTwoFactor(phone, otp);
    } else {
      this.logger.error(`Unknown SMS_PROVIDER: ${provider}`);
      throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }

  /**
   * MSG91 Transactional OTP API v5
   * Docs: https://msg91.com/help/MSG91/how-to-send-otp-using-msg91
   */
  private async sendViaMSG91(phone: string, otp: string): Promise<void> {
    const authKey = process.env.MSG91_AUTH_KEY ?? '';
    const templateId = process.env.MSG91_OTP_TEMPLATE_ID ?? '';

    // MSG91 expects mobile without leading +
    const mobile = phone.startsWith('+') ? phone.slice(1) : phone;

    const res = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify({ template_id: templateId, mobile, otp }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`MSG91 OTP failed for ${mobile}: ${body}`);
      throw new Error('Failed to send SMS OTP via MSG91');
    }
  }

  /**
   * 2Factor.in OTP API
   * Docs: https://2factor.in/API/V1/{API_KEY}/SMS/{PHONE_NUMBER}/{OTP}
   */
  private async sendViaTwoFactor(phone: string, otp: string): Promise<void> {
    const apiKey = process.env.TWOFACTOR_API_KEY ?? '';
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${encodeURIComponent(phone)}/${otp}`;

    const res = await fetch(url);
    if (!res.ok) {
      this.logger.error(`2Factor OTP failed for ${phone}: HTTP ${res.status}`);
      throw new Error('Failed to send SMS OTP via 2Factor');
    }
  }
}
