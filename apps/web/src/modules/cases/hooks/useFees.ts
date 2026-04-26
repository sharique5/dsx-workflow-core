import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feesApi } from '../api/fees.api';
import type { CreateFeeDto, LogPaymentDto } from '@dsx/shared';

const feesKey = (matterId: string) => ['matters', matterId, 'fees'] as const;

export function useFees(matterId: string) {
  return useQuery({
    queryKey: feesKey(matterId),
    queryFn: () => feesApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function useCreateFee(matterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeeDto) => feesApi.create(matterId, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: feesKey(matterId) });
      toast.success('Fee added');
    },
    onError: () => toast.error('Failed to add fee'),
  });
}

export function useLogPayment(matterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ feeId, data }: { feeId: string; data: LogPaymentDto }) =>
      feesApi.logPayment(matterId, feeId, data).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: feesKey(matterId) });
      toast.success('Payment logged');
    },
    onError: () => toast.error('Failed to log payment'),
  });
}
