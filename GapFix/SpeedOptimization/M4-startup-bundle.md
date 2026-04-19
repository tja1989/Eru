# M4 — App Startup + Bundle Optimization

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:executing-plans`, `superpowers:test-driven-development`. M4 is fully parallelisable with M2, M3, M5. TDD rules per `GapFix/SpeedOptimization.md#7-tdd-protocol-agent-first`.

## 1. Goal

Confirm Hermes is enabled, lazy-load tabs so only the active tab's code runs at cold start, optimise assets (WebP, font subsetting), and defer non-critical startup work (notifications token registration, Sentry init) until after first interactive.

## 2. Analogy

The dining room (mobile) opens faster if we don't unpack *every* table setting before the first guest arrives. Just set one table; set others as guests sit down.

## 3. Why we need this

- Cold start on mid-range Android currently ~4s (target: <2s).
- Hermes is the default React Native JS engine for SDK 51+ but must be explicitly declared in `app.json` for SDK 54 with New Architecture. **Currently not declared** (see `SpeedOptimization.md#1-context`).
- Every tab's initial data-load (`useEffect` in (tabs)/index.tsx, explore.tsx, profile.tsx) fires on cold start because React Router mounts all tab screens eagerly.
- `expo-router`'s `initialRouteName` + `unstable_settings` can defer non-initial tabs.

## 4. Files to modify

| File | Change |
|---|---|
| `apps/mobile/app.json` | Add `"jsEngine": "hermes"` under `"expo"` |
| `apps/mobile/app/_layout.tsx` | Defer `useNotifications()` via `setTimeout(500)` or `InteractionManager.runAfterInteractions` |
| `apps/mobile/app/(tabs)/_layout.tsx` | Add `unstable_settings: { initialRouteName: 'index' }`; experiment with `lazy` on non-initial tabs |
| `apps/mobile/app/(tabs)/index.tsx:23` | Defer `loadFeed(1)` via `InteractionManager.runAfterInteractions` |
| `apps/mobile/app/(tabs)/explore.tsx:44-47` | Lazy-load explore data — don't fire in `useEffect` on mount; wait for focus |
| `apps/mobile/app/(tabs)/profile.tsx` | Same lazy pattern |
| `apps/mobile/lib/coldStartMeter.ts` | **NEW** — measures cold-start duration; emits to M5's analytics |
| `apps/mobile/__tests__/utils/coldStartMeter.test.ts` | **NEW** |
| `apps/mobile/__tests__/layout/tabs-lazy.test.tsx` | **NEW** — asserts explore data service NOT called on cold boot when index is the initial route |
| `apps/mobile/__tests__/layout/root-layout.test.tsx` | **NEW** — asserts useNotifications fires after a delay, not synchronously |
| `apps/mobile/metro.config.js` | **NEW** — enable `@expo/metro-runtime` + tree-shake `@expo/vector-icons` |
| `apps/mobile/assets/*.png` → `*.webp` | WebP conversion (tool: `cwebp` or `sharp`) |

## 5. Ordered TDD tasks

### Task M4.1 — Enable Hermes

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/runtime/engine.test.ts`:

```typescript
describe('JS engine is Hermes in production builds', () => {
  it('global.HermesInternal is defined at runtime', () => {
    // Note: Jest runs under Node, not Hermes. This test asserts
    // the config intent, not the runtime, by reading app.json directly.
    const appJson = require('../../app.json');
    expect(appJson.expo.jsEngine).toBe('hermes');
  });
});
```

- [ ] **Step 2: Implement.** Edit `apps/mobile/app.json` to add `"jsEngine": "hermes"` under `"expo"`:

```json
{
  "expo": {
    "name": "Eru",
    "slug": "eru",
    "version": "1.0.0",
    "orientation": "portrait",
    "jsEngine": "hermes",
    ...
  }
}
```

- [ ] **Step 3: Verify green.** Run the test. Also rebuild: `npx expo prebuild --clean` then `npx expo run:android` on a real device. In Chrome DevTools or `adb logcat`, check for `[Hermes]` logs indicating Hermes is active.

- [ ] **Step 4: Smoke-test playback.** Confirm expo-video, firebase/auth, and the main tabs render without crashes on Hermes. If any library crashes, fallback is to revert `"jsEngine"` key.

**Why does this matter?** Hermes reduces cold-start by 30-50% vs JSC on Android per React Native team's own benchmarks. On mid-range devices the difference is literally 1-2 seconds.

### Task M4.2 — Cold-start measurement hook

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/utils/coldStartMeter.test.ts`:

