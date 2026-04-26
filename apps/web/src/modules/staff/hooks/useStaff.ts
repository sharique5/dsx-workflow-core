import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { staffApi } from '../api/staff.api';
import type { CreateStaffDto } from '@dsx/shared';

const STAFF_KEY = ['staff'] as const;

export function useStaff() {
  return useQuery({
    queryKey: STAFF_KEY,
    queryFn: () => staffApi.list().then((r) => r.data),
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStaffDto) => staffApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      toast.success('Staff member added');
    },
    onError: () => toast.error('Failed to add staff member'),
  });
}

export function useDeactivateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffApi.deactivate(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      toast.success('Staff member deactivated');
    },
    onError: () => toast.error('Failed to deactivate staff member'),
  });
}

export function useReactivateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => staffApi.reactivate(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      toast.success('Staff member reactivated');
    },
    onError: () => toast.error('Failed to reactivate staff member'),
  });
}
