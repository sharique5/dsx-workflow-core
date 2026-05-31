import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientsApi } from '../api/clients.api';
import type { CreateClientDto, UpdateClientDto } from '@dsx/shared';
import { MATTERS_KEY } from '../../cases/hooks/useMatters';

export const CLIENTS_KEY = ['clients'] as const;
export const clientKey = (id: string) => ['clients', id] as const;

export function useClients() {
  return useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: () => clientsApi.list().then((r) => r.data),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKey(id),
    queryFn: () => clientsApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientDto) => clientsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      toast.success('Client created');
    },
    onError: () => toast.error('Failed to create client'),
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateClientDto) => clientsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      void queryClient.invalidateQueries({ queryKey: clientKey(id) });
      toast.success('Client updated');
    },
    onError: () => toast.error('Failed to update client'),
  });
}

export function useInviteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.invite(id).then((r) => r.data),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_KEY });
      void queryClient.invalidateQueries({ queryKey: clientKey(updated.id) });
      void queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
      toast.success('Invite sent');
    },
    onError: () => toast.error('Failed to send invite'),
  });
}