```typescript
import { startColdStartMeter, completeColdStartMeter, getColdStartDuration } from '@/lib/coldStartMeter';

describe('coldStartMeter', () => {
  beforeEach(() => {
    // Reset module state
    jest.resetModules();
  });

  it('returns undefined before completion', () => {
    startColdStartMeter();
    expect(getColdStartDuration()).toBeUndefined();
  });

  it('returns a positive duration after completion', () => {
    startColdStartMeter();
    // Simulate 500ms elapsed
    jest.advanceTimersByTime(500);
    completeColdStartMeter();
    const d = getColdStartDuration();
    expect(d).toBeGreaterThanOrEqual(0);  // at least 0ms (timer not advanced in test env → 0 is OK)
  });

  it('completing twice is a no-op (keeps first measurement)', () => {
    startColdStartMeter();
    completeColdStartMeter();
    const d1 = getColdStartDuration();
    completeColdStartMeter();
    const d2 = getColdStartDuration();
    expect(d2).toBe(d1);
  });
});
```

- [ ] **Step 2: Implement.** Create `apps/mobile/lib/coldStartMeter.ts`:

```typescript
let startedAt: number | undefined;
let completedAt: number | undefined;

export function startColdStartMeter(): void {
  if (startedAt === undefined) {
    startedAt = Date.now();
  }
}

export function completeColdStartMeter(): void {
  if (completedAt === undefined && startedAt !== undefined) {
    completedAt = Date.now();
  }
}

export function getColdStartDuration(): number | undefined {
  if (startedAt === undefined || completedAt === undefined) return undefined;
  return completedAt - startedAt;
}
```

- [ ] **Step 3: Wire into app startup.** Edit `apps/mobile/app/_index.tsx` (entry) or top of `_layout.tsx`:

```typescript
import { startColdStartMeter, completeColdStartMeter } from '@/lib/coldStartMeter';

// Fire as early as possible in the JS lifecycle
startColdStartMeter();

// In the root layout component, on first render:
useEffect(() => {
  completeColdStartMeter();
  // M5 will hook here and emit the metric to Sentry
}, []);
```

- [ ] **Step 4: Verify green.**

**Why does this matter?** Without a measurement, we can't tell if M4.3–M4.6 actually reduced cold start. This hook is the instrument M5 reads from.

### Task M4.3 — Lazy-load non-initial tabs

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/layout/tabs-lazy.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';

const getExploreSpy = jest.fn().mockResolvedValue({ items: [], page: 1, limit: 10, total: 0 });
jest.mock('@/services/contentService', () => ({
  getFeed: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 10, total: 0 }),
  getExplore: getExploreSpy,
}));
jest.mock('expo-router', () => {
  const { View } = require('react-native');
  return {
    Slot: () => <View testID="slot" />,
    Tabs: ({ children }: { children: React.ReactNode }) => <View testID="tabs-root">{children}</View>,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  };
});
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: unknown) => (sel as (s: unknown) => unknown)({ user: { id: 'u-me' }, isAuthenticated: true }),
}));

