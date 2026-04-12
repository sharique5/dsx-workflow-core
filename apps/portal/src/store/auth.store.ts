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
  isAuthenticated: boolean;
  setUser: (user: PortalUser) => void;
  clearAuth: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'dsx-portal-auth' },
  ),
);
