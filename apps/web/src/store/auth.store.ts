import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDto, IndustryConfig } from '@dsx/shared';
import { DEFAULT_LEGAL_VOCABULARY } from '@dsx/shared';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  vocabulary: IndustryConfig;
  isAuthenticated: boolean;
  setUser: (user: UserDto, accessToken: string, vocabulary?: IndustryConfig) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      vocabulary: DEFAULT_LEGAL_VOCABULARY,
      isAuthenticated: false,

      setUser: (user, accessToken, vocabulary) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          vocabulary: vocabulary ?? DEFAULT_LEGAL_VOCABULARY,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          vocabulary: DEFAULT_LEGAL_VOCABULARY,
        }),
    }),
    { name: 'dsx-auth' },
  ),
);
