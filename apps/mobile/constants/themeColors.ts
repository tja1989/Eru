/**
 * themeColors.ts
 *
 * Light + dark color palettes for the Eru theme system (PR-A.0 infrastructure).
 *
 * IMPORTANT: PR-A.0 introduces NO visible color change. The `lightColors`
 * palette mirrors the existing `apps/mobile/constants/theme.ts` values
 * exactly, so consumers that switch to themed colors render identically
 * until per-consumer migrations begin in PR-A.1+.
 *
 * The `darkColors` palette is new — Instagram-style true-black surfaces
 * with brighter Eru coin/streak accents. No existing consumer depends on
 * dark values yet.
 *
 * Additive tokens new in this file (present in BOTH modes for upcoming
 * consumer migrations):
 *   - link        (Instagram-style hyperlink blue)
 *   - coinOrange  (alias for `orange` — semantic name for rewards UI)
 *   - coinSoft    (low-opacity coin background tint)
 *   - coin700     (deeper coin shade for pressed/emphasis states)
 *   - streakFire  (streak-flame accent, distinct from coinOrange)
 */

export interface ThemeColors {
  // Surfaces
  bg: string;
  card: string;
  black: string;

  // Legacy brand tokens (kept identical to existing theme.ts in light mode;
  // dark mode repurposes these — see darkColors below).
  navy: string;
  teal: string;
  purple: string;
  pink: string;
  cyan: string;

  // Instagram-core semantic colors
  red: string;
  blue: string;
  link: string;
  green: string;

  // Eru rewards-only accents
  coinOrange: string;
  coinSoft: string;
  coin700: string;
  orange: string;
  gold: string;
  streakFire: string;

  // Grayscale ramp (50 = lightest, 900 = darkest in light mode; inverted in dark)
  g50: string;
  g100: string;
  g200: string;
  g300: string;
  g400: string;
  g500: string;
  g600: string;
  g700: string;
  g800: string;
  g900: string;
}

export const lightColors: ThemeColors = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  black: '#000000',

  // Legacy brand tokens — KEEP existing theme.ts values (do not IG-grayscale yet;
  // the IG-grayscale shift happens consumer-by-consumer in PR-A.1+ migrations
  // so each consumer's color choice is reviewed individually)
  navy: '#1A3C6E',
  teal: '#0D9488',
  purple: '#7C3AED',
  pink: '#EC4899',
  cyan: '#06B6D4',

  // IG core (already in theme.ts as red/blue/green; link is new)
  red: '#ED4956',
  blue: '#0095F6',
  link: '#00376B',
  green: '#10B981',

  // Eru rewards-only (orange + gold already exist in theme.ts; coinOrange is
  // an alias for orange so consumers can use the more semantic name; coinSoft,
  // coin700, streakFire are new additive tokens)
  coinOrange: '#E8792B',
  coinSoft: '#FDEEDF',
  coin700: '#B45A14',
  orange: '#E8792B',
  gold: '#D97706',
  streakFire: '#FF6B35',

  // Grayscale ramp — already in theme.ts, unchanged
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
};

export const darkColors: ThemeColors = {
  bg: '#000000',
  card: '#000000',
  black: '#000000',

  // In dark mode, the legacy brand tokens are repurposed for "primary content
  // surface" — what was navy-on-white in light mode becomes white-on-black in
  // dark. This is the right semantic shift; consumer migrations (PR-A.1+) will
  // confirm per-component whether the brand color or the grayscale version is
  // correct in context.
  navy: '#FFFFFF',
  teal: '#FFFFFF',
  purple: '#A8A8A8',
  pink: '#FF3040',
  cyan: '#0095F6',

  red: '#FF3040',
  blue: '#0095F6',
  link: '#0095F6',
  green: '#10B981',

  coinOrange: '#FF9148',
  coinSoft: 'rgba(232, 121, 43, 0.18)',
  coin700: '#FFB07A',
  orange: '#FF9148',
  gold: '#F59E0B',
  streakFire: '#FF8A5C',

  g50: '#121212',
  g100: '#1E1E1E',
  g200: '#262626',
  g300: '#363636',
  g400: '#595959',
  g500: '#737373',
  g600: '#A8A8A8',
  g700: '#C7C7C7',
  g800: '#DBDBDB',
  g900: '#FAFAFA',
};
