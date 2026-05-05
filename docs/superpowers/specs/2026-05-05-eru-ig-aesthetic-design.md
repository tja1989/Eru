# Eru with Instagram Aesthetics — Design Spec

**Author:** Claude (with TJ)
**Date:** 2026-05-05
**Status:** Draft — awaiting TJ review
**Reference material:** `/InstagramComparisonScreenshots/` (7 dark-mode IG screenshots: feed, reels, inbox, explore, profile, settings)
**Replaces:** the Apr-19 IG-rework handoff that was reverted in PR #4

## The contract

> **Features = Eru. Look = Instagram. Never delete a feature to make it look more like IG.**

Every Eru feature has to find a home in the new design — possibly restyled, possibly relocated, but **never removed**. The previous handoff broke this rule and is the reason we're here.

## Big-picture analogy

Think of this as **redecorating a restaurant, not changing the menu**. The kitchen still serves the same dishes (every Eru feature stays). The dining room gets repainted in IG's visual language — black walls, white plates, minimalist menus, single-color accent tiles. A first-time visitor walks in and says "this looks like Instagram"; a regular still finds every dish they came for.

## Goals

1. Match Instagram's *visual language* (palette, typography, icon library, spacing, dark-mode-first behavior).
2. Preserve every Eru feature: coin earnings, streaks, tiers, Creator Score, UGC verification, dislike, sponsored posts, polls, threads, business tagging, points-on-view, etc.
3. Support both **light and dark mode** following the system preference, with a manual override in Settings.
4. Use real icon fonts (`@expo/vector-icons` / Ionicons), not Unicode glyphs.
5. Solve the existing `user_<phone>` username privacy issue with a one-time picker.

## Non-goals

- Re-architecting state management, services, navigation, or API contracts.
- Adding IG-specific features that don't exist in Eru (Notes, Threads cross-post, Add Banners, Professional dashboard, Meta AI search). These reference UI elements are *not* ported.
- Pixel-perfect cloning of IG. We match the *language*, not every layout.

## Visual language reference (from /InstagramComparisonScreenshots)

| Element | Light mode | Dark mode | Notes |
|---|---|---|---|
| Surface (bg) | `#FFFFFF` | `#000000` | True black in dark, true white in light |
| Card / row separator | hairline `#DBDBDB` | hairline `#262626` | NOT a card background — IG separates with borders only |
| Primary text | `#000000` | `#FFFFFF` | |
| Secondary text | `#737373` | `#A8A8A8` | timestamps, "Posted 2h ago" |
| Tertiary text | `#A8A8A8` | `#737373` | counts, view counts |
| Verified blue | `#0095F6` | `#0095F6` | unchanged across modes |
| Like red | `#FF3040` | `#FF3040` | unchanged |
| Story ring gradient | `#F58529 → #DD2A7B → #8134AF` | same | IG's signature ring |
| Active tab icon | `#000000` | `#FFFFFF` | |
| Inactive tab icon | `#737373` | `#A8A8A8` | |

## Eru-specific tokens (preserved across both modes)

These are the colors that make Eru feel like Eru and **must not be IG-grayscaled**.

| Token | Light | Dark | Used on |
|---|---|---|---|
| Coin orange | `#E8792B` | `#FF9148` | Coin pill, +30 earn badges. Brighter in dark for contrast |
| Streak fire | `#FF6B35` | `#FF8A5C` | Streak counter, 🔥 emoji |
| Coin background tint | `#FFE4D2` | `rgba(232, 121, 43, 0.18)` | Pill background |
| Tier — Champion | `#D97706` (gold) | `#F59E0B` | Champion ring on avatar |
| Tier — Influencer | `#737373` | `#A8A8A8` | subtle |
| Tier — Engager | `#A8A8A8` | `#737373` | almost invisible |
| Tier — Explorer | none | none | no ring |

These tokens get their own keys (`colors.coinOrange`, `colors.streakFire`, etc.) so the rewards loop is visually consistent across all Eru-specific surfaces (Wallet, Redeem, Leaderboard, MyContent).

## Typography

- **Default**: system font (San Francisco on iOS, Roboto on Android) — no custom font shipping.
- **"Eru" wordmark**: italic Georgia (the kept brand mark). Same on both modes.
- **Caption font weight**: 400 regular for body, 600 semibold for usernames inline, 700 bold for counts.