describe('Tabs layout — lazy non-initial tabs', () => {
  it('does NOT call getExplore on cold boot when the initial route is index', async () => {
    const TabsLayout = require('@/app/(tabs)/_layout').default;
    render(<TabsLayout />);
    // Give the event loop a tick so any eager useEffects would have fired
    await new Promise(r => setImmediate(r));
    expect(getExploreSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement.** Edit `apps/mobile/app/(tabs)/_layout.tsx`:

```typescript
// Add at the top of the file:
export const unstable_settings = {
  initialRouteName: 'index',
};
```

Then edit each non-initial tab's screen component (`explore.tsx`, `profile.tsx`) to only fetch data when the screen is focused rather than mounted:

```typescript
// apps/mobile/app/(tabs)/explore.tsx
import { useFocusEffect } from 'expo-router';
// ...
useFocusEffect(
  useCallback(() => {
    loadExplore();
  }, [])
);
```

Replace the existing `useEffect(() => loadExplore(), [])` pattern with `useFocusEffect`. This ensures the fetch fires only when the user navigates to the tab, not on cold boot.

- [ ] **Step 3: Verify green.** Run the test. Also manually boot the app and check Metro logs — only `GET /feed` should fire on cold start, not `GET /explore`.

### Task M4.4 — Defer `useNotifications`

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/layout/root-layout-defer.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';

const useNotificationsSpy = jest.fn();
jest.mock('@/hooks/useNotifications', () => ({ useNotifications: useNotificationsSpy }));

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  return { Slot: () => <View testID="slot" /> };
});

describe('Root layout — defer notifications', () => {
  it('does not call useNotifications synchronously at render', () => {
    const RootLayout = require('@/app/_layout').default;
    render(<RootLayout />);
    // At this synchronous point, useNotifications must not yet have fired
    expect(useNotificationsSpy).not.toHaveBeenCalled();
  });

  it('calls useNotifications after a 500ms delay', async () => {
    const RootLayout = require('@/app/_layout').default;
    render(<RootLayout />);
    await new Promise(r => setTimeout(r, 600));
    expect(useNotificationsSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Implement.** Edit `apps/mobile/app/_layout.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { View, InteractionManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PointsToast } from '../components/PointsToast';
import { useNotifications } from '../hooks/useNotifications';
import { completeColdStartMeter } from '../lib/coldStartMeter';

export default function RootLayout() {
  const [notificationsReady, setNotificationsReady] = useState(false);

  useEffect(() => {
    completeColdStartMeter();
    // Defer non-critical startup work until after the UI is interactive
    const handle = InteractionManager.runAfterInteractions(() => {
      setNotificationsReady(true);
    });
    return () => handle.cancel();
  }, []);

  // Only engage useNotifications once we're past first-interactive
  if (notificationsReady) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Slot />
        <PointsToast />
        <NotificationsInitializer />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      <PointsToast />
    </View>
  );
}

// Small wrapper so `useNotifications` only calls on component mount AFTER interactivity
function NotificationsInitializer() {
  useNotifications();
  return null;
}
```

Line-by-line:

- `InteractionManager.runAfterInteractions` → schedule a callback for after React's current render cycle AND any active animations finish. On a cold boot, this fires ~200–500ms after first frame.
- `notificationsReady` state gates `<NotificationsInitializer />` — which in turn calls `useNotifications()`. The hook only runs once the flag flips.
- Returning JSX without the initializer during the startup window means `expo-notifications` isn't imported synchronously; the lazy hook inside `useNotifications` (already conditional per `apps/mobile/CLAUDE.md`) is deferred.

- [ ] **Step 3: Verify green.**

### Task M4.5 — Font subsetting

- [ ] **Step 1: Audit current fonts.** From `apps/mobile/`:

```bash
# Find any custom font files
find assets -iname "*.ttf" -o -iname "*.otf"
```

If no custom font files exist, skip this task.

If custom fonts exist, measure their size (`ls -la <path>`) and identify which glyph ranges they actually use in the app. Eru primarily displays Latin + Indic scripts (for Malayalam usernames in Kerala pilot). A full TTF is ~2 MB; a subset is ~300 KB.

- [ ] **Step 2: Use `pyftsubset` or `fonttools` to subset.**

```bash
pip install fonttools

# Subset to Latin + Malayalam + digits
pyftsubset apps/mobile/assets/fonts/Original.ttf \
  --unicodes=U+0020-007E,U+00A0-00FF,U+0D00-0D7F,U+0030-0039 \
  --output-file=apps/mobile/assets/fonts/OriginalSubset.ttf
```

- [ ] **Step 3: Regression test (visual).** Render a screen with Malayalam text (use the Kerala seed data). Ensure glyphs still render. If any `?` appears, extend the unicode range.

### Task M4.6 — WebP icon conversion

- [ ] **Step 1: Convert icons.** Use `cwebp` or `sharp`:

```bash
npm install -g sharp-cli

sharp apps/mobile/assets/icon.png --format webp -o apps/mobile/assets/icon.webp
sharp apps/mobile/assets/adaptive-icon.png --format webp -o apps/mobile/assets/adaptive-icon.webp
sharp apps/mobile/assets/splash-icon.png --format webp -o apps/mobile/assets/splash-icon.webp

# Compare sizes
ls -la apps/mobile/assets/*.png apps/mobile/assets/*.webp
# Expect WebP ~30-50% smaller than PNG
```

- [ ] **Step 2: Update `app.json`.** Expo's manifest prefers PNG for historical reasons. Some fields (like `icon` for iOS/Android) require PNG — keep those. For inline app-shell usage (custom splash components), switch to WebP.

**Warning:** `icon`, `adaptiveIcon.foregroundImage`, and `splash.image` in `app.json` should stay as PNG — these are passed to native build tools that don't all support WebP. Only swap in-app image references to WebP.

- [ ] **Step 3: Metro config tweak.** Create/update `apps/mobile/metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Ensure WebP is handled
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'webp'])];

module.exports = config;
```

- [ ] **Step 4: Test.** Run a full app boot, view each tab, confirm no broken images.

## 6. What could go wrong

- **Hermes incompatibility with a specific dependency.** Rare in 2026 but possible. If expo-video or firebase-auth crashes on Hermes, the build fails on first run. **Mitigation:** keep `"jsEngine": "jsc"` as revert option documented in rollback.
- **Deferring `useNotifications` breaks re-engagement.** If deferred too long, a user who opens the app on a cold network might close it before notifications register. **Mitigation:** 500ms (`InteractionManager.runAfterInteractions`) is safe; anything >2s is risky.
- **Lazy tabs cause visual glitch on first switch.** First tap on "explore" shows a blank screen for ~100ms while code loads. **Mitigation:** show a skeleton loader; prefetch via `InteractionManager` after first interactive.
- **WebP not supported on iOS < 14.** Eru targets modern iOS (per Firebase Auth requirements). Verify minimum iOS version in `ios.deploymentTarget`; if below 14, stay on PNG.
- **Cold-start meter on Hermes starts counting slightly later than on JSC.** Hermes parses the bundle faster; `Date.now()` at bundle-run-time is close to wall-clock. Acceptable imprecision for our target.
- **Metro assetExts change breaks other asset types.** Double-check existing asset types still load after editing `metro.config.js`.

## 7. Rollback

- `app.json`: remove `"jsEngine"` line; rebuild. App reverts to JSC.
- `_layout.tsx` changes: each is a discrete commit; revert individually.
- Asset changes: git revert the binary assets. PNG files are still committed; new WebP can be added alongside or removed.
- Metro config: revert the `metro.config.js` diff.
- `useFocusEffect` tab changes: revert to `useEffect(() => loadExplore(), [])`.

No data loss in any path.

## 8. Cost delta

- $0. All changes are client-side.

## 9. Duration

- M4.1 (Hermes verify + enable): 1–2 hours
- M4.2 (cold-start meter): 2–3 hours
- M4.3 (lazy tabs): 4–6 hours (SDK 54 API docs may need dive-in)
- M4.4 (defer notifications): 2–3 hours
- M4.5 (font subsetting): 3–4 hours (if fonts exist; else skip)
- M4.6 (WebP icons): 2–3 hours
- **Total:** 14–21 hours = **2–3 working days** (minus M4.5 if no custom fonts).

## 10. Dependencies

- Blocked by: nothing (fully parallelisable with M2/M3/M5).
- Output feeds: M5's cold-start measurement reads from the hook added in M4.2.

## 11. Next milestone

Proceed to [M5 — Performance monitoring](M5-monitoring.md). M5 should ideally ship alongside M2/M3/M4 so each milestone's impact can be measured.
