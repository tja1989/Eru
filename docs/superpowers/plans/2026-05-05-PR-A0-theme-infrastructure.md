# PR-A.0: Theme Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the theme system primitives (light/dark palettes, useTheme hook, themed-styles helper, Zustand store, ThemeProvider) without migrating any consumer files. After this PR, the app renders identically to today, but the infrastructure is ready for incremental consumer migration in PR-A.1 through PR-A.4.

**Architecture:** A Zustand store holds the user's theme preference (`'system' | 'light' | 'dark'`). A `useTheme()` hook combines the stored mode with React Native's `useColorScheme()` to resolve the active palette (`light` or `dark`). A `useThemedStyles(factory)` helper memoizes per-theme `StyleSheet.create()` outputs so consumer migrations stay one-line-changes. A `ThemeProvider` wraps the root layout to make sure the active mode is reactive to system-pref changes.

**Tech Stack:** React Native, Zustand (already a dep), React Native's built-in `useColorScheme` and `Appearance` APIs, AsyncStorage (already wired via existing `authStore.persist`).

**Spec context:** This implements the "Theme switching" architecture from `docs/superpowers/specs/2026-05-05-eru-ig-aesthetic-design.md`. The spec called for one big PR-A; we're splitting into PR-A.0 (infrastructure, this plan) + A.1 through A.4 (consumer migration in batches) for review-ability. Behavior delivered to users is unchanged after this PR alone — they'll see no visual difference until A.1 lands.

---

## File structure

**Created:**
- `apps/mobile/stores/themeStore.ts` — Zustand store (`mode`, `setMode`)
- `apps/mobile/constants/themeColors.ts` — exported `lightColors`, `darkColors`, type `ThemeColors`
- `apps/mobile/hooks/useTheme.ts` — `useTheme()` hook returning `{ colors, mode, scheme }`
- `apps/mobile/hooks/useThemedStyles.ts` — `useThemedStyles(factory)` helper

**Modified:**
- `apps/mobile/constants/theme.ts` — keep existing `colors`, `tierColors`, `storyRingGradient` untouched (still imported by 70 files); add re-exports of new tokens so consumers can opt in via `useTheme()` later
- `apps/mobile/app/_layout.tsx` — wrap children in a `ThemeProvider` whose only job is forcing a re-render when the resolved theme flips

**Not modified in this PR:**
- The 70 files that currently import `colors` directly. They keep working unchanged. The migration to `useTheme()` happens in PR-A.1+.

---

## Task 1: Create the palette module

**Files:**
- Create: `apps/mobile/constants/themeColors.ts`

- [ ] **Step 1: Write the file**

```typescript
// apps/mobile/constants/themeColors.ts
//
// Light + dark color palettes for Eru.
//
// Light is the existing palette (kept identical to apps/mobile/constants/theme.ts
// so PR-A.0 doesn't change any visible color). Dark is new — Instagram-style
// black surfaces with brighter Eru accents (coin orange and streak fire are
// boosted for readability on black per the design spec).

export interface ThemeColors {
  // Surfaces
  bg: string;
  card: string;
  black: string;

  // Legacy brand tokens (re-pointed for IG-grayscale, name-preserved for
  // backward compat with the 70 existing consumers)
  navy: string;
  teal: string;
  purple: string;
  pink: string;
  cyan: string;

  // IG core
  red: string;
  blue: string;
  link: string;
  green: string;

  // Eru rewards-only (kept warm in both modes)
  coinOrange: string;
  coinSoft: string;
  coin700: string;
  orange: string;
  gold: string;
  streakFire: string;

  // Grayscale ramp
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

  navy: '#262626',
  teal: '#262626',
  purple: '#8E8E8E',
  pink: '#ED4956',
  cyan: '#00376B',

  red: '#ED4956',
  blue: '#0095F6',
  link: '#00376B',
  green: '#10B981',

  coinOrange: '#E8792B',
  coinSoft: '#FDEEDF',
  coin700: '#B45A14',
  orange: '#E8792B',
  gold: '#D97706',
  streakFire: '#FF6B35',

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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0 (no errors)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/constants/themeColors.ts
git commit -m "feat(mobile): add lightColors + darkColors palettes for theme system"
```