## Icon library

**Decision: `@expo/vector-icons` (Ionicons set)**.

Already installed via Expo SDK. Ships with every IG-equivalent icon needed:

| Eru need | Ionicon |
|---|---|
| Tab home | `home-outline` (inactive) / `home` (active) |
| Tab search | `search-outline` / `search` |
| Tab create (Eru-specific center button) | `add-circle-outline` / `add-circle` (filled with coin-orange ring — Eru signature) |
| Tab reels | `play-outline` / `play` |
| Tab profile | `person-outline` / `person` (or actual avatar when signed in) |
| Heart (like) | `heart-outline` / `heart` |
| Dislike (Eru-specific) | `thumbs-down-outline` / `thumbs-down` |
| Comment | `chatbubble-outline` |
| Share / DM | `paper-plane-outline` |
| Save | `bookmark-outline` / `bookmark` |
| Notification bell | `heart-outline` ← per IG, OR `notifications-outline`. Decision: heart (matches IG, Eru users learn IG conventions) |
| Coin | `🪙` (emoji) — works cross-platform, Eru-specific, distinct |
| Streak | `🔥` (emoji) — same |
| Story add | `add-circle` (cyan) inside the avatar |
| Edit / pencil | `create-outline` |
| Three dots | `ellipsis-horizontal` |
| Back | `chevron-back` |

Lucide-react-native is an alternative but adds 1MB to bundle size. Stick with vector-icons.

## Theme switching

```
                                 ┌─────────────────────────────┐
                                 │  Settings → Appearance      │
                                 │  ○ Use system  (default)    │
                                 │  ○ Light                    │
                                 │  ○ Dark                     │
                                 └─────────────────────────────┘
                                              │
                                              ▼
                            themeStore (Zustand, persisted)
                                              │
                ┌─────────────────────────────┼─────────────────────────────┐
                ▼                             ▼                             ▼
        useColorScheme()                  override='light'               override='dark'
        (system pref)                     → 'light'                      → 'dark'
                │                             │                             │
                └────────────────┬────────────┴─────────────┬───────────────┘
                                 ▼                          ▼
                           current = 'light' OR 'dark'
                                 │
                                 ▼
                       ThemeProvider (React context)
                                 │
                                 ▼
                  every screen reads via useTheme()
```

**Implementation:**

- `apps/mobile/stores/themeStore.ts` — Zustand store, AsyncStorage-persisted, with `mode: 'system' | 'light' | 'dark'`.
- `apps/mobile/constants/theme.ts` — exports `lightColors`, `darkColors`, helper `useTheme()` returning the current palette based on store + system.
- Existing imports of `colors.*` continue to work, but they now resolve through the hook (consumers swap `import { colors } from '@/constants/theme'` for `const { colors } = useTheme()` — mechanical change).
- Default = system. New users on a phone in dark mode see Eru in dark.

## Screen-by-screen plan

### A. Auth (welcome, login, OTP, personalize, tutorial)

- White (light) or pure black (dark), centered Eru wordmark.
- Single phone input field, blue primary CTA "Continue", legal text below.
- 4-step progress dots stay (existing onboarding).
- Personalize / Tutorial: keep existing functionality (interests, language, welcome bonus claim) — restyle into IG sectioned-list aesthetic.
- **Eru feature kept:** welcome-bonus banner with coin animation on tutorial completion.

### B. Home / Feed (`(tabs)/index.tsx`)

```
┌─ Header ──────────────────────────────────────┐
│  Eru                  🪙 375 🔥1   ♡  ✈      │
│  ───────────────────────────────────────────  │
│  Story row (rings + LIVE badge)              │
│  ───────────────────────────────────────────  │
│  Post:                                        │
│    Avatar @user_xxx ✓ · 22h         ⋯       │
│    [USER CREATED] [APPROVED]   ← small chips │
│    ┌─────────────────────────┐              │
│    │   Square media          │              │
│    └─────────────────────────┘              │
│    ♥ 👎 💬 ✈              🔖    🪙+30      │
│    412 likes                                 │
│    @user_xxx caption text...                 │
│    View all 12 comments                      │
│    May 4                                     │
│  ───────────────────────────────────────────  │
└────────────────────────────────────────────────┘
```

