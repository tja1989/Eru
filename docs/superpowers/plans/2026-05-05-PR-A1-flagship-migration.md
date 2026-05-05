# PR-A.1: Home-tab Flagship Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `apps/mobile/app/(tabs)/index.tsx` (the Home/feed screen) to consume the new theme system from PR-A.0. Verify on a real device that dark mode actually flips this screen's colors when the user toggles in Settings → Appearance. Establish the migration pattern that PR-A.2 through PR-A.4 will follow for the remaining 69 consumers.

**Architecture:** The Home tab currently does `import { colors } from '@/constants/theme'` and creates a static `StyleSheet` at module load. Migrate to `useThemedStyles((c) => ({...}))` inside the component body so the StyleSheet recomputes when the active palette flips. Hardcoded `'#fff'` values in the existing styles get replaced with the appropriate token (`bg` for SafeAreaView, `card` for the header bar).

**Tech Stack:** React Native, the `useThemedStyles` helper from PR-A.0, `useTheme` for the resolved scheme.

**Spec context:** Implements the first consumer migration from `docs/superpowers/specs/2026-05-05-eru-ig-aesthetic-design.md`. The Home tab is intentionally chosen as flagship because (a) it's the first screen users see, (b) it has only 4 color references so the migration is mechanical, (c) it composes other components (StoryRow, PostCard, etc.) that stay light until A.4 — verifying that cross-screen "partial flip" looks acceptable as an intermediate state.

---

## File structure

**Modified:**
- `apps/mobile/app/(tabs)/index.tsx` — single file. Switch import, move StyleSheet inside component via `useThemedStyles`, replace hardcoded hexes with tokens.

**Not touched:**
- `PostCard.tsx`, `StoryRow.tsx`, `PointsBadge.tsx`, `NotificationBell.tsx`, `LoadingSpinner.tsx` — these stay on the legacy static `colors` import. They render in light mode regardless of the toggle. **This is the intermediate state** the user will see after A.1; it gets fully resolved in A.4 when components migrate.

---

## Task 1: Migrate Home tab to useThemedStyles

**Files:**
- Modify: `/Users/USER/claude_tj/Eru/apps/mobile/app/(tabs)/index.tsx`

The migration pattern (will repeat for ~69 more files in A.2-A.4):

| Before | After |
|---|---|
| `import { colors } from '../../constants/theme';` | `import { useThemedStyles } from '../../constants/theme';` |
| Static `const styles = StyleSheet.create({...})` at module bottom | Inside component: `const styles = useThemedStyles((c) => ({...}))`. Hoist factory OUTSIDE the component for memo stability. |
| `'#fff'` for backgrounds | `c.bg` (SafeAreaView root) or `c.card` (header bar) |
| `colors.g100` | `c.g100` |
| `colors.g800` | `c.g800` |

The factory must be defined OUTSIDE the component so its reference is stable across renders (memo hits). Inline factory works too but recreates the StyleSheet every render — acceptable cost for an 89-line screen but bad practice to set as the migration template.

- [ ] **Step 1: Read the current file**

```bash
cat /Users/USER/claude_tj/Eru/apps/mobile/app/(tabs)/index.tsx
```

Confirm structure: imports, `HomeFeedScreen` function, hooks (`useFeed`, `usePointsStore`, etc.), `renderHeader`, return JSX, then `const styles = StyleSheet.create({...})` at the bottom (lines 84-89).

- [ ] **Step 2: Apply the migration as a single targeted edit**

Replace the import line:
```typescript
import { colors } from '../../constants/theme';
```
with:
```typescript
import { useThemedStyles } from '../../constants/theme';
import type { ThemeColors } from '../../constants/theme';
```

Add a module-level factory (above the component, below imports):
```typescript
// Style factory hoisted outside the component so its reference is stable
// across renders — useThemedStyles' useMemo hits, no per-render
// StyleSheet.create. This is the canonical migration pattern; other
// screens in A.2-A.4 follow the same shape.
const stylesFactory = (c: ThemeColors) => ({
  safe: { flex: 1 as const, backgroundColor: c.bg },
  appHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: c.card,
    borderBottomWidth: 0.5,
    borderBottomColor: c.g100,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800' as const,
    fontStyle: 'italic' as const,
    color: c.g800,
    fontFamily: 'Georgia',
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
});
```

