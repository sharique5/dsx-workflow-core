import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/utils/api';
import type { BrandConfig } from '../../../app/brand.context';

interface UpdateBrandingPayload {
  firmName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}

export function usePatchBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBrandingPayload) =>
      api.patch<BrandConfig>('/tenant/brand', payload).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant-brand'], data);
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post<BrandConfig>('/tenant/brand/logo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant-brand'], data);
    },
  });
}
