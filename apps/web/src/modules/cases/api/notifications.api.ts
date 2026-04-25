import { api } from '../../../shared/utils/api';
import type {
  NotificationTemplateDto,
  NotificationLogDto,
  SendNotificationDto,
  ReminderDto,
  CreateReminderDto,
} from '@dsx/shared';

export const notificationsApi = {
  listTemplates: () =>
    api.get<NotificationTemplateDto[]>('/notifications/templates'),

  send: (data: SendNotificationDto) =>
    api.post<{ id: string; status: string }>('/notifications/send', data),

  listLogs: (matterId?: string) =>
    api.get<NotificationLogDto[]>('/notifications/logs', {
      params: matterId ? { matterId } : {},
    }),

  listReminders: (matterId: string) =>
    api.get<ReminderDto[]>(`/notifications/reminders/${matterId}`),

  createReminder: (matterId: string, data: CreateReminderDto) =>
    api.post<ReminderDto>(`/notifications/reminders/${matterId}`, data),

  deleteReminder: (matterId: string, reminderId: string) =>
    api.delete(`/notifications/reminders/${matterId}/${reminderId}`),
};
