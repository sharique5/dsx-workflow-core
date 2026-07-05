import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send httpOnly cookie automatically
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Domain': window.location.hostname,
  },
});

// Response interceptor — clear auth state and redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
