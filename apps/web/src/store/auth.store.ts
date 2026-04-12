import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDto, IndustryConfig } from '@dsx/shared';
import { DEFAULT_LEGAL_VOCABULARY } from '@dsx/shared';

interface AuthState {
  user: UserDto | null;
  vocabulary: IndustryConfig;
  isAuthenticated: boolean;
  setUser: (user: UserDto, vocabulary?: IndustryConfig) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      vocabulary: DEFAULT_LEGAL_VOCABULARY,
      isAuthenticated: false,

      setUser: (user, vocabulary) =>
        set({
          user,
          isAuthenticated: true,
          vocabulary: vocabulary ?? DEFAULT_LEGAL_VOCABULARY,
        }),

      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          vocabulary: DEFAULT_LEGAL_VOCABULARY,
        }),
    }),
    { name: 'dsx-auth' },
  ),
);