---

## Task 2: Create the themeStore

**Files:**
- Create: `apps/mobile/stores/themeStore.ts`

- [ ] **Step 1: Write the failing test**

Create: `apps/mobile/__tests__/stores/themeStore.test.ts`

```typescript
import { useThemeStore } from '@/stores/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
  });

  it('defaults to system mode', () => {
    expect(useThemeStore.getState().mode).toBe('system');
  });

  it('updates mode via setMode', () => {
    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('accepts the three valid modes', () => {
    const { setMode } = useThemeStore.getState();
    setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
    setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && npm test -- themeStore`
Expected: FAIL with "Cannot find module '@/stores/themeStore'"

- [ ] **Step 3: Write the store**

Create: `apps/mobile/stores/themeStore.ts`

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && npm test -- themeStore`
Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/stores/themeStore.ts apps/mobile/__tests__/stores/themeStore.test.ts
git commit -m "feat(mobile): add themeStore with mode persistence"
```

---

## Task 3: Create the useTheme hook

**Files:**
- Create: `apps/mobile/hooks/useTheme.ts`

- [ ] **Step 1: Write the failing test**

Create: `apps/mobile/__tests__/hooks/useTheme.test.tsx`

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/stores/themeStore';
import { lightColors, darkColors } from '@/constants/themeColors';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn(),
}));

const mockUseColorScheme = useColorScheme as jest.Mock;

