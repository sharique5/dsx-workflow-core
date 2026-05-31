import { api } from '../../../shared/utils/api';
import type { MessageDto, CreateMessageDto, MessagesUnreadCountDto } from '@dsx/shared';

export const messagesApi = {
  list: (matterId: string) =>
    api.get<MessageDto[]>(`/matters/${matterId}/messages`),

  create: (matterId: string, data: CreateMessageDto) =>
    api.post<MessageDto>(`/matters/${matterId}/messages`, data),

  markRead: (matterId: string) =>
    api.patch<{ ok: boolean }>(`/matters/${matterId}/messages/read`, {}),

  unreadCount: (matterId: string) =>
    api.get<MessagesUnreadCountDto>(`/matters/${matterId}/messages/unread`),
};
