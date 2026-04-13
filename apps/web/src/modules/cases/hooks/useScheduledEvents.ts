import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduledEventsApi } from '../api/scheduledEvents.api';
import type { CreateScheduledEventDto, UpdateScheduledEventDto } from '@dsx/shared';

const eventsKey = (matterId: string) => ['matters', matterId, 'events'] as const;

export function useScheduledEvents(matterId: string) {
  return useQuery({
    queryKey: eventsKey(matterId),
    queryFn: () => scheduledEventsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function useCreateScheduledEvent(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduledEventDto) =>
      scheduledEventsApi.create(matterId, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKey(matterId) });
    },
  });
}

export function useUpdateScheduledEvent(matterId: string, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateScheduledEventDto) =>
      scheduledEventsApi.update(matterId, id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKey(matterId) });
    },
  });
}

export function useDeleteScheduledEvent(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduledEventsApi.remove(matterId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKey(matterId) });
    },
  });
}
