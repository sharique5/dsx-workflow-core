import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import type { SendNotificationDto, CreateReminderDto } from '@dsx/shared';

export const notificationLogsKey = (matterId?: string) =>
  matterId ? ['notifications', 'logs', matterId] : ['notifications', 'logs'];

export const remindersKey = (matterId: string) =>
  ['notifications', 'reminders', matterId] as const;

export const templatesKey = ['notifications', 'templates'] as const;

export function useNotificationTemplates() {
  return useQuery({
    queryKey: templatesKey,
    queryFn: () => notificationsApi.listTemplates().then((r) => r.data),
  });
}

export function useNotificationLogs(matterId?: string) {
  return useQuery({
    queryKey: notificationLogsKey(matterId),
    queryFn: () => notificationsApi.listLogs(matterId).then((r) => r.data),
  });
}

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendNotificationDto) =>
      notificationsApi.send(data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: notificationLogsKey(variables.matterId) });
    },
  });
}

export function useReminders(matterId: string) {
  return useQuery({
    queryKey: remindersKey(matterId),
    queryFn: () => notificationsApi.listReminders(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function useCreateReminder(matterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReminderDto) =>
      notificationsApi.createReminder(matterId, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(matterId) });
    },
  });
}

export function useDeleteReminder(matterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reminderId: string) =>
      notificationsApi.deleteReminder(matterId, reminderId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(matterId) });
    },
  });
}
