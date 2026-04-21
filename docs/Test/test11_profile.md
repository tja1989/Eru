# Test 11 — Profile

**Route:** `/(tabs)/profile`
**Mobile source:** `apps/mobile/app/(tabs)/profile.tsx` (+ `HighlightsRow.tsx`, `MediaGrid.tsx`, `TierBadge.tsx`, `CreatorScoreCard.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 853-1000
**Screenshot:** `docs/pwa-screenshots/11-profile.png`

## Visual parity

### Header bar
- [ ] Username `@{user.username}` + blue ✓ verified (if isVerified) + small ▾ dropdown arrow (left).
- [ ] Right cluster: ➕ add-highlight icon + ≡ hamburger (settings).

### Avatar + stats
- [ ] Row with avatar (large, 88px) + 3 stats columns:
  - [ ] Posts count (centre-aligned under number, 16px label g700, 22px/800 g900 number).
  - [ ] Followers count.
  - [ ] Following count.
- [ ] Avatar has **tier ring** around it: 2-3px border, color from `tierColors[user.tier]`.
- [ ] For Influencer tier: orange ring.

### Bio block
- [ ] Display name (15px/700 g900).
- [ ] Bio text (14px g700 line-height 20).
- [ ] `Creator on Eru since {month} {year}` suffix (13px g500).

### Tier / score chips
- [ ] Row of small chips below bio:
  - [ ] Tier chip: `🔥 Influencer` (orange bg rgba, 12px/700 orange).
  - [ ] Points balance chip: `🪙 {balance} pts` (green).
  - [ ] Streak chip: `🔥 {streak}d streak` (orange).
  - [ ] Optional `✍️ Creator` chip if user has creator-earnings > 0.

### Action row
- [ ] Two buttons side-by-side:
  - [ ] `Edit Profile` (navy bg, white 14px/700, flex 1).
  - [ ] `✨ Create` (gradient orange-pink or solid orange, white 14px/700, flex 1).

### Highlights row
- [ ] `<HighlightsRow />` below action row (horizontal scroll of highlight circles).
- [ ] Each highlight: circle 64-72 with emoji on colored bg + title below (10-11px g700, centre, max-width).
- [ ] `+` tile at end → opens `HighlightEditor` modal.

### Grid tabs
- [ ] Row of 5 icon tabs, no labels, g200 top border:
  1. `⊞` Posts (testID `grid-tab-posts`)
  2. `▶` Reels (testID `grid-tab-reels`)
  3. `✍️` My Creations (testID `grid-tab-created`)
  4. `🔖` Saved (testID `grid-tab-saved`)
  5. `👤` Tagged (testID `grid-tab-tagged`)
- [ ] Active tab: underlined (bottom border 2px orange) or bolded icon.
- [ ] Others: g500 icon color.

### Grid content
- [ ] `<MediaGrid items={gridItems} />` below tabs.
- [ ] 3-column grid, no gap (PWA style), square tiles.
- [ ] Each tile: thumbnail + optional overlays:
  - `▶` play triangle for video/reel.
  - `◫` carousel icon for carousel posts.
  - `LIVE` chip for live stories.
- [ ] Empty state: `No posts yet` / `No saved items` / `No tagged posts` per tab.

## Functional behaviour

### On mount
- [ ] Fires `userService.getProfile(userId)` → `GET /users/{id}/profile`.
- [ ] Fires `userService.getContent(userId, 'posts')` → `GET /users/{id}/content?tab=posts`.
- [ ] Fires `highlightsService.list(userId)`.
- [ ] Fires `getOrCreateWeeklySnapshot` to compute score delta.

### Grid tab switch
- [ ] Tap each grid tab → re-fires `userService.getContent(userId, tabKey)`:
  - posts → filters by content type=post, user's content.
  - reels → content type=reel.
  - created → all user's content (any type, any status).
  - saved → content saved via interactions.
  - tagged → content where user is tagged.
- [ ] Empty states per tab.

### Avatar tap
- [ ] No action OR opens avatar viewer (optional).

### Edit Profile tap
- [ ] `router.push('/edit-profile')`.

### ✨ Create tap
- [ ] `router.push('/(tabs)/create')`.

### Highlight tap
- [ ] Opens `<HighlightViewer />` modal with items.

### Highlight + tile tap
- [ ] Opens `<HighlightEditor />` modal for new highlight.

### Header ≡ (hamburger)
- [ ] `router.push('/settings')`.

### Username ▾ (dropdown)
- [ ] Opens account switcher / logout menu (optional).

### Pull-to-refresh
- [ ] Re-runs profile + content + highlights fetches.

## Edge cases

- [ ] Profile API fails → falls back to authStore user (name/username/tier).
- [ ] User with 0 posts → grid empty state.
- [ ] Saved tab for unauthenticated viewer (future: public profile view) → shows `Log in to see saved`.
- [ ] Tagged tab empty → `No posts tagged you yet.`
- [ ] Creator score 0 or null → tier chip hidden or shows `Explorer`.
- [ ] Long bio (5+ lines) → wraps; no truncation by default.
- [ ] Malayalam/Hindi in bio → renders correctly.
- [ ] User at champion tier → gold ring on avatar.

## Notes for Playwright web run

- All visual + functional items testable.
- Media grid images may be placeholders on web if videos; verify overlay icons render.
- HighlightEditor modal will open; verify it appears and closes on cancel.
- Pull-to-refresh: skip gesture on web.
