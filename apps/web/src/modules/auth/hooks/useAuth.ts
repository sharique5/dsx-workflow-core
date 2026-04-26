import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../../../store/auth.store';

export function useRequestOtp() {
  return useMutation({
    mutationFn: authApi.requestOtp,
  });
}

export function useVerifyOtp() {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: ({ data }) => {
      setUser(data.user);
      navigate('/dashboard');
    },
  });
}

export function useLoginWithPassword() {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.loginWithPassword,
    onSuccess: ({ data }) => {
      setUser(data.user);
      navigate('/dashboard');
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (newPassword: string) => authApi.setPassword(newPassword),
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearAuth();
      navigate('/login');
    },
  });
}
