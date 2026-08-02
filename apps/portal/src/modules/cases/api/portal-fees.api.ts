import { api } from '../../../shared/utils/api';
import type { FeeDto } from '@dsx/shared';

interface CreateRazorpayOrderRequest {
  amount: number;
}

interface CreateRazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

interface VerifyRazorpayPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount: number;
}

interface VerifyRazorpayPaymentResponse {
  success: boolean;
  payment: FeeDto;
  message: string;
}

export const portalFeesApi = {
  list: (matterId: string) => api.get<FeeDto[]>(`/matters/${matterId}/fees`),
  
  createRazorpayOrder: (matterId: string, feeId: string, data: CreateRazorpayOrderRequest) =>
    api.post<CreateRazorpayOrderResponse>(`/matters/${matterId}/fees/${feeId}/razorpay/create-order`, data),
  
  verifyRazorpayPayment: (matterId: string, feeId: string, data: VerifyRazorpayPaymentRequest) =>
    api.post<VerifyRazorpayPaymentResponse>(`/matters/${matterId}/fees/${feeId}/razorpay/verify-payment`, data),
};
