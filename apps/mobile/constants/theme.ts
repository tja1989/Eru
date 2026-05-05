export const colors = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  black: '#000000',
  navy: '#1A3C6E',
  orange: '#E8792B',
  teal: '#0D9488',
  purple: '#7C3AED',
  pink: '#EC4899',
  red: '#ED4956',
  blue: '#0095F6',
  green: '#10B981',
  gold: '#D97706',
  cyan: '#06B6D4',
  g50: '#FAFAFA',
  g100: '#EFEFEF',
  g200: '#DBDBDB',
  g300: '#C7C7C7',
  g400: '#8E8E8E',
  g500: '#737373',
  g600: '#595959',
  g700: '#363636',
  g800: '#262626',
  g900: '#121212',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const radius = {
  sm: 4, md: 8, lg: 12, xl: 16, full: 9999,
} as const;

export const tierColors: Record<string, string> = {
  explorer: colors.g400,
  engager: colors.teal,
  influencer: colors.orange,
  champion: colors.gold,
};

export const storyRingGradient = ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'];

// Re-exports for the new theme system. Existing consumers keep using `colors`
// (which equals lightColors). New consumers should `import { useTheme } from
// '@/hooks/useTheme'` and read colors from there. PR-A.1 through PR-A.4 will
// migrate the existing consumers in batches.
export { lightColors, darkColors, type ThemeColors } from './themeColors';
export { useTheme } from '../hooks/useTheme';
export { useThemedStyles } from '../hooks/useThemedStyles';
