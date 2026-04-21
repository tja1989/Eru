# Test 20 — Leaderboard

**Route:** `/leaderboard`
**Mobile source:** `apps/mobile/app/leaderboard/index.tsx` (+ `LeaderboardScopeTabs.tsx`, `LeaderboardPodium.tsx`, `WeeklyQuestsCard.tsx`, `CreatorScoreCard.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 3412-3548
**Screenshot:** `docs/pwa-screenshots/20-leaderboard.png`

## Visual parity

### Header
- [ ] Back `←`, title `Leaderboard` (17px/700 g900 centre), right 30-wide spacer.
- [ ] 0.5 bottom border g100.

### Scope tabs
- [ ] `<LeaderboardScopeTabs />` — horizontal pills:
  1. `My Pincode` (testID `scope-tab-pincode`)
  2. `Kerala State` (testID `scope-tab-state`)
  3. `All India` (testID `scope-tab-national`)
  4. `Friends` (testID `scope-tab-friends`)
- [ ] Each: 14 horizontal / 8 vertical padding, 999 radius.
- [ ] Inactive: `#F1F1F1` bg, g500 13px/600.
- [ ] Active: orange `#E8792B` bg, white.
- [ ] **CRITICAL:** Outer ScrollView has `flexGrow: 0` so tabs don't stretch vertically. Each pill should be ≤ 40px tall.

### Season banner
- [ ] Navy solid bg card, 16 radius, padding 16.
- [ ] 🏆 emoji (28px) + info column:
  - [ ] Season name (e.g., `Q2 2026 — Monsoon Champions`) 16-18px/800 white.
  - [ ] Days remaining `{daysLeft} days remaining` (rgba white 70%, 12px, 2 top margin).
- [ ] Optional theme (rgba white 60%, italic).

### Season prize tiles (3-col, below banner)
- [ ] Row of 3 tiles, 8 gap, 16 horizontal margin, 16 top margin:
  - [ ] **GRAND** (orange-tint bg rgba 8%, rgba 25% border): 📱 + `iPhone 16` + `Rank #1`.
  - [ ] **RUNNER-UP** (silver-tint rgba 15%): 💻 + `MacBook Air` + `Ranks #2-3`.
  - [ ] **WEEKLY** (blue-tint rgba 8%): 💳 + `₹200 card` + `Top 10`.
- [ ] Each tile: label (9px/800 letter-spacing 1 g500) + emoji (28px) + name (12px/700 g800) + rank (10px g500), centre-aligned.

### My rank card
- [ ] Card below prize tiles (white bg, 16 radius, padding).
- [ ] 3-col stat row:
  - [ ] `Your Rank` label + `#{rank}` big number.
  - [ ] Divider.
  - [ ] `{pointsThisWeek}` + `This week`.
  - [ ] Divider.
  - [ ] `{emoji} {tier}` + `Tier`.

### Podium (top 3)
- [ ] `<LeaderboardPodium top3={...} />`:
  - [ ] 3 columns: 2nd (left) | 1st (centre, tallest) | 3rd (right).
  - [ ] Heights: 1st=120, 2nd=90, 3rd=68.
  - [ ] Column widths: side=96, centre=112.
  - [ ] Each bar:
    - [ ] Medal emoji (🥇/🥈/🥉, 26px).
    - [ ] **Crown 👑** above 1st-place medal (24px).
    - [ ] Username (12px/700 g800, centre, 90 max-width).
    - [ ] Bar with orange `#E8792B` bg, radius top-8, flex 1 centre:
      - [ ] Points number (white 13px/800).
  - [ ] Align bottom (heights differ → "podium" effect).
  - [ ] testIDs `podium-rank-1`, `podium-rank-2`, `podium-rank-3`; inner bar testIDs `podium-rank-N-bar`.

### Top Creators list
- [ ] Section title `Top Creators` (17px/700 g900).
- [ ] Each leader row:
  - [ ] Rank col: medal 🥇/🥈/🥉 for top 3, else `#{rank}`.
  - [ ] Avatar.
  - [ ] Name + tier pill (e.g., `👑 Champion`) + `{streakDays}d streak` sub.
  - [ ] Right-aligned `{pointsThisWeek.toLocaleString()}` (15px/700 g900).
- [ ] Top 3 rows have gold-tint bg.

### Weekly Quests card
- [ ] `<WeeklyQuestsCard />` below leaders:
  - [ ] Title `Weekly Quests`.
  - [ ] 5 quests, each a row with:
    - [ ] Quest title + description.
    - [ ] Progress bar (0-100%).
    - [ ] Target copy: `{current}/{target}`.
    - [ ] Reward `+{rewardPoints} pts`.
  - [ ] Completion bonus footer: `Complete all 5 → +100 pts bonus`.

### Daily Spin tile
- [ ] Centred tile: `Daily Spin` title + big `SPIN NOW!` button.
- [ ] Tap → `router.push('/spin')`.

### Badges grid
- [ ] Title `Badges ({N}/12)` — N = unlocked count.
- [ ] 3-col grid of badge icons (approx 12 cells); unlocked = full color, locked = gray + 40% opacity + padlock overlay.
- [ ] Tap tile → shows badge detail modal with name + description + unlock-at criteria.

## Functional behaviour

### On mount
- [ ] `loadAll()` fires in parallel:
  - `leaderboardService.getCurrentSeason()` → season info.
  - `leaderboardService.getMyRank()` → my rank for current scope.
  - `leaderboardService.getLeaderboard(scope)` → leaders list.

### Scope tab switch
- [ ] Tap scope tab → updates `scope` state → re-runs `loadAll()`.

### Pull-to-refresh
- [ ] `handleRefresh()` → re-runs `loadAll()`.

### Podium avatar/name tap
- [ ] Optional navigate to user profile (if wired).

### Spin tile tap
- [ ] `router.push('/spin')`.

### Badge tile tap
- [ ] Opens badge detail.

### Back tap
- [ ] `router.back()`.

## Edge cases

- [ ] Season API failure → banner shows `Current Season` placeholder; no crash.
- [ ] Season with 0 days remaining → shows "Season ending" or similar.
- [ ] User not in top 10 → `Your Rank #{N}` shows actual rank; still visible above podium.
- [ ] Fewer than 3 leaders → podium renders only available ranks; empty spots hidden.
- [ ] Friends scope with 0 follows → empty state `Follow creators to see them here`.
- [ ] API 401 → interceptor.
- [ ] Week rollover: pointsThisWeek resets at UTC boundary (verifiable via seed).

## Notes for Playwright web run

- All items testable on web.
- **Previously broken**: scope tabs rendered as giant vertical capsules — fixed by adding `flexGrow: 0` to outer ScrollView. Verify this explicitly: snap each tab, assert height ≤ 40px.
- Prize tiles: verify 3 columns render without overflow at 390px width.
- Podium: verify heights 120/90/68 via `browser_evaluate` reading computed height on `podium-rank-N-bar`.
- Crown 👑 visible only above rank 1.
