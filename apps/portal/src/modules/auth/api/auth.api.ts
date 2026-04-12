import { api } from '../../../shared/utils/api';

export const authApi = {
  requestOtp: (identifier: string) =>
    api.post<{ message: string }>('/auth/request-otp', { identifier }),

  verifyOtp: (identifier: string, otp: string) =>
    api.post<{ user: { id: string; name: string; role: string; tenantId: string }; accessToken: string }>(
      '/auth/verify-otp',
      { identifier, otp },
    ),

  logout: () => api.post('/auth/logout'),
};