describe('useTheme', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
    mockUseColorScheme.mockReturnValue('light');
  });

  it('returns light colors when mode=system and OS=light', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightColors);
    expect(result.current.scheme).toBe('light');
  });

  it('returns dark colors when mode=system and OS=dark', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(darkColors);
    expect(result.current.scheme).toBe('dark');
  });

  it('returns dark colors when mode=dark regardless of OS', () => {
    mockUseColorScheme.mockReturnValue('light');
    useThemeStore.setState({ mode: 'dark' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(darkColors);
    expect(result.current.scheme).toBe('dark');
  });

  it('returns light colors when mode=light regardless of OS', () => {
    mockUseColorScheme.mockReturnValue('dark');
    useThemeStore.setState({ mode: 'light' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightColors);
    expect(result.current.scheme).toBe('light');
  });

  it('falls back to light when mode=system and OS returns null (web)', () => {
    mockUseColorScheme.mockReturnValue(null);
    useThemeStore.setState({ mode: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.colors).toBe(lightColors);
    expect(result.current.scheme).toBe('light');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && npm test -- useTheme`
Expected: FAIL with "Cannot find module '@/hooks/useTheme'"

- [ ] **Step 3: Write the hook**

Create: `apps/mobile/hooks/useTheme.ts`

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && npm test -- useTheme`
Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/useTheme.ts apps/mobile/__tests__/hooks/useTheme.test.tsx
git commit -m "feat(mobile): add useTheme hook combining store + OS preference"
```

---

## Task 4: Create the useThemedStyles helper

**Files:**
- Create: `apps/mobile/hooks/useThemedStyles.ts`

- [ ] **Step 1: Write the failing test**

Create: `apps/mobile/__tests__/hooks/useThemedStyles.test.tsx`

```typescript
import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useThemeStore } from '@/stores/themeStore';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn(),
}));

const mockUseColorScheme = useColorScheme as jest.Mock;

describe('useThemedStyles', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
    mockUseColorScheme.mockReturnValue('light');
  });

  it('produces a StyleSheet with the active palette injected', () => {
    const { result } = renderHook(() =>
      useThemedStyles((c) => ({
        wrap: { backgroundColor: c.bg, color: c.g900 },
      })),
    );
    expect(result.current.wrap).toBeDefined();
  });

  it('memoizes the StyleSheet across renders within the same theme', () => {
    const { result, rerender } = renderHook(() =>
      useThemedStyles((c) => ({ wrap: { backgroundColor: c.bg } })),
    );
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });

  it('produces a different StyleSheet when the active palette changes', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result, rerender } = renderHook(() =>
      useThemedStyles((c) => ({ wrap: { backgroundColor: c.bg } })),
    );
    const lightStyles = result.current;

    mockUseColorScheme.mockReturnValue('dark');
    rerender({});
    expect(result.current).not.toBe(lightStyles);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && npm test -- useThemedStyles`
Expected: FAIL with "Cannot find module '@/hooks/useThemedStyles'"

- [ ] **Step 3: Write the hook**

Create: `apps/mobile/hooks/useThemedStyles.ts`

```typescript
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

import { useMemo } from 'react';
import { StyleSheet, StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme } from './useTheme';
import { ThemeColors } from '../constants/themeColors';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && npm test -- useThemedStyles`
Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/useThemedStyles.ts apps/mobile/__tests__/hooks/useThemedStyles.test.tsx
git commit -m "feat(mobile): add useThemedStyles hook with theme-aware memoization"
```

---

## Task 5: Wire ThemeProvider into root layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Read the current root layout**

Run: `cat apps/mobile/app/_layout.tsx`

Note the current structure — it's a "dumb Slot" per CLAUDE.md ([line 75](CLAUDE.md#L75) "no imperative redirects"). We add a thin wrapper component above the existing tree.

- [ ] **Step 2: Add a status-bar-aware wrapper**

Edit `apps/mobile/app/_layout.tsx` — replace the file with:

```typescript
// apps/mobile/app/_layout.tsx
//
// Root layout. Per CLAUDE.md this stays a "dumb Slot" with no imperative
// redirects (Slot-not-registered races). The ThemeAwareStatusBar wrapper
// only re-renders the StatusBar when the theme flips so the bar style
// matches the active scheme — which is the only place the root layout
// participates in theming.

import React from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

function ThemeAwareStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeAwareStatusBar />
      <Slot />
    </SafeAreaProvider>
  );
}
```

(If the existing file has additional providers or imports — auth gates, query clients, etc. — preserve those. Add `ThemeAwareStatusBar` ABOVE the existing tree and the import line. The Slot must remain dumb.)

- [ ] **Step 3: Verify TypeScript + run app**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 4: Smoke-test that theme store is reachable from any screen**

Add a temporary debug log in `apps/mobile/app/(tabs)/index.tsx` import block (will remove in step 6):

```typescript
import { useTheme } from '../../hooks/useTheme';
// then inside the component body, top of return:
const __theme = useTheme();
console.log('[theme]', __theme.scheme, __theme.mode);
```

Run: `cd apps/mobile && npx expo start --clear`
On device: open the app. In the Metro terminal, look for `[theme] light system` (or dark if your phone is in dark mode).

Toggle your phone's system dark-mode setting → the log should re-fire with `[theme] dark system`.

- [ ] **Step 5: Verify reactivity is correct**

Expected behavior:
- iOS: Settings → Display & Brightness → toggle "Dark" → Eru rerenders, log fires with new scheme
- Android: Settings → Display → Dark theme → toggle → same

If the log doesn't re-fire, something prevented `useColorScheme` from being reactive — see "What could go wrong" at the bottom of this plan.

- [ ] **Step 6: Remove the debug log**

Revert the temporary debug log added in Step 4 (just remove those two lines from `index.tsx`).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): wire ThemeAwareStatusBar in root layout"
```

---

## Task 6: Re-export new tokens from theme.ts

**Files:**
- Modify: `apps/mobile/constants/theme.ts`

The 70 existing consumers all do `import { colors } from '@/constants/theme'`. We don't break them. We add new exports so future consumers can opt in.

- [ ] **Step 1: Add re-exports to theme.ts**

Read: `cat apps/mobile/constants/theme.ts`

Append the new re-exports at the end of the file (after the existing `storyRingGradient` line, leave existing exports untouched):

```typescript
// Re-exports for the new theme system. Existing consumers keep using `colors`
// (which equals lightColors). New consumers should `import { useTheme } from
// '@/hooks/useTheme'` and read colors from there. PR-A.1 through PR-A.4 will
// migrate the existing consumers in batches.
export { lightColors, darkColors, type ThemeColors } from './themeColors';
export { useTheme } from '../hooks/useTheme';
export { useThemedStyles } from '../hooks/useThemedStyles';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Verify the static `colors` export still equals lightColors**

