import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { messagesApi } from '../api/messages.api';
import type { CreateMessageDto } from '@dsx/shared';

const messagesKey = (matterId: string) => ['matters', matterId, 'messages'] as const;
const unreadKey = (matterId: string) => ['matters', matterId, 'messages', 'unread'] as const;

export function useMessages(matterId: string) {
  return useQuery({
    queryKey: messagesKey(matterId),
    queryFn: () => messagesApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
    refetchInterval: 5000,
  });
}

export function useMessagesUnreadCount(matterId: string) {
  return useQuery({
    queryKey: unreadKey(matterId),
    queryFn: () => messagesApi.unreadCount(matterId).then((r) => r.data),
    enabled: !!matterId,
    refetchInterval: 5000,
  });
}

export function useSendMessage(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMessageDto) =>
      messagesApi.create(matterId, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey(matterId) });
    },
    onError: () => toast.error('Failed to send message'),
  });
}

export function useMarkMessagesRead(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => messagesApi.markRead(matterId).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unreadKey(matterId) });
    },
  });
}
