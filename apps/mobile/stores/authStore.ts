import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';
import { authService } from '../services/authService';

interface AuthState {
  user: { id: string; name: string; username: string; phone: string; tier: string; currentBalance: number; avatarUrl?: string | null; lifetimePoints?: number; creatorScore?: number } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  setToken: (token: string) => void;
  setUser: (user: AuthState['user']) => void;
  setOnboardingComplete: (value: boolean) => void;
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
      hasCompletedOnboarding: false,
      setToken: (token) => { setAuthToken(token); set({ token, isAuthenticated: true }); },
      setUser: (user) => set({ user }),
      setOnboardingComplete: (value) => set({ hasCompletedOnboarding: value }),
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
      reset: () => { setAuthToken(null); set({ user: null, token: null, isAuthenticated: false, isLoading: false, hasCompletedOnboarding: false }); },
    }),
    {
      name: 'eru-auth',
      // Bump the version when the persisted shape changes so existing blobs
      // can be migrated instead of silently mismerging.
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      migrate: (persistedState, version) => {
        // v2 added `hasCompletedOnboarding`. Pre-v2 blobs default to false so
        // existing authenticated users are routed through the new onboarding
        // flow once, rather than dropped at a gate with an undefined flag.
        if (version < 2) {
          const s = (persistedState ?? {}) as Partial<AuthState>;
          if (typeof s.hasCompletedOnboarding !== 'boolean') {
            s.hasCompletedOnboarding = false;
          }
          return s;
        }
        return persistedState as Partial<AuthState>;
      },
      onRehydrateStorage: () => (state) => {
        // Re-attach the token to the axios client after the store is restored
        // from AsyncStorage, otherwise requests go out without Authorization.
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);