Run a one-line check (paste into a temp file or use REPL):

```typescript
// at top of any existing file, temporarily:
import { colors } from '@/constants/theme';
import { lightColors } from '@/constants/theme';
console.log(colors.bg === lightColors.bg); // should be true
```

If `colors.bg !== lightColors.bg`, the values diverged. Match `lightColors` to the existing static `colors` exactly (Task 1's `lightColors` was authored to match — verify by diffing `theme.ts`'s static `colors` against `themeColors.ts`'s `lightColors`).

- [ ] **Step 4: Remove the temporary check**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/constants/theme.ts
git commit -m "feat(mobile): re-export new theme tokens from theme.ts (back-compat)"
```

---

## Task 7: Add Settings → Appearance row

**Files:**
- Modify: `apps/mobile/app/settings/index.tsx`

A single row that lets the user override system preference. Sits at the top of the existing settings list as a self-contained section. Full Settings rebuild happens in PR-E (per spec); this row is a one-off touch.

- [ ] **Step 1: Read the current Settings file structure**

Run: `head -80 apps/mobile/app/settings/index.tsx`

Find the location AFTER the header View and BEFORE the existing Profile section (around line 240 per the post-revert file).

- [ ] **Step 2: Add the appearance row component imports**

Add to the import block at the top of `apps/mobile/app/settings/index.tsx`:

```typescript
import { useThemeStore, ThemeMode } from '../../stores/themeStore';
```

- [ ] **Step 3: Add an appearance section in the JSX**

Inside the ScrollView, ABOVE the "Profile section" comment block, insert:

```typescript
        {/* Appearance — temporary single-section UI, full Settings rebuild in PR-E */}
        <Text style={styles.sectionHeader}>Appearance</Text>
        <View style={styles.section}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={styles.fieldRow}
              onPress={() => useThemeStore.getState().setMode(m)}
            >
              <Text style={styles.fieldLabel}>
                {m === 'system' ? 'Use system' : m === 'light' ? 'Light' : 'Dark'}
              </Text>
              {useThemeStore.getState().mode === m ? (
                <Text style={{ fontSize: 17, color: colors.blue }}>✓</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
```

- [ ] **Step 4: Verify TypeScript**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 5: Smoke-test on device**

Run: `cd apps/mobile && npx expo start --clear`
On device:
1. Open Settings
2. See "Appearance" section near top with 3 rows: Use system / Light / Dark
3. Tap each row — the ✓ moves
4. Restart the app; the chosen mode persists (`useThemeStore.persist`)

NOTE: the rest of the app won't actually change colors yet — that's PR-A.1+. This task only verifies the toggle works and persists.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/settings/index.tsx
git commit -m "feat(mobile): add Settings appearance toggle (System/Light/Dark)"
```

---

## Task 8: Final verification + push branch

- [ ] **Step 1: Run full test suite**

Run: `cd apps/mobile && npm test`
Expected: all theme-related tests pass. Any pre-existing test failures (PostCard, etc.) are not in scope.

- [ ] **Step 2: Type-check whole mobile workspace**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Verify backward compat**

Run a quick grep to confirm no consumer file was touched:

```bash
git diff --stat main..HEAD -- 'apps/mobile/**/*.tsx' 'apps/mobile/**/*.ts' | grep -v themeColors | grep -v themeStore | grep -v useTheme | grep -v useThemedStyles | grep -v _layout.tsx | grep -v 'theme.ts$' | grep -v 'settings/index.tsx'
```

Expected: empty output (no untouched-but-modified consumer files).

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feat/pr-a0-theme-infrastructure
```

- [ ] **Step 5: Open PR**

```bash
gh pr create --base main --head feat/pr-a0-theme-infrastructure \
  --title "feat(mobile): PR-A.0 — theme infrastructure (light + dark palettes, hooks, store)" \
  --body "Implements the theme primitives from docs/superpowers/specs/2026-05-05-eru-ig-aesthetic-design.md without migrating any consumer files. App renders identically; infrastructure ready for PR-A.1 to start migrating the 70 consumer files in batches.

  - lightColors + darkColors palettes
  - useTheme() hook combining themeStore + useColorScheme
  - useThemedStyles(factory) memoized helper
  - themeStore (Zustand, AsyncStorage-persisted)
  - ThemeAwareStatusBar in root layout
  - Settings → Appearance toggle (System/Light/Dark)

  Tests: 11 new tests pass. tsc clean.
  "
```

---

## Self-review checklist

Run before declaring done:

1. **Spec coverage:**
   - Theme architecture diagram in spec → Tasks 2, 3, 4, 5 ✓
   - Light + dark palettes → Task 1 ✓
   - Coin/streak warm tokens preserved → Task 1 (both palettes have `coinOrange`, `streakFire`) ✓
   - Settings appearance toggle → Task 7 ✓
   - "All 60+ files using colors.* migrate to useTheme()" — **deliberately deferred to PR-A.1+ for review-ability**; documented in plan header ✓

2. **Placeholder scan:** No TBDs, no "implement later" lines. Every code block is the actual code. Every test has actual assertions. ✓

3. **Type consistency:**
   - `ThemeColors` interface matches across `themeColors.ts` and `useTheme.ts` ✓
   - `ThemeMode` type is `'system' | 'light' | 'dark'` everywhere ✓
   - `useTheme()` return type matches `useThemedStyles` factory parameter ✓

4. **No file paths in tasks reference files that don't exist after their parent task** — verified by reading task order top to bottom ✓

---

## What could go wrong

| Symptom | Cause | Fix |
|---|---|---|
| `useColorScheme` returns null on web | Web doesn't always implement it | We fall back to 'light' (Task 3 step 5 handles this — verified in test) |
| Toggling system dark mode doesn't trigger app rerender | iOS/Android don't always fire `Appearance.addChangeListener` reliably until app comes back to foreground | Acceptable. Users see new mode on next foreground. Document in user-facing notes if reported. |
| `useThemedStyles` memo invalidates too aggressively | `factory` reference changes per render → memo never hits | `useThemedStyles` takes `factory` as a dep. If consumers define the factory inline (`useThemedStyles(c => ({...}))`), the function ref is new each render but its closure is stable enough that `StyleSheet.create` returns equivalent output. We accept the slight perf cost in exchange for syntactic simplicity. If perf becomes an issue, consumers can hoist the factory outside the component. |
| Existing 70 consumer files start showing wrong colors | We didn't migrate any — they keep using static `colors` which equals `lightColors`. App appears in light mode regardless of system setting. **This is intentional** for PR-A.0 (verified in Task 8 step 3). PR-A.1 begins migration. |
| Settings toggle doesn't visually flip the app | Same as above — only tasks A.1+ make the consumer files reactive. The toggle works (state changes, persists) but no visible effect yet. Document in PR description. |
| `_layout.tsx` was already wrapped in providers (auth, query) and we accidentally clobber them | Step 5 of Task 5 instructs the engineer to PRESERVE existing providers. If they don't, the auth gate breaks. Verified in code review. |

---

## After this plan completes

The next plan (`2026-05-05-PR-A1-flagship-migration.md`) will:
1. Migrate the Home tab (`(tabs)/index.tsx`) using `useThemedStyles`
2. Verify dark mode actually flips the home feed colors
3. Establish the migration pattern for PR-A.2 through PR-A.4

That plan will be ~150 lines (one screen + a deep verification pass on a real device).