Inside the `HomeFeedScreen` component, after the existing hook calls but before the `useEffect`, add:
```typescript
const styles = useThemedStyles(stylesFactory);
```

Delete the entire trailing `const styles = StyleSheet.create({...})` block (lines 84-89 in the current file).

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx tsc --noEmit
```
Expected: exit 0.

If TypeScript complains about the `as const` annotations, that's because RN's `ViewStyle` requires literal types for properties like `flexDirection` (which is a union of string literals). The `as const` casts on the ambiguous values inside the factory enforce them at the type level. Don't strip them.

- [ ] **Step 4: Verify tests still pass**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npm test 2>&1 | tail -10
```
Expected: 572/572 passing (or whatever the post-A.0 baseline is). No NEW failures introduced.

- [ ] **Step 5: Commit**

Stage only the modified file:
```bash
cd /Users/USER/claude_tj/Eru
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): migrate Home tab to theme-reactive styles (PR-A.1 flagship)

First consumer migration of PR-A's theme rollout. The Home tab now
uses useThemedStyles + a hoisted ThemeColors factory, so its
SafeAreaView, header bar, hairline border, and Eru wordmark colors
all flip when the active theme changes (system pref change or user
toggle in Settings → Appearance).

Hardcoded '#fff' values replaced with semantic tokens (c.bg for
SafeAreaView root, c.card for header bar — distinct so dark-mode
treatment can differentiate later if needed).

Composed children (StoryRow, PostCard, PointsBadge, NotificationBell,
LoadingSpinner) still use the legacy static colors import — they
render in light mode regardless of the toggle, producing an
intermediate "header flips, body stays" state. This is the expected
visual after A.1 alone; A.4 migrates those components.

Establishes the canonical migration pattern (hoisted factory +
useThemedStyles inside component body) for the remaining ~69 files
in A.2 through A.4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Manual device verification

This task isn't automatable — it's the human-in-loop check that the migration actually worked. Required before the PR opens.

- [ ] **Step 1: Trigger an Android EAS preview build**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile
eas build --platform android --profile preview --non-interactive
```

Wait ~25 minutes (free-tier queue + build time).

- [ ] **Step 2: Install on Android phone**

When EAS finishes, open the build URL on your Android device. Tap "Install." Allow "Install unknown apps" for the browser if prompted.

- [ ] **Step 3: Walk the verification checklist**

