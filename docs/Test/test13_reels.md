# Test 13 — Reels

**Route:** `/(tabs)/reels`
**Mobile source:** `apps/mobile/app/(tabs)/reels.tsx` (+ `FollowButton.tsx`, `ShareButton.tsx`, `useReelHeartbeat.ts`, `usePlayerMetrics.ts`, `useReelPreloader.ts`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 1101-1199
**Screenshot:** `docs/pwa-screenshots/13-reels.png`

## Visual parity

### Header tabs
- [ ] Row at top: `Following` | `For You` (default active, orange underline) | `Local`.
- [ ] Left of tabs: `Reels` wordmark (18px/800 white).
- [ ] Right: camera icon (open create/camera flow).

### Reel viewport
- [ ] Full screen, each reel fills `SCREEN_HEIGHT - 90` px.
- [ ] Poster image fills background while video loads.
- [ ] `<VideoView>` plays on top when `isActive`, with contentFit cover, no native controls.

### Points indicator
- [ ] Top-right: `🪙 +{pointsPreview} pts/min` chip (green, semi-transparent bg).
- [ ] Only shown when `pointsPreview != null`.

### Right-side action column
- [ ] Vertical stack of action buttons:
  - [ ] ❤️/🤍 Like (26px), count below (12px white).
  - [ ] 👎 Dislike (white default; red when disliked).
  - [ ] 🔖 Save (white default; blue when saved).
  - [ ] 💬 Comment → navigates to post detail.
  - [ ] 📤 Share (ShareButton).
- [ ] Each with `accessibilityLabel`.

### Bottom overlay: creator info + caption
- [ ] Avatar 32-40 + username + `Follow`/`Following` chip + `CREATOR` badge (if verified) + caption + audio-attribution line.
- [ ] Hashtags inline blue.
- [ ] Gradient bg (black bottom → transparent top).

### Tab bar
- [ ] Standard `(tabs)` bottom bar; Reels tab active.

## Functional behaviour

### On mount
- [ ] Fires `GET /api/v1/reels?tab=foryou` (default tab).
- [ ] `FlatList` vertical-snap paging.

### Scroll up/down
- [ ] FlatList snaps to each reel viewport.
- [ ] Active reel index changes → previous pauses, next plays.
- [ ] Preloader warms neighbouring reels (N+1, N-1) per `useReelPreloader`.

### Tab switch (Following / For You / Local)
- [ ] Fires new fetch with tab param.
- [ ] Scroll resets to top.

### Like
- [ ] Optimistic flip + POST `/api/v1/posts/{id}/like`.
- [ ] Fires `earn('like', reelId)`.
- [ ] 409 → stay liked.

### Dislike
- [ ] POST `/api/v1/posts/{id}/dislike`, optimistic flip, 409 kept.

### Save
- [ ] POST `/api/v1/posts/{id}/save`, optimistic, 409 kept.

### Follow button
- [ ] `FollowButton` component: wires to `userService.follow` / `userService.unfollow`.
- [ ] Optimistic.

### Comment button
- [ ] Tap 💬 → `router.push('/post/[id]')`.

### Share button
- [ ] Opens native share sheet with caption + reel link.
- [ ] On share complete → `earn('share', reelId)`.

### 30s heartbeat (P8 F3)
- [ ] Every 30s while reel is `isActive` AND `AppState === 'active'`:
  - [ ] Fires `earn('reel_watch', reelId, {watchTimeSeconds: 30})`.
- [ ] Pauses firing when app backgrounds; resumes on foreground.
- [ ] Server enforces daily cap on reel_watch; over-reports silently dropped.

### Player metrics (`usePlayerMetrics`)
- [ ] On first `readyToPlay`: fires `analytics.emit('ttff', {reelId, durationMs})`.
- [ ] On mid-play `loading` (buffering): fires `rebuffer_start`.
- [ ] On next `readyToPlay`: fires `rebuffer_end`.

### Camera icon tap (top-right)
- [ ] Opens create flow with video preset.

## Edge cases

- [ ] Reel has no video URL → poster-only; autoplay no-op; UI still interactive.
- [ ] Video fails to load → poster remains; rebuffer events may fire.
- [ ] Following tab for a user with 0 follows → `Follow more creators to see their reels` empty state.
- [ ] Tapping comment while reel is mid-play → video pauses on navigate.
- [ ] Fast-scrolling past 10 reels → all pause; only active plays; memory OK.
- [ ] Network dies mid-reel → rebuffer_start fires; when net returns, rebuffer_end fires.
- [ ] User background & foreground rapidly → heartbeat doesn't double-fire.

## Notes for Playwright web run

- **`expo-video`'s VideoView has limited web support.** The reel viewer may render but video may not play; poster images should still display.
- Items for video playback and heartbeat may be `⚠ skip-on-web`.
- Visual parity for static UI (tabs, action column, bottom overlay) is still testable on web.
- Verify `browser_take_screenshot` captures the Reels layout correctly.
