import { api } from '../../../shared/utils/api';
import type { AuthResponse, RequestOtpDto, VerifyOtpDto } from '@dsx/shared';

export interface LoginPasswordData {
  email: string;
  password: string;
}

export const authApi = {
  requestOtp: (data: RequestOtpDto) =>
    api.post<{ message: string }>('/auth/request-otp', data),

  verifyOtp: (data: VerifyOtpDto) =>
    api.post<AuthResponse>('/auth/verify-otp', data),

  loginWithPassword: (data: LoginPasswordData) =>
    api.post<AuthResponse>('/auth/login-password', data),

  setPassword: (newPassword: string) =>
    api.patch<void>('/auth/me/password', { newPassword }),

  clearPassword: () =>
    api.patch<void>('/auth/me/password/clear', {}),

  logout: () =>
    api.post<{ message: string }>('/auth/logout'),

  getMe: () =>
    api.get<AuthResponse['user']>('/auth/me'),
};