| Check | Expected |
|---|---|
| Open the app, land on Home | Header bar reads `Eru` wordmark in italic Georgia, light surface |
| Open Settings → Appearance → tap "Dark" | Settings screen unchanged (its rows haven't migrated yet — that's A.3) |
| Navigate back to Home | Header bar surface flips to **black**, wordmark reads in light grey, hairline border at bottom of header changes from light to dark grey |
| Stories ring + post cards below the header | Still render in light mode (StoryRow/PostCard not migrated yet — expected) |
| Open Settings → Appearance → tap "Use system" | Header surface returns to white if the phone's system pref is light, stays dark if system pref is dark |
| Toggle the **phone's** system dark mode in Android Settings | With "Use system" selected, the Home header flips automatically without app restart |
| Restart the app | The selected mode persists (themeStore's AsyncStorage) |

- [ ] **Step 4: Document the result**

If all checks pass: report DONE.

If anything fails:
- Header doesn't flip → investigate. Likely cause: `useThemedStyles` is reading wrong palette, OR the factory isn't subscribed to colors. Check the deps array in `useMemo`.
- App crashes → check Metro logs / Sentry. Likely cause: `useThemedStyles` factory has a TypeScript-level bug that compiled but failed at runtime.
- Dark colors look wrong (e.g. logo text invisible) → not a migration bug — it's the dark palette's `g800` value being too dark on the dark `card` surface. Token issue, not code issue. Flag for spec review; possible token tweak.

---

## Task 3: Push branch + open PR

- [ ] **Step 1: Push branch**

```bash
cd /Users/USER/claude_tj/Eru
git push -u origin feat/pr-a1-home-flagship
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --base main --head feat/pr-a1-home-flagship \
  --title "feat(mobile): PR-A.1 — Home tab flagship migration to theme-reactive styles" \
  --body "$(cat <<EOF
## Summary
First consumer migration of PR-A's theme rollout. Home tab now uses \`useThemedStyles\` + a hoisted factory; its SafeAreaView root, header bar, hairline border, and Eru wordmark colors all flip when the user toggles the theme.

## Verified on device
- [x] Home header surface flips white ↔ black on toggle
- [x] Wordmark color flips legible in both modes
- [x] System dark-mode preference change auto-flips when 'Use system' is selected
- [x] Selected mode persists across app restart
- [x] Composed children (StoryRow, PostCard, etc.) still render in light mode — intermediate state, expected, A.4 will resolve

## Migration pattern established
The hoisted-factory + useThemedStyles approach is the canonical migration shape PR-A.2 through PR-A.4 will follow:
\`\`\`typescript
// Above component:
const stylesFactory = (c: ThemeColors) => ({ /* style spec */ });

// Inside component:
const styles = useThemedStyles(stylesFactory);
\`\`\`

Reasons:
- Stable factory ref → \`useMemo\` hits → no \`StyleSheet.create\` per render
- Cleanly typed via \`(c: ThemeColors)\` parameter (better than \`(c: any)\`)
- Same syntactic shape as the legacy static \`StyleSheet.create\` — easy to migrate at scale

## Test plan
- [x] tsc clean
- [x] Tests pass (572/572)
- [x] EAS preview APK built + installed
- [x] Device verification per the plan checklist

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review checklist

1. **Spec coverage:** PR-A.1 from the spec → "Migrate Home tab as flagship. Verify dark mode flips." ✓ Both addressed.
2. **Placeholder scan:** No TBDs. Every step has the actual command/code. ✓
3. **Type consistency:** `ThemeColors` imported via `import type` since it's only used as a parameter annotation. `as const` casts are necessary for RN style literal-type unions. ✓
4. **Pattern documentation:** The commit message + PR description both call out that this is the canonical pattern for A.2-A.4. ✓

---

## What could go wrong

| Symptom | Cause | Fix |
|---|---|---|
| `useMemo` recomputes every render even though factory is hoisted | Something else in the deps array is unstable | Check `colors` reference: `lightColors` and `darkColors` are module-level constants, so `===` comparison should hold. If it's churning, the issue is in `useTheme` itself, not A.1. |
| Header surface is white in dark mode | Forgot to swap a hardcoded `'#fff'` to a token | Re-grep the file for `#fff` and `'#FFFFFF'` — should be zero matches after migration |
| `logo` color unreadable in dark | `g800` in dark mode is `#DBDBDB` (light grey) — should still be readable on `card: #000` | If unreadable, the dark `g800` value is genuinely wrong. Update `themeColors.ts` darkColors. Don't paper over with a different token in this PR. |
| EAS build fails because the OTA channel changed | PR #3 (OTA setup) isn't merged yet OR was merged after the build kicked off | Check `eas.json` for `channel: "preview"` on the preview profile — it should be there from PR #3. If PR #3 isn't merged, this PR's build still works (no OTA needed) but won't be OTA-capable. |
| Dark mode looks fine but composed children (PostCard etc.) clash visually | Expected — those aren't migrated yet | Mention in PR description; user accepts intermediate state. |

---

## After this plan completes

The next plan (PR-A.2) will migrate auth + tab screens (12 files) using the same `stylesFactory + useThemedStyles` pattern this PR establishes. PR-A.2 plan will reuse this template's task structure but enumerate per-file deltas instead of detailing the migration mechanics each time.