**Eru features kept on PostCard:**
- USER CREATED / SPONSORED / APPROVED chips: small (10px text), 4px padding, `colors.g100`/`colors.g700` background (light/dark), `colors.g700`/`colors.g300` text, 1px border in `colors.g200`/`colors.g600`. Sit on a single row below the username, max 2 chips visible.
- 🪙+30 coin pill: right-aligned in action row (after the heart/dislike/comment/share group, before the bookmark). Background `coinSoft`, text `coinOrange`, font 12 semibold, padding 4×8.
- Dislike button next to like (👎) — `thumbs-down-outline` Ionicon, between heart and comment in the action row.
- All existing dual-write logic, video viewability, points earning unchanged.

**Header decisions:**
- Eru wordmark left (italic Georgia)
- Coin pill `🪙 375 🔥1` center-right — small chip, coinSoft background
- ♡ heart for notifications (matches IG)
- ✈ paper plane for messages (matches IG)
- No bell icon — heart replaces it (IG convention)

### C. Reels (`(tabs)/reels.tsx`)

```
┌──────────────────────────────────────────────┐
│  +     Following  For You                    │
│                                          ↓   │
│                                      [♥ 412K]│
│                                      [💬 4K] │
│                                      [✈ 8K]  │
│                                      [🔖 28K]│
│        ┌─ Full-screen video ─┐       [⋯]    │
│        │                      │       [🪙+5/m]│ ← Eru
│        │                      │              │
│        │                      │              │
│        └──────────────────────┘              │
│  Avatar @creator [Follow]                    │
│  Caption text · ♪ Original audio             │
└──────────────────────────────────────────────┘
```

**Eru features kept:**
- 🪙+5/min indicator: small chip at the **bottom of the right-rail stack** (below 🔖 save), in `coinSoft` tint with `coinOrange` text — distinct enough to read as Eru, subtle enough not to overlay-clutter the video. Earn-on-watch is core to Eru.
- All existing heartbeat / view-event tracking unchanged

**IG patterns adopted:**
- Top: 2 text tabs (Following / For You) — your `Local` folds into For You ranking server-side
- Right rail: vertical action stack with counts (replaces the bottom-overlay action row)
- Bottom: creator + Follow + caption

### D. Explore (`(tabs)/explore.tsx`)

- Search bar at top (placeholder: "Search" — NOT "Search with Meta AI")
- 3-column grid with mixed aspect ratios (some 2x1, some 1x1)
- View count overlay on each tile (👁 2.7M style) — Eru already has `viewCount`, just style it like IG
- **Eru feature kept:** business / pincode-aware ranking (server-side; UI stays a flat grid)

### E. Create (`(tabs)/create.tsx`) — **CENTER TAB, KEPT**

You said keep this. Plan:
- Tab icon: `add-circle` filled with **coin-orange ring** — Eru's signature (IG dropped this center button, our keeping it is what makes Eru visually distinct).
- Screen layout: black/white IG chrome (header "New post", Cancel ✕ left, Next blue right).
- Body: existing 617-line creation flow unchanged — photo/video/poll/thread, business tagging, location, user tags, points preview, moderation notice.
- Wrapper change: just the chrome and the styling of subcomponents (typography, icons).

### F. Profile (`(tabs)/profile.tsx`)

```
┌──────────────────────────────────────────────┐
│  +     tjabraham3 ▼              ☰           │
│                                              │
│  ┌────┐  73     150     45                   │
│  │ 👤 │  posts  followers following          │
│  └────┘                                      │
│  T J Abraham                                 │
│  1280 lifetime points · Engager tier ✦       │
│  bio text here...                            │
│                                              │
│  [Edit profile] [Share profile]              │
│                                              │
│  ┌─ Creator Score card ──────────────────┐  │
│  │ 87 · Top 12% of creators              │  │
│  │ Like ratio 0.94 · ▶                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ⊞       👤                                  │ ← 2 tabs (IG default)
│  ──────                                      │
│  [posts grid]                                │
└──────────────────────────────────────────────┘
```

**Eru features kept (all visible on profile):**
- Tier indicator (text "Engager tier ✦" inline with bio)
- Lifetime points (subtle stat row above bio)
- Creator Score card (full-width row, IG-styled — black/white with hairline border)
- Reels mix into the Posts grid (per IG default), no separate Reels tab

