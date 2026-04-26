import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { mattersApi } from '../api/matters.api';
import type { CreateMatterDto, UpdateMatterDto, PaginatedResponse, MatterDto, DashboardStatsDto } from '@dsx/shared';

export const MATTERS_KEY = ['matters'] as const;
export const matterKey = (id: string) => ['matters', id] as const;
export const mattersPageKey = (page: number, limit: number) =>
  ['matters', 'page', page, limit] as const;

export function useDashboardStats() {
  return useQuery<DashboardStatsDto>({
    queryKey: ['matters', 'dashboard-stats'],
    queryFn: () => mattersApi.getDashboardStats().then((r) => r.data),
    staleTime: 60_000, // 1 min
  });
}

export function useMatters(page = 1, limit = 50) {
  return useQuery<PaginatedResponse<MatterDto>>({
    queryKey: mattersPageKey(page, limit),
    queryFn: () => mattersApi.list({ page, limit }).then((r) => r.data),
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
      toast.success('Case created');
      navigate(`/cases/${matter.id}`);
    },
    onError: () => toast.error('Failed to create case'),
  });
}

export function useUpdateMatter(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMatterDto) => mattersApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matterKey(id) });
      queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
      toast.success('Case updated');
    },
    onError: () => toast.error('Failed to update case'),
  });
}

export function useCloseMatter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mattersApi.close(id).then((r) => r.data),
    onSuccess: (matter) => {
      queryClient.invalidateQueries({ queryKey: matterKey(matter.id) });
      queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
      toast.success('Case closed');
    },
    onError: () => toast.error('Failed to close case'),
  });
}

export function useDeleteMatter() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => mattersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATTERS_KEY });
      toast.success('Case deleted');
      navigate('/cases');
    },
    onError: () => toast.error('Failed to delete case'),
  });
}
