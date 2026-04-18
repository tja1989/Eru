import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';
import { authService } from '../services/authService';

interface AuthState {
  user: { id: string; name: string; username: string; phone: string; tier: string; currentBalance: number; creatorScore?: number } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: AuthState['user']) => void;
  register: (data: { firebaseUid: string; phone: string; name: string; username: string }) => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      setToken: (token) => { setAuthToken(token); set({ token, isAuthenticated: true }); },
      setUser: (user) => set({ user }),
      register: async (data) => {
        set({ isLoading: true });
        try {
          const result = await authService.register(data);
          set({ user: result.user, isAuthenticated: true, isLoading: false });
        } catch (error) { set({ isLoading: false }); throw error; }
      },
      logout: async () => {
        try { await authService.logout(); } catch {}
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
      reset: () => { setAuthToken(null); set({ user: null, token: null, isAuthenticated: false, isLoading: false }); },
    }),
    {
      name: 'eru-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-attach the token to the axios client after the store is restored
        // from AsyncStorage, otherwise requests go out without Authorization.
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);
