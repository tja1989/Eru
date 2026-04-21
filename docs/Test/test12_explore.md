# Test 12 — Explore

**Route:** `/(tabs)/explore`
**Mobile source:** `apps/mobile/app/(tabs)/explore.tsx` (+ `MediaGrid.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 1002-1099
**Screenshot:** `docs/pwa-screenshots/12-explore.png`

## Visual parity

### Header / search
- [ ] Top search input: `🔍 Search` placeholder, g100 bg, 12 padding, 20 radius, full-width minus margin.
- [ ] Text input 14px g800, focus brings keyboard.

### Category pills row
- [ ] Horizontal scroll of category pills, 8px gap, 12 padding horizontal:
  1. `For You` (all, active default)
  2. `🍔 Food`
  3. `✈️ Travel`
  4. `💻 Tech`
  5. `💪 Fitness`
  6. `🎬 Film`
  7. `🎨 Art`
  8. `📍 Local`
- [ ] Each pill: 1px g300 border, 14 horizontal / 6 vertical padding, 999 radius.
- [ ] Active: g900 bg, white 12px/600 label.
- [ ] Inactive: white bg, g700 12px/600 label.

### Masonry grid
- [ ] 3-column masonry with variable row heights, tight gap (2-4px).
- [ ] Each tile:
  - [ ] Thumbnail image or gradient bg with emoji.
  - [ ] Overlays (per item type):
    - [ ] PWA has these badge states (verify mapping in mobile):
      - `▶ Reel` for reel items.
      - `LIVE` red chip for live stream.
      - `Ad` small badge for sponsored.
      - `🪙 +N` bottom-right for pts-earnable items.
      - Carousel count / chevron for multi-image.
- [ ] Some items span 2 rows (height 2× normal) per PWA — optional enhancement.

### Pull-to-refresh
- [ ] Available via RefreshControl.

## Functional behaviour

### On mount / focus
- [ ] `useFocusEffect` triggers `loadExplore(category)`.
- [ ] Fires `GET /api/v1/explore?category={cat}`.

### Category tap
- [ ] Sets local `category` state.
- [ ] Re-fires `exploreService.getExplore(cat)`.

### Search input submit
- [ ] Fires `exploreService.search(query)` → `GET /api/v1/search?q={q}`.
- [ ] Populates items.

### Tile tap
- [ ] Photo/UGC/sponsored → `router.push('/post/[id]')`.
- [ ] Reel → `router.push('/(tabs)/reels?reelId={id}')`.

### Pull-to-refresh
- [ ] Re-runs `loadExplore(category)`.

## Edge cases

- [ ] Empty category → `No posts yet` empty state.
- [ ] Search with 0 results → `No matches` empty state.
- [ ] Search with short query (< 2 chars) → ignored or empty.
- [ ] 401 on fetch → interceptor.
- [ ] Very small thumbnail URLs → fallback gradient or placeholder.
- [ ] Mix of Ad + Live + Reel in same page → all badges render without clipping.

## Notes for Playwright web run

- Masonry grid renders correctly on web via `MediaGrid` (verify layout).
- Tile tap via `browser_click` with ref from snapshot.
- Search submits via `browser_press_key('Enter')` after fill.
