import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { EmailService } from '../../shared/email/email.service';
import type { AuthenticatedUser } from '../../shared/decorators/current-user.decorator';
import { SendNotificationDto, CreateReminderDto, NotificationChannelDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ─── Templates ───────────────────────────────────────────────────────────

  /** List system + tenant templates */
  async listTemplates(user: AuthenticatedUser) {
    return this.prisma.notificationTemplate.findMany({
      where: {
        OR: [{ isSystem: true }, { tenantId: user.tenantId }],
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
  }

  // ─── Manual send ─────────────────────────────────────────────────────────

  async send(dto: SendNotificationDto, user: AuthenticatedUser) {
    if (!dto.templateId && !dto.customMessage) {
      throw new BadRequestException('Provide either templateId or customMessage');
    }

    // Resolve recipient
    const recipient = await this.prisma.user.findFirst({
      where: { id: dto.recipientId, tenantId: user.tenantId },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    // Resolve matter
    const matter = await this.prisma.matter.findFirst({
      where: { id: dto.matterId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, title: true, internalRef: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    // Resolve template body
    let body: string;
    const templateId: string | undefined = dto.templateId;

    if (dto.templateId) {
      const tpl = await this.prisma.notificationTemplate.findFirst({
        where: {
          id: dto.templateId,
          OR: [{ isSystem: true }, { tenantId: user.tenantId }],
        },
      });
      if (!tpl) throw new NotFoundException('Template not found');
      body = this.interpolate(tpl.templateBody, { recipient, matter });
    } else {
      body = dto.customMessage!;
    }

    // Create log entry as pending
    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId: user.tenantId,
        matterId: dto.matterId,
        recipientId: dto.recipientId,
        channel: dto.channel,
        templateId: templateId ?? null,
        customMessage: dto.customMessage ?? null,
        status: 'pending',
      },
    });

    // Send via channel
    try {
      if (dto.channel === NotificationChannelDto.email) {
        if (!recipient.email) {
          throw new BadRequestException('Recipient has no email address');
        }
        await this.email.sendCaseNotification(recipient.email, recipient.name, body, matter.title);
      } else if (dto.channel === NotificationChannelDto.whatsapp) {
        // WhatsApp Business API requires pre-approved templates for each message type.
        // Case notifications fall back to email until per-type templates are registered.
        const emailTarget = recipient.email;
        if (!emailTarget) {
          throw new BadRequestException('Recipient has no email address for WhatsApp fallback notification');
        }
        await this.email.sendCaseNotification(emailTarget, recipient.name, body, matter.title);
      }

      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'sent', sentAt: new Date() },
      });
    } catch (err) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'failed' },
      });
      this.logger.error(`Notification failed: ${String(err)}`);
      throw err;
    }

    return { id: log.id, status: 'sent' };
  }

  // ─── Notification logs ───────────────────────────────────────────────────

  async listLogs(user: AuthenticatedUser, matterId?: string) {
    return this.prisma.notificationLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(matterId ? { matterId } : {}),
      },
      include: {
        recipient: { select: { id: true, name: true, email: true } },
        template: { select: { id: true, triggerType: true, channel: true } },
        matter: { select: { id: true, internalRef: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── Reminders ───────────────────────────────────────────────────────────

  async listReminders(matterId: string, user: AuthenticatedUser) {
    return this.prisma.reminder.findMany({
      where: { matterId, tenantId: user.tenantId },
      include: {
        scheduledEvent: { select: { id: true, scheduledAt: true } },
      },
      orderBy: { remindAt: 'asc' },
    });
  }

  async createReminder(matterId: string, dto: CreateReminderDto, user: AuthenticatedUser) {
    // Verify scheduled event belongs to this tenant + matter
    const event = await this.prisma.scheduledEvent.findFirst({
      where: {
        id: dto.scheduledEventId,
        matterId,
        tenantId: user.tenantId,
      },
    });
    if (!event) throw new NotFoundException('Scheduled event not found');

    return this.prisma.reminder.create({
      data: {
        tenantId: user.tenantId,
        matterId,
        scheduledEventId: dto.scheduledEventId,
        remindAt: new Date(dto.remindAt),
        message: dto.message,
      },
    });
  }

  async deleteReminder(reminderId: string, user: AuthenticatedUser) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id: reminderId, tenantId: user.tenantId },
    });
    if (!reminder) throw new NotFoundException('Reminder not found');
    await this.prisma.reminder.delete({ where: { id: reminderId } });
  }

  // ─── Cron: process due reminders ─────────────────────────────────────────

  async processDueReminders() {
    const due = await this.prisma.reminder.findMany({
      where: { isSent: false, remindAt: { lte: new Date() } },
      include: {
        matter: { select: { id: true, title: true, internalRef: true } },
        scheduledEvent: { select: { scheduledAt: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Processing ${due.length} due reminder(s)`);

    for (const reminder of due) {
      try {
        // Find the participant (client) for the matter
        const matter = await this.prisma.matter.findUnique({
          where: { id: reminder.matterId },
          include: {
            participant: { select: { id: true, name: true, email: true, phone: true } },
          },
        });

        if (matter?.participant) {
          const participant = matter.participant;
          const hearingDate = reminder.scheduledEvent.scheduledAt.toLocaleDateString(
            'en-IN',
            { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' },
          );
          const body = `Your hearing for case "${matter.title}" (${matter.internalRef}) is scheduled on ${hearingDate}. Please be prepared.`;

          // Send email if available
          if (participant.email) {
            await this.email.sendCaseNotification(
              participant.email,
              participant.name,
              body,
              matter.title,
            );
            await this.prisma.notificationLog.create({
              data: {
                tenantId: reminder.tenantId,
                matterId: reminder.matterId,
                recipientId: participant.id,
                channel: 'email',
                customMessage: body,
                status: 'sent',
                sentAt: new Date(),
              },
            });
          }

          // Send WhatsApp if phone is available — currently falls back to email
          // (Bird.com WhatsApp requires pre-approved templates per message type)
          if (participant.phone && !participant.email) {
            // phone-only user: log skipped, no email to fall back to
            this.logger.warn(`Reminder for participant ${participant.id}: phone-only, WhatsApp templates not configured`);
          }
        }

        // Mark sent regardless (avoid retry spam if no email)
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { isSent: true },
        });
      } catch (err) {
        this.logger.error(`Failed to process reminder ${reminder.id}: ${String(err)}`);
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private interpolate(
    template: string,
    ctx: {
      recipient: { name: string };
      matter: { title: string; internalRef: string };
    },
  ): string {
    return template
      .replace(/\{\{recipient_name\}\}/g, ctx.recipient.name)
      .replace(/\{\{matter_title\}\}/g, ctx.matter.title)
      .replace(/\{\{matter_ref\}\}/g, ctx.matter.internalRef);
  }

  /**
   * Fire-and-forget notification to a specific user by id (e.g. lawyer).
   */
  async notifyUser(
    userId: string,
    tenantId: string,
    message: string,
    caseTitle: string,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { name: true, email: true, phone: true },
      });
      if (!user) return;
      if (user.email) {
        await this.email.sendCaseNotification(user.email, user.name, message, caseTitle);
      }
    } catch (err) {
      this.logger.error(`notifyUser failed for user ${userId}: ${String(err)}`);
    }
  }

  /**
   * Fire-and-forget notification to a matter's participant (client).
   * Sends via email and/or WhatsApp depending on what contact info is available.
   * Logs each send. Silently swallows errors to avoid breaking the caller.
   */
  async notifyParticipant(
    matterId: string,
    tenantId: string,
    message: string,
  ): Promise<void> {
    try {
      const matter = await this.prisma.matter.findFirst({
        where: { id: matterId, tenantId, deletedAt: null },
        select: {
          title: true,
          participant: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
      const participant = matter?.participant;
      if (!participant) return;

      if (participant.email) {
        await this.email.sendCaseNotification(
          participant.email,
          participant.name,
          message,
          matter!.title,
        );
        await this.prisma.notificationLog.create({
          data: { tenantId, matterId, recipientId: participant.id, channel: 'email', customMessage: message, status: 'sent', sentAt: new Date() },
        });
      }
    } catch (err) {
      this.logger.error(`notifyParticipant failed for matter ${matterId}: ${String(err)}`);
    }
  }

  // ─── Cron: document request due-date reminders ───────────────────────────

  /**
   * Finds pending document requests whose due date is within the next 2 days
   * and have not yet had a due-date reminder sent. Notifies the matter's client.
   * Called daily by ReminderScheduler.
   */
  async processDueDateReminders(): Promise<void> {
    const now = new Date();
    const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const dueSoon = await this.prisma.documentRequest.findMany({
      where: {
        status: 'pending',
        dueDate: { gte: now, lte: in2Days },
        dueDateReminderSentAt: null,
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            internalRef: true,
            tenantId: true,
            participant: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    this.logger.log(`Due-date reminder: ${dueSoon.length} document request(s) approaching`);

    for (const dr of dueSoon) {
      const { matter } = dr;
      const participant = matter?.participant;
      if (!participant) continue;

      const dueDateStr = dr.dueDate!.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const message = `Reminder: Your lawyer has requested a document "${dr.description}" for case "${matter.title}" (${matter.internalRef}). Please submit it by ${dueDateStr}.`;

      try {
        if (participant.email) {
          await this.email.sendCaseNotification(
            participant.email,
            participant.name,
            message,
            matter.title,
          );
          await this.prisma.notificationLog.create({
            data: {
              tenantId: matter.tenantId,
              matterId: matter.id,
              recipientId: participant.id,
              channel: 'email',
              customMessage: message,
              status: 'sent',
              sentAt: new Date(),
            },
          });
        }

        if (participant.phone && !participant.email) {
          this.logger.warn(`Due-date reminder for DR ${dr.id}: phone-only participant, WhatsApp templates not configured`);
        }

        // Mark as notified so we don't resend
        await this.prisma.documentRequest.update({
          where: { id: dr.id },
          data: { dueDateReminderSentAt: new Date() },
        });
      } catch (err) {
        this.logger.error(`Due-date reminder failed for DR ${dr.id}: ${String(err)}`);
      }
    }
  }
}