**Removed permanently:**
- "+ Create" inline CTA — moved to center tab (where it always was, just decoration removed)
- Banners (Eru doesn't have)
- Professional dashboard card (Eru has its own Creator Score card serving the same purpose)

### G. Messages (`messages/index.tsx`)

Per the screenshot, IG inbox has filter pills, Notes, search, conversations. **All those exist in Eru, restore them:**

- Header: "← @username ▼" + ✏ edit icon
- Search bar
- Notes row (Your note + Map). Eru doesn't have Notes-feature → **omit Notes row entirely**
- Filter pills: All / Primary / Requests / General. Eru's filters were All / Business / Creators / Friends — **keep Eru's labels**, just style as pills
- Conversation rows: avatar, name, last message, time, unread dot

### H. Notifications (`notifications/index.tsx`)

- Time-bucketed list: Today / This week / This month / Earlier (matches IG)
- Each row: avatar + actor + verb + content thumbnail
- Per-notification CTA buttons preserved (Tap to accept proposal, Redeem now, etc.) — these are Eru-specific; restyle as small inline pill buttons in IG-blue

### I. Settings (`settings/index.tsx`)

This is the big one. IG's Settings has 10 sections; Eru has different content but the same sectioned pattern. Map:

| IG section | Eru equivalent (existing functionality preserved) |
|---|---|
| Your account | (skip — Eru has phone-only auth, no email/password) |
| **How you use Eru** | Saved · My creations · Liked · Recent · Wallet · Redeem · Leaderboard · Notifications |
| **Who can see your content** | Account privacy · Blocked · Hide story · Activity privacy |
| **How others can interact with you** | Messages · Tags and mentions · Comments |
| **What you see** | Interests · Languages · Pincodes · Content preferences |
| **Your account** | Personal information (name, bio, DOB, gender, profile picture) · Edit profile · Linked accounts |
| **Eru rewards** *(Eru-specific section)* | Tier · Lifetime points · Creator Score · Streak · Quests |
| **More info and support** | Help · About · Privacy Policy · Terms |
| **Login** | Add account (deferred) · Log out |
| Appearance *(NEW)* | System · Light · Dark (theme switching toggle) |
| Delete account *(Eru-specific)* | 30-day grace flow preserved |

### J. Wallet / Redeem / Leaderboard / MyContent / Stories

These are Eru-specific surfaces. Per "features = Eru, look = IG":
- Use IG-style dark/light surface treatment (black/white, hairline borders)
- KEEP the orange/coin/gold palette on these surfaces (rewards loop should *feel* warm)
- Apply Ionicons everywhere
- Apply IG typography (semibold usernames, regular body)

No layout reworks for these — visual touch-up only.

## Username migration plan

The handoff fix only affected NEW signups. Your existing user has `user_9895516616` because the row was created before the fix.

**Plan: One-time username picker on first launch after the next OTA update.**

- Add a flag `personalize.usernameMigrated` to user state (Zustand, server-synced).
- If user logs in AND `username.startsWith('user_')` AND length matches phone-pattern AND `!usernameMigrated` → redirect to a "Choose your username" screen ONCE.
- User picks something like `tj_abraham` → API patches the user row → flag set → never shown again.
- Existing UI: reuse the `UserTagPicker` style for entry; reuse `username` validation in `apps/api/src/utils/validators.ts`.
- Server-side adoption: the existing `/auth/register` "phone collision adopt" path already handles re-keying; we just add an explicit `PATCH /users/me/username` endpoint.

## Implementation rollout (3-4 small PRs)

```
PR-A: Theme system (~1 day)
  • themeStore (Zustand persisted) with mode: 'system' | 'light' | 'dark'
  • lightColors + darkColors palettes
  • useTheme() hook
  • All 60+ files using colors.* migrate to useTheme()
  • App auto-flips with system preference (default mode = 'system')
  • One minimal Settings row added for Appearance (System/Light/Dark) so users
    can override before PR-E does the full Settings rebuild
  • No other layout changes; only color tokens shift
  ─ Verify: app renders identically except palette flips when system flips

PR-B: Icon library swap (~half day)
  • Add @expo/vector-icons usage (already a dep)
  • Replace every Unicode glyph with Ionicons in tab bar, headers, action rows
  • Pure mechanical pass; ~20 files touched
  ─ Verify: icons look like IG, no rendering oddities on Android

PR-C: Layout pass — Home + PostCard + StoryRow (~1 day)
  • Header layout with coin pill + heart + plane
  • PostCard with all Eru chips + IG action row + dislike
  • StoryRow with proper gradient rings
  ─ Verify: home feed reads as IG with all Eru features visible

PR-D: Layout pass — Reels + Explore + Profile + Messages + Notifications (~1 day)
  • Reels right-rail vertical action stack (Eru +pts/min preserved)
  • Explore flat grid + view counts
  • Profile 2-tab layout + Creator Score card
  • Messages filter pills (Eru's labels)
  • Notifications time buckets

PR-E: Settings rebuild + Username migration (~1 day)
  • Sectioned settings list per the IG mapping above
  • Appearance section (light/dark/system)
  • One-time username picker for legacy user_<phone> handles
```

Each PR small enough to review on a phone screen. Each gets a fresh `eas build --profile preview` so you see it on Android before the next PR lands.

## What could go wrong

| Risk | Likelihood | Mitigation |
|---|---|---|
| `useTheme()` migration breaks dozens of files at once | Medium | Migrate via codemod (sed-style); tsc catches mismatches |
| Dark mode reveals contrast bugs in Eru-specific components (PointsBadge, PostCard chips) | High | Color-blind tester pass before each PR merge; bump coin-orange to brighter shade in dark |
| Ionicons doesn't have an Eru-specific icon we need | Low | Fallback to emoji or lucide-icons (1 file change) |
| Username migration prompt fires for users who already chose a custom username | Medium | Server-side check: only fire if username matches `/^user_\d{10}$/` AND `usernameMigrated=false` |
| Existing tests break (PostCard test still pinned to old badges + variants) | Certain | Rewrite test in PR-C; the test was already broken pre-revert |
| OTA update channel mismatch after PR-A merges to main | Low | PR #3 (OTA) gets merged BEFORE any layout PR; runtime fingerprint matches |
| iOS dark-mode auto-switch lag (system preference change → app rerender) | Low | Test in dev; useColorScheme is reactive natively |

## Test plan

Per PR:
1. `npx tsc --noEmit` clean in apps/mobile
2. `npm test` — only fix tests for files actually changed in that PR (rewrite PostCard tests in PR-C, not earlier)
3. `eas build --profile preview` for Android → install on device → walk the per-PR checklist below

### Per-PR device checklist

- **PR-A**: toggle phone between light/dark in iOS/Android system settings; Eru palette auto-flips. Settings → Appearance toggle works. Coin orange stays orange in both modes.
- **PR-B**: every tab icon, action icon, header icon is a clean Ionicon (not a Unicode glyph). No double-hearts. Save icon is a bookmark.
- **PR-C**: home feed reads as IG dark/light. Coin pill visible in header. PostCard shows USER CREATED + APPROVED chips. Action row has 5 distinct icons (♥ 👎 💬 ✈ 🔖) plus the coin pill. Story rings render gradient.
- **PR-D**: Reels right-rail with counts. Explore flat grid. Profile shows lifetime points + Creator Score. Messages filter pills work. Notifications time-bucketed.
- **PR-E**: Settings sectioned list maps every old setting. Appearance toggle. Username migration prompt fires once for `user_<10 digits>` accounts and never again.

## Open questions for TJ

These three I left for the spec review (small enough to decide quickly):

1. **Wallet / Leaderboard / MyContent surface treatment** — apply IG-grayscale (black/white surfaces) but keep coin-orange tokens, or full Eru warm-orange surfaces? Recommend: IG-grayscale surfaces, coin-orange accents only.
2. **DM list — Notes feature** — IG has it, Eru doesn't have a "Note" data model. Add it as a new feature, or omit the Notes row entirely? Recommend: omit (less is more, can add later).
3. **Coin pill in home header** — small chip with `🪙 375 🔥1` always visible (always-on rewards visibility), or hidden behind a wallet button (cleaner header)? Recommend: always visible — Eru's rewards loop is its identity.

## What this design DOES NOT do

- Re-architect API contracts — every endpoint stays the same.
- Change navigation structure beyond the profile tab count (3 → 2).
- Re-architect Zustand stores or services.
- Add new features beyond what already exists in Eru.
- Touch the Business Dashboard PWA — out of scope.

---

**Next step after TJ approves this spec:** I'll invoke the `superpowers:writing-plans` skill to break PR-A through PR-E into precise step-by-step implementation plans, then execute them one at a time with review checkpoints.
