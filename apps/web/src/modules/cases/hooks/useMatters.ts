import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { mattersApi } from '../api/matters.api';
import type { CreateMatterDto, UpdateMatterDto } from '@dsx/shared';

export const MATTERS_KEY = ['matters'] as const;
export const matterKey = (id: string) => ['matters', id] as const;

export function useMatters() {
  return useQuery({
    queryKey: MATTERS_KEY,
    queryFn: () => mattersApi.list().then((r) => r.data),
  });
}

export function useMatter(id: string) {
  return useQuery({
    queryKey: matterKey(id),
    queryFn: () => mattersApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMatter() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateMatterDto) => mattersApi.create(data).then((r) => r.data),
    onSuccess: (matter) => {
      queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
      navigate(`/cases/${matter.id}`);
    },
  });
}

export function useUpdateMatter(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMatterDto) => mattersApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matterKey(id) });
      queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
    },
  });
}

export function useCloseMatter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mattersApi.close(id).then((r) => r.data),
    onSuccess: (matter) => {
      queryClient.invalidateQueries({ queryKey: matterKey(matter.id) });
      queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
    },
  });
}

export function useDeleteMatter() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => mattersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
      navigate('/cases');
    },
  });
}
