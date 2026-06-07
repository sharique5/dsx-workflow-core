import { Injectable, Logger } from '@nestjs/common';

/**
 * WhatsApp OTP via Bird.com Channels API.
 *
 * Env vars required:
 *   BIRD_ACCESS_KEY              — Bird.com access key (Settings → Access keys)
 *   BIRD_WORKSPACE_ID            — Workspace ID (Settings → Workspace)
 *   BIRD_WHATSAPP_CHANNEL_ID     — WhatsApp channel ID (Channels → WhatsApp)
 *   BIRD_TEMPLATE_PROJECT_ID     — OTP template project ID (Messaging → Templates)
 *   BIRD_TEMPLATE_VERSION        — OTP template version ID (Messaging → Templates)
 *   BIRD_TEMPLATE_LOCALE         — Template locale, e.g. "en" (default: "en")
 *
 * Template must have a single variable named "otp".
 * Example: "Your login code is {otp}. Valid for 2 minutes. Do not share it."
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private get accessKey(): string {
    return process.env.BIRD_ACCESS_KEY ?? '';
  }

  private get workspaceId(): string {
    return process.env.BIRD_WORKSPACE_ID ?? '';
  }

  private get channelId(): string {
    return process.env.BIRD_WHATSAPP_CHANNEL_ID ?? '';
  }

  private get templateProjectId(): string {
    return process.env.BIRD_TEMPLATE_PROJECT_ID ?? '';
  }

  private get templateVersion(): string {
    return process.env.BIRD_TEMPLATE_VERSION ?? '';
  }

  private get templateLocale(): string {
    return process.env.BIRD_TEMPLATE_LOCALE ?? 'en';
  }

  private get isConfigured(): boolean {
    return !!(
      this.accessKey &&
      this.workspaceId &&
      this.channelId &&
      this.templateProjectId &&
      this.templateVersion
    );
  }

  /**
   * Send a login OTP via WhatsApp using Bird.com Channels API.
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
        Authorization: `AccessKey ${this.accessKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: {
          contacts: [{ identifierValue: to }],
        },
        template: {
          projectId: this.templateProjectId,
          version: this.templateVersion,
          locale: this.templateLocale,
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
