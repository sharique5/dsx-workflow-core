import { api } from '../../../shared/utils/api';

type AuthUser = { id: string; name: string; role: string; tenantId: string };
type AuthResponse = { user: AuthUser; accessToken: string };

export const authApi = {
  requestOtp: (identifier: string) =>
    api.post<{ message: string }>('/auth/request-otp', { identifier }),

  verifyOtp: (identifier: string, otp: string) =>
    api.post<AuthResponse>('/auth/verify-otp', { identifier, otp }),

  acceptInvite: (token: string) =>
    api.post<AuthResponse>('/auth/accept-invite', { token }),

  logout: () => api.post('/auth/logout'),
};
