import { Injectable, Logger } from '@nestjs/common';

const CONVERSATIONS_API = 'https://conversations.messagebird.com/v1/send';

/**
 * WhatsApp messaging via MessageBird Conversations API.
 *
 * Env vars required:
 *   MESSAGEBIRD_API_KEY              — MessageBird access key
 *   MESSAGEBIRD_WHATSAPP_CHANNEL_ID  — WhatsApp channel ID from MessageBird dashboard
 *
 * If either var is unset the service falls back to a console log (dev mode).
 *
 * API reference:
 *   https://developers.messagebird.com/api/conversations/#send-a-conversation-message
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private get apiKey(): string {
    return process.env.MESSAGEBIRD_API_KEY ?? '';
  }

  private get channelId(): string {
    return process.env.MESSAGEBIRD_WHATSAPP_CHANNEL_ID ?? '';
  }

  private get isConfigured(): boolean {
    return !!(this.apiKey && this.channelId);
  }

  /**
   * Send a free-form text message to a WhatsApp number.
   * @param to   Phone number in E.164 format (e.g. +919876543210)
   * @param text Message body — plain text
   */
  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`[DEV] WhatsApp → ${to}: ${text}`);
      return;
    }

    const res = await fetch(CONVERSATIONS_API, {
      method: 'POST',
      headers: {
        Authorization: `AccessKey ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        from: this.channelId,
        type: 'text',
        content: {
          text,
          disableUrlPreview: false,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`MessageBird WhatsApp failed for ${to}: ${body}`);
      throw new Error('Failed to send WhatsApp message');
    }

    this.logger.log(`WhatsApp sent to ${to}`);
  }

  /**
   * Send a login OTP via WhatsApp.
   * Used by SmsService when SMS_PROVIDER=messagebird_whatsapp.
   */
  async sendOtp(to: string, otp: string): Promise<void> {
    const text =
      `Your login code is: *${otp}*\n\n` +
      `This code expires in 10 minutes. Do not share it with anyone.`;
    await this.sendMessage(to, text);
  }
}
