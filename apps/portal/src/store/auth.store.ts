import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PortalUser {
  id: string;
  name: string;
  role: string;
  tenantId: string;
}

interface PortalAuthState {
  user: PortalUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: PortalUser, accessToken: string) => void;
  clearAuth: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setUser: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'dsx-portal-auth' },
  ),
);
