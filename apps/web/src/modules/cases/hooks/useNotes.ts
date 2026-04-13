import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../api/notes.api';
import type { CreateNoteDto, UpdateNoteDto } from '@dsx/shared';

const notesKey = (matterId: string) => ['matters', matterId, 'notes'] as const;

export function useNotes(matterId: string) {
  return useQuery({
    queryKey: notesKey(matterId),
    queryFn: () => notesApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function useCreateNote(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNoteDto) =>
      notesApi.create(matterId, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKey(matterId) });
    },
  });
}

export function useUpdateNote(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteDto }) =>
      notesApi.update(matterId, id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKey(matterId) });
    },
  });
}

export function useDeleteNote(matterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.remove(matterId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKey(matterId) });
    },
  });
}
