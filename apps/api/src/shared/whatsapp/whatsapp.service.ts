import { Injectable, Logger } from '@nestjs/common';

/**
 * WhatsApp OTP via Bird.com (new MessageBird) Channels API.
 *
 * Env vars required:
 *   MESSAGEBIRD_API_KEY                — Bird.com access key (Settings → Access keys)
 *   MESSAGEBIRD_WHATSAPP_CHANNEL_ID    — WhatsApp channel ID (Channels → WhatsApp → channel id)
 *   BIRD_WORKSPACE_ID                  — Workspace ID (Settings → Workspace)
 *   BIRD_OTP_TEMPLATE_PROJECT_ID       — Template project ID (Messaging → Templates → project id)
 *   BIRD_OTP_TEMPLATE_VERSION          — Template version ID (Messaging → Templates → version id)
 *
 * API reference:
 *   https://docs.bird.com/api/channels-api/send-messages/whatsapp
 *
 * Template must have a single variable named "otp".
 * Example template body: "Your login code is {{otp}}. Valid for 10 minutes."
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

  private get workspaceId(): string {
    return process.env.BIRD_WORKSPACE_ID ?? '';
  }

  private get templateProjectId(): string {
    return process.env.BIRD_OTP_TEMPLATE_PROJECT_ID ?? '';
  }

  private get templateVersion(): string {
    return process.env.BIRD_OTP_TEMPLATE_VERSION ?? '';
  }

  private get isConfigured(): boolean {
    return !!(
      this.apiKey &&
      this.channelId &&
      this.workspaceId &&
      this.templateProjectId &&
      this.templateVersion
    );
  }

  /**
   * Send a login OTP via WhatsApp using Bird.com Channels API.
   * Used by SmsService when SMS_PROVIDER=messagebird_whatsapp.
   *
   * @param to  Phone number in E.164 format (e.g. +919876543210)
   * @param otp 6-digit OTP string
   */
  async sendOtp(to: string, otp: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`[DEV] WhatsApp OTP → ${to}: ${otp}`);
      return;
    }

    const url = `https://api.bird.com/workspaces/${this.workspaceId}/channels/${this.channelId}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `AccessKey ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: {
          contacts: [{ identifierValue: to }],
        },
        template: {
          projectId: this.templateProjectId,
          version: this.templateVersion,
          locale: 'en',
          variables: { otp },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Bird.com WhatsApp OTP failed for ${to}: ${body}`);
      throw new Error('Failed to send WhatsApp OTP');
    }

    this.logger.log(`WhatsApp OTP sent to ${to}`);
  }
}
