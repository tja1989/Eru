# Test 18 — My Content

**Route:** `/my-content`
**Mobile source:** `apps/mobile/app/my-content/index.tsx` (+ `MyContentStatsBar.tsx`, `CreatorEarningsCard.tsx`, `CreatorScoreCard.tsx`, `CreatorScoreTransparencyPanel.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 2852-2960
**Screenshot:** `docs/pwa-screenshots/18-my-content.png`

## Visual parity

### Header
- [ ] Back `←`, title `My Content` (16px/700 g900), right spacer.

### Stats bar
- [ ] `<MyContentStatsBar />` — 4-metric row:
  - [ ] `Published {N}` (green).
  - [ ] `In Review {N}` (gold).
  - [ ] `Declined {N}` (red).
  - [ ] `Total Likes {N}` (navy).
- [ ] Labels 12px g500, numbers 20-22px/800 coloured.

### Creator earnings card
- [ ] `<CreatorEarningsCard />` — navy or gradient bg, shows monthly earnings, post approvals, engagement bonus, trending bonus break-down.

### Creator Score card
- [ ] `<CreatorScoreCard score={...} deltaThisWeek={...} />`:
  - [ ] Ring progress (96×96), navy stroke, progress proportional.
  - [ ] Centre text: `{score}` (26px/800 g900) + `/100` (13px/600 g500).
  - [ ] Delta chip below: `⬆ +3 this week` (green) or `⬇ -2 this week` (red) based on sign.

### Creator Score transparency panel
- [ ] `<CreatorScoreTransparencyPanel />` — panel with:
  - [ ] Heading `How your score changes` (13px/700 g800).
  - [ ] Like ratio row: `Like ratio` (11px/600 g500) + `{pct}%` (16px/800 green).
  - [ ] Ratio track/fill bar (6px, green fill, 999 radius).
  - [ ] Ratio hint: `{likes} likes · {dislikes} dislikes` (10px g500).
  - [ ] Rules list (5 rows):
    - `+0.1 per like` (green)
    - `+0.3 per share` (green)
    - `+5 per trending post` (green)
    - `-0.5 per dislike` (red)
    - `-5 per report` (red)
  - [ ] Warning banner when `score < 40`: `⚠️ Your score is below the 40 threshold — reach is temporarily reduced. Lift it by earning more likes and avoiding reports.` (red-tint card).

### Filter pills
- [ ] Horizontal scroll of filter pills with counts:
  1. `All ({total})` — testID `filter-all`
  2. `Published ({N})`
  3. `Pending ({N})`
  4. `Declined ({N})`
- [ ] Each: 14 horizontal / 6 vertical padding, 999 radius, 1px g300 border.
- [ ] Active: g800 bg, white 12px/600.

### Content list rows
- [ ] Each content card:
  - [ ] Status dot (green/gold/red) + status label + type badge `POST`/`REEL`/`POLL`/`THREAD` (right).
  - [ ] Title (15px/700 g800, 2 lines max).
  - [ ] Date below (11px g400).
  - [ ] For Published: stats row `👁 views` / `👍 likes` / `👎 dislikes` / `💬 comments` (all with numbers).
  - [ ] For Declined: reason box — label `Reason:` + text (12px red or g500).
  - [ ] Action row for Declined:
    - [ ] `Resubmit` (orange bg pill, flex 1).
    - [ ] `Appeal` (outline, flex 1).

## Functional behaviour

### On mount
- [ ] Fires `userService.getContent(userId, 'created')` → returns all user's content incl pending/declined.
- [ ] Fires `getOrCreateWeeklySnapshot(currentScore)` → weekly score delta.

### Filter tap
- [ ] Pill tap → local `filter` state changes; list re-filters by `item.moderationStatus`.

### Resubmit tap (on a declined row)
- [ ] Confirm alert.
- [ ] POST `/content/{id}/resubmit` (if API exists) → on success, content moves to `pending`.
- [ ] Reload list.

### Appeal tap
- [ ] Opens an appeal form or routes to support.
- [ ] POST `/content/{id}/appeal` (if implemented).

### Content card tap (generic)
- [ ] Tap → `router.push('/post/{id}')` for post/poll, `/(tabs)/reels?reelId={id}` for reel.

### Pull-to-refresh
- [ ] Re-runs `loadContent()` + snapshot.

## Edge cases

- [ ] 0 content → `📋 No content yet` empty state with variants per filter (`No published content yet` etc).
- [ ] Declined content without `declineReason` → reason box shows `No reason provided` (graceful fallback).
- [ ] Creator score < 40 → warning banner visible + yellow/red accent.
- [ ] `scoreDelta=0` → delta chip hidden (no arrow).
- [ ] 401 → interceptor.

## Notes for Playwright web run

- All items testable on web.
- Transparency panel: verify rule copy character-for-character via `browser_evaluate` grabbing text.
- Engagement chip counts: verify counts match seeded content.
