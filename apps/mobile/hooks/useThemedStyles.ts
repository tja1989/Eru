// apps/mobile/hooks/useThemedStyles.ts
//
// Themed-style helper. Consumers pass a factory that takes the active palette
// and returns a style spec; the hook memoizes the resulting StyleSheet so a
// stable reference is returned per theme. When the theme changes (system flip
// or manual override), the StyleSheet is recreated and the consumer rerenders.
//
// Usage:
//   const styles = useThemedStyles((c) => ({
//     wrap: { backgroundColor: c.bg },
//     title: { color: c.g900 },
//   }));
//
// The factory closure must be stable across renders for memoization to hit.
// Defining it inline (`useThemedStyles(c => ({...}))`) creates a fresh
// reference each render — the memo will recreate the StyleSheet each render
// in that case. Acceptable perf cost for syntactic simplicity; consumers can
// hoist the factory outside the component if it becomes a hot path.

import { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme } from './useTheme';
import { ThemeColors } from '../constants/themeColors';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}
