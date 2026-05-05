// apps/mobile/constants/theme.ts
// Instagram-locked design tokens.
// Replaces the prior multi-brand palette (navy/teal/purple/pink) with a
// pure IG grayscale + IG-blue + IG-red palette. Token NAMES are preserved
// (colors.navy, colors.teal, etc.) so no consumer code breaks — every
// non-IG hue is re-pointed to its closest IG-grayscale equivalent.
//
// The orange + gold tokens are kept ONLY for the rewards/coin surface
// (Wallet, points badges, streak). Everything else should read from
// the grayscale ramp or `blue` / `red`.

export const colors = {
  // Surfaces
  bg: '#FAFAFA',
  card: '#FFFFFF',
  black: '#000000',

  // ── Legacy brand tokens, re-pointed to IG grayscale ─────────────────
  // (kept by name so existing screens/components compile unchanged)
  navy: '#262626',     // was #1A3C6E   → IG primary text
  teal: '#262626',     // was #0D9488   → IG primary text
  purple: '#8E8E8E',   // was #7C3AED   → IG secondary text
  pink: '#ED4956',     // was #EC4899   → IG red (likes)
  cyan: '#00376B',     // was #06B6D4   → IG link blue
  // ────────────────────────────────────────────────────────────────────

  // Instagram core
  red: '#ED4956',      // like / destructive
  blue: '#0095F6',     // primary CTA + link accent
  link: '#00376B',     // hashtag / username link
  green: '#10B981',    // kept for rewards-only surfaces
  gold: '#D97706',     // coin gold — rewards-only
  orange: '#E8792B',   // coin orange — rewards-only

  // Coin/reward soft tints (use ONLY in Wallet/Redeem/PointsBadge)
  coinSoft: '#FDEEDF',
  coin700: '#B45A14',

  // Grayscale ramp — Instagram's ladder
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

// Tier rings on Avatar — re-pointed so all tiers default to IG's neutral
// gray ring; only Champion keeps a warm accent (gold) for visual hierarchy.
// The Story-ring gradient (below) remains the only multi-color ring in IG.
export const tierColors: Record<string, string> = {
  explorer: colors.g300,
  engager: colors.g400,
  influencer: colors.g600,
  champion: colors.gold,
};

// Instagram story-ring gradient — UNCHANGED, this IS the IG ring.
export const storyRingGradient = ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'];

// Typography helper — IG uses a system sans-serif on mobile.
// React Native picks system font when fontFamily is undefined; we expose
// a constant so consumers can write `fontFamily: type.sans` for clarity.
export const type = {
  sans: undefined as undefined | string, // resolves to system font
  // The script "Instagram" wordmark is rendered via SVG/Image, not a font.
} as const;
