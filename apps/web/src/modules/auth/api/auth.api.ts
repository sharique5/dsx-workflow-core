import { api } from '../../../shared/utils/api';
import type { AuthResponse, RequestOtpDto, VerifyOtpDto } from '@dsx/shared';

export const authApi = {
  requestOtp: (data: RequestOtpDto) =>
    api.post<{ message: string }>('/auth/request-otp', data),

  verifyOtp: (data: VerifyOtpDto) =>
    api.post<AuthResponse>('/auth/verify-otp', data),

  logout: () =>
    api.post<{ message: string }>('/auth/logout'),

  getMe: () =>
    api.get<AuthResponse['user']>('/auth/me'),
};
