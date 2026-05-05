// apps/mobile/stores/themeStore.ts
//
// User theme preference. 'system' follows the OS dark/light setting; the two
// explicit modes override the OS preference. Persisted to AsyncStorage so the
// preference survives app restarts.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'eru-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
