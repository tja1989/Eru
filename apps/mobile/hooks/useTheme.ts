// apps/mobile/hooks/useTheme.ts
//
// Resolves the active theme by combining the user's stored preference with
// the OS color scheme. Returns the active palette + the resolved scheme name
// ('light' | 'dark') for callers that need to branch (e.g. choosing a status
// bar style).

import { useColorScheme } from 'react-native';
import { useThemeStore, ThemeMode } from '../stores/themeStore';
import { lightColors, darkColors, ThemeColors } from '../constants/themeColors';

interface UseThemeResult {
  colors: ThemeColors;
  mode: ThemeMode;
  scheme: 'light' | 'dark';
}

export function useTheme(): UseThemeResult {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useColorScheme();
  const scheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme ?? 'light') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, mode, scheme };
}
