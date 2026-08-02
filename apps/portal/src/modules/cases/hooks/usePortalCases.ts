import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { portalCasesApi } from '../api/portal-cases.api';
import { portalDocumentRequestsApi } from '../api/portal-document-requests.api';
import { portalFeesApi } from '../api/portal-fees.api';
import { portalDocumentsApi } from '../api/portal-documents.api';
import { portalMessagesApi } from '../api/portal-messages.api';
import type { CreateMessageDto } from '@dsx/shared';

// Razorpay types
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export const PORTAL_MATTERS_KEY = ['portal', 'matters'] as const;
export const portalMatterKey = (id: string) => ['portal', 'matters', id] as const;
export const portalMatterEventsKey = (id: string) =>
  ['portal', 'matters', id, 'events'] as const;
export const portalMatterNotesKey = (id: string) =>
  ['portal', 'matters', id, 'notes'] as const;
export const portalMatterDRKey = (id: string) =>
  ['portal', 'matters', id, 'document-requests'] as const;
export const portalMatterFeesKey = (id: string) =>
  ['portal', 'matters', id, 'fees'] as const;
export const portalMatterDocsKey = (id: string) =>
  ['portal', 'matters', id, 'documents'] as const;

export const portalNextHearingKey = ['portal', 'next-hearing'] as const;

export function usePortalNextHearing() {
  return useQuery({
    queryKey: portalNextHearingKey,
    queryFn: () => portalCasesApi.getNextHearing().then((r) => r.data),
    staleTime: 60_000,
  });
}

export function usePortalCases() {
  return useQuery({
    queryKey: PORTAL_MATTERS_KEY,
    queryFn: () => portalCasesApi.list().then((r) => r.data.data),
  });
}

export function usePortalCase(id: string) {
  return useQuery({
    queryKey: portalMatterKey(id),
    queryFn: () => portalCasesApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function usePortalCaseEvents(matterId: string) {
  return useQuery({
    queryKey: portalMatterEventsKey(matterId),
    queryFn: () => portalCasesApi.getEvents(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseNotes(matterId: string) {
  return useQuery({
    queryKey: portalMatterNotesKey(matterId),
    queryFn: () => portalCasesApi.getNotes(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseDocumentRequests(matterId: string) {
  return useQuery({
    queryKey: portalMatterDRKey(matterId),
    queryFn: () => portalDocumentRequestsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseFees(matterId: string) {
  return useQuery({
    queryKey: portalMatterFeesKey(matterId),
    queryFn: () => portalFeesApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalCaseDocuments(matterId: string) {
  return useQuery({
    queryKey: portalMatterDocsKey(matterId),
    queryFn: () => portalDocumentsApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
  });
}

export function usePortalDocumentDownloadUrl(matterId: string) {
  return useMutation({
    mutationFn: (docId: string) =>
      portalDocumentsApi
        .getDownloadUrl(matterId, docId)
        .then((r) => r.data.downloadUrl),
    onSuccess: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Download started', { description: 'Your file is opening in a new tab.' });
    },
    onError: () => {
      toast.error('Download failed', { description: 'Could not get the download link. Please try again.' });
    },
  });
}

export function usePortalUploadDocumentRequest(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, drId }: { file: File; drId: string }) =>
      portalDocumentRequestsApi.upload(matterId, drId, file).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalMatterDRKey(matterId) });
      toast.success('Document uploaded successfully');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Upload failed');
    },
  });
}

export function usePortalDocumentRequestDownloadUrl(matterId: string, drId: string) {
  return useMutation({
    mutationFn: () =>
      portalDocumentRequestsApi.getDownloadUrl(matterId, drId).then((r) => r.data),
    onError: () => toast.error('Could not get download link'),
  });
}

const portalMatterMessagesKey = (id: string) =>
  ['portal', 'matters', id, 'messages'] as const;
const portalMatterMessagesUnreadKey = (id: string) =>
  ['portal', 'matters', id, 'messages', 'unread'] as const;

export function usePortalMessages(matterId: string) {
  return useQuery({
    queryKey: portalMatterMessagesKey(matterId),
    queryFn: () => portalMessagesApi.list(matterId).then((r) => r.data),
    enabled: !!matterId,
    refetchInterval: 5000,
  });
}

export function usePortalMessagesUnreadCount(matterId: string) {
  return useQuery({
    queryKey: portalMatterMessagesUnreadKey(matterId),
    queryFn: () => portalMessagesApi.unreadCount(matterId).then((r) => r.data),
    enabled: !!matterId,
    refetchInterval: 5000,
  });
}

export function usePortalSendMessage(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMessageDto) =>
      portalMessagesApi.create(matterId, data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalMatterMessagesKey(matterId) });
    },
    onError: () => toast.error('Failed to send message'),
  });
}

export function usePortalMarkMessagesRead(matterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => portalMessagesApi.markRead(matterId).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalMatterMessagesUnreadKey(matterId) });
    },
  });
}

export function useRazorpayPayment(matterId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ feeId, amount }: { feeId: string; amount: number }) => {
      // Step 1: Create Razorpay order
      const orderResponse = await portalFeesApi.createRazorpayOrder(matterId, feeId, { amount });
      const { order_id, amount: orderAmount, currency, key_id } = orderResponse.data;

      // Step 2: Open Razorpay checkout
      return new Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>((resolve, reject) => {
        const options = {
          key: key_id,
          amount: orderAmount * 100, // Razorpay expects paise
          currency,
          order_id,
          name: 'Fee Payment',
          description: `Payment for case fee`,
          handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            resolve(response);
          },
          modal: {
            ondismiss: () => {
              reject(new Error('Payment cancelled by user'));
            },
          },
          theme: {
            color: '#1a4f9d',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }).then(async (paymentResponse) => {
        // Step 3: Verify payment on backend
        const verifyResponse = await portalFeesApi.verifyRazorpayPayment(matterId, feeId, {
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          amount,
        });
        return verifyResponse.data;
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: portalMatterFeesKey(matterId) });
      toast.success('Payment successful!', { description: data.message });
    },
    onError: (error: Error, variables) => {
      // Notify backend about the failure (unless user cancelled)
      if (error.message !== 'Payment cancelled by user') {
        void portalFeesApi.notifyPaymentFailure(matterId, variables.feeId, {
          amount: variables.amount,
          reason: error.message || 'Payment failed',
        }).catch(() => {
          // Silent fail - notification is best effort
        });
      }

      // Show user-facing error
      if (error.message === 'Payment cancelled by user') {
        toast.info('Payment cancelled');
      } else {
        toast.error('Payment failed', { description: error.message || 'Please try again' });
      }
    },
  });
}
