# Test 5 — Home Feed

**Route:** `/(tabs)/index`
**Mobile source:** `apps/mobile/app/(tabs)/index.tsx` (+ `PostCard.tsx`, `StoryRow.tsx`, `PointsBadge.tsx`, `NotificationBell.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 485-693
**Screenshot:** `docs/pwa-screenshots/05-home.png`

## Visual parity

### App header bar
- [ ] 14px horizontal padding, 8px vertical, 0.5px bottom border g100, white bg.
- [ ] **Left:** "Eru" logo — 26px, Georgia italic, 800-weight, color g800.
- [ ] **Right cluster** (12px gap): PointsBadge + NotificationBell + ✉️ icon (22px).
- [ ] **PointsBadge:** rounded pill, rgba(16,185,129,0.1) bg, 0.5px rgba(16,185,129,0.2) border, 10px horizontal / 3px vertical padding.
  - [ ] 🪙 prefix (11px) + balance `.toLocaleString()` (12px/700/green) + `🔥{streak}` suffix (10px/700/orange).
- [ ] **NotificationBell:**
  - [ ] 🔔 (22px, no background).
  - [ ] Red unread ring only when `unreadCount > 0`: min-width 14px, 14px tall, 1.5px white border, radius 7px, positioned `top:-4 right:-4`.
  - [ ] Copy: numeric `1-9` or `9+` when > 9; hidden at 0.
  - [ ] a11yLabel `Open notifications`; inner `unread count {N}` label on the ring.

### Stories row
- [ ] Horizontal scroll, 12px padding, 14px gap, white bg, 0.5px bottom border g100.
- [ ] **First slot** `Your story`:
  - [ ] Avatar 58px.
  - [ ] Blue `+` badge bottom-right (20×20, 2px white border, fontSize 12/800 white).
  - [ ] Label `Your story` below (10.5px, g800, centred).
  - [ ] testID `your-story`.
  - [ ] Tap → `router.push('/(tabs)/create')`.
- [ ] **Each story tile:**
  - [ ] Ring 68×68, 2.5px border, radius 34, centred.
  - [ ] Avatar 58px inside ring.
  - [ ] Border color per state:
    - unseen: orange `#E8792B`.
    - seen: g300.
    - live: red.
  - [ ] Live stories: `LIVE` chip overlay (absolute, bottom -4, red bg, 4px radius, 4px horizontal / 1px vertical padding, white 8px/800 letter-spacing 0.5).
  - [ ] Username below (10.5px, g800, 68px max-width, centre, single line).
  - [ ] `✓` blue suffix for `user.isVerified`.
  - [ ] testID `story-{id}`; ring testID `story-ring-{id}`.

### Post cards (6 variants, PWA 521-683)

Each card:
- [ ] White bg, 0.5px bottom border g100.
- [ ] Header: avatar (34) + name row + PostPointsBadge + `•••` more icon.
- [ ] Media block: full screen-width, 1:1 aspect (4:5 for reel variant).
- [ ] Actions row: 🤍/❤️ + 👎 + 💬 + ShareButton + 🔖 (right).
- [ ] Likes count (13px/600/g800) + caption (13px/g800/19-lh) + `View all N comments` (13px/g400).

**V1 — Creator photo (PWA 521-544):**
- [ ] Header: avatar 34, username + blue `✓` verified badge (13×13 circle), " • 32m" relative time (11px, g400).
- [ ] Location line under name: `Munnar, Kerala` (11px, g500, 1px top margin).
- [ ] PostPointsBadge top-right: `🪙 +8` in a green-tint pill (rgba 12% bg, 10px radius, 11px/700 green text).
- [ ] Image full-width square, emoji overlay `🌴`.
- [ ] `✓ CREATOR` badge top-left corner of image (teal rgba, 9px/700, 0.5 letter-spacing).
- [ ] Actions: 🤍 (not 🔴 since unliked), 👎 (55% opacity when inactive), 💬, Share 📤, 🏷/🔖 save (right).
- [ ] `5,124 likes`.
- [ ] Caption `KeralaDiaries Monsoon mornings in Munnar hit different. This is why we live here. ☕🌧️ #KeralaMonsoon #Munnar #GodOwnCountry` — hashtags in blue.
- [ ] Comment preview: `travel.kl This is absolutely magical! 😍`.
- [ ] `View all 342 comments`.

**V2 — Creator video (PWA 546-570):**
- [ ] Same header as V1 but `ChefRaju` + `• 1h`.
- [ ] Location `Kochi, Kerala`.
- [ ] PostPointsBadge `🪙 +12`.
- [ ] Media has play button overlay (absolute centre, 48×48 circle, rgba 55% black bg, white ▶ triangle 20px).
- [ ] Duration badge bottom-right of media: `4:32` (rgba 65% black bg, 4px radius, 11px/700 white).
- [ ] `✓ CREATOR` badge top-left.
- [ ] Action row: ❤️ (red, liked state), 👎, 💬, 📤, 🔖.
- [ ] `12,400 likes`.
- [ ] Caption ChefRaju + `#KeralaCooking #FishCurry`.
- [ ] `View all 1,870 comments`.

**V3 — Sponsored (PWA 572-594):**
- [ ] Header avatar bg orange-ish, circle cursor pointer (`onClick` → storefront).
- [ ] Name row: `Kashi Bakes` (13px/600 g800) + ` • Sponsored` (11px/500 g400, NOT orange).
- [ ] Location: `📍 682016 • 0.8 km` (11px, g500).
- [ ] PostPointsBadge `🪙 +15`.
- [ ] Media square, emoji 🎂.
- [ ] **CTA bar overlay** bottom of image, full-width:
  - [ ] Orange bg `#E8792B`, 12px vertical padding, centred.
  - [ ] Text: `Claim Offer →` (white, 14px/700).
  - [ ] Shadow: 0 2 4 rgba 15% black.
  - [ ] Tap → `earn('click_sponsored_cta', postId)` + `router.push('/business/:sponsorBusinessId')`.
- [ ] No `✓ CREATOR` badge (sponsor precedence).
- [ ] `890 likes`, caption `Kashi Bakes Weekend Cake Fest! 🎂 20% off ALL cakes this Fri-Sun. Tag someone who deserves a treat!`.
- [ ] `View all 67 comments`.

**V4 — User-Created + Approved (PWA 596-621):**
- [ ] Avatar no ring.
- [ ] Name `Meera Nair` + `• 2h` (no verified ✓).
- [ ] Badge row below name (gap 4): `✓ USER CREATED` + `✓ APPROVED`.
- [ ] PostPointsBadge `🪙 +30`.
- [ ] Media square, emoji 🏖️.
- [ ] **Carousel dots below media**: 3 dots (6×6 each, 4px gap), first is active blue `#0095F6`, others g200.
  - [ ] Accessibility: container labelled `carousel indicator`; each dot labelled `carousel dot {n}`.
- [ ] Actions + 234 likes + caption with hashtags + `View all 45 comments`.

**V5 — Poll (PWA 623-656):**
- [ ] Avatar `Eru Community` + verified ✓ + `• 5h`.
- [ ] PostPointsBadge `🪙 +25`.
- [ ] **Poll container** (no image), 10-14 padding:
  - [ ] Question `🍜 Best street food in Kochi?` (16px, 700, g800, 10px bottom margin).
  - [ ] 4 option rows, each radius 10px:
    - [ ] Selected option has orange border + rgba orange 12% fill bar (width proportional to %).
    - [ ] Other options: rgba blue 6% fill, width proportional.
    - [ ] Content: text + right-aligned % label (14px/700, orange when selected, g500 otherwise).
    - [ ] Selected option prefixes a `✓`.
  - [ ] Options (in order): `Sharjah Shake at Beach 42%` (selected), `Pazhampori from bakery 31%`, `Fish fry Fort Kochi 18%`, `Egg puffs anywhere 🥚 9%`.
  - [ ] Total line: `4,200 votes • 🪙 +25 earned`.
- [ ] Actions + `4,200 likes` + `View all 890 comments`.

**V6 — Reel (PWA 658-683):**
- [ ] Avatar `Rohit Menon` no ring + `• 4h`, `✓ USER CREATED` + `✓ APPROVED`.
- [ ] PostPointsBadge `🪙 +30`.
- [ ] Media: **aspect 4:5** (taller than square), emoji ☕.
- [ ] Play button overlay centre.
- [ ] `▶ Reel • 0:45` badge top-left (rgba 65% black bg, 12px radius, 8px horizontal, 11px/700 white).
- [ ] Actions row + `1,890 likes`.
- [ ] Caption has `...more` truncation indicator at end.
- [ ] `View all 234 comments`.

## Functional behaviour

### Initial mount
- [ ] Fires `GET /api/v1/feed?page=1`.
- [ ] Fires notification store refresh → `GET /api/v1/notifications`.
- [ ] Fires feedService getStories.
- [ ] Fires `earn('daily_checkin')` (idempotent daily-cap 1).
- [ ] Sets `activeIndex=0` (first post's video autoplays).

### Tap behaviours
- [ ] PointsBadge → `router.push('/wallet')`.
- [ ] NotificationBell → `router.push('/notifications')`.
- [ ] ✉️ → `router.push('/messages')`.
- [ ] Story tile → `router.push('/stories/:id')`.
- [ ] "Your story" → `router.push('/(tabs)/create')`.
- [ ] Post avatar (sponsored variant with `sponsorBusinessId`) → `router.push('/business/:id')`.
- [ ] Post avatar (non-sponsored) → no-op (or navigate to user profile if wired).
- [ ] Post image tap → `router.push('/post/[id]')` for non-reel, `/(tabs)/reels?reelId={id}` for reel.

### Like / dislike / save
- [ ] Heart tap (when unliked):
  - [ ] Optimistic flip to ❤️ red.
  - [ ] Increment visible like count immediately.
  - [ ] POST `/api/v1/posts/:id/like`.
  - [ ] Fires `earn('like', post.id)`.
  - [ ] On non-409 error: rollback to 🤍 + decrement count.
- [ ] Heart tap (when liked):
  - [ ] Optimistic flip to 🤍.
  - [ ] Decrement count.
  - [ ] DELETE `/api/v1/posts/:id/unlike`.
  - [ ] On error: rollback.
- [ ] Dislike tap (when inactive):
  - [ ] Optimistic flip selected.
  - [ ] POST `/api/v1/posts/:id/dislike`.
  - [ ] 409 → stay selected (already disliked).
  - [ ] Other error → rollback.
- [ ] Save tap: same pattern as like; POST/DELETE `/posts/:id/save`.
- [ ] Dislike accessibilityHint: `Not for me — helps us improve your feed and affects creator score`.

### Share
- [ ] Tap 📤 → `ShareButton` opens native share sheet.
- [ ] `earn('share')` fires if share is completed (detect via Share API callback).

### Scroll behaviours
- [ ] Pull-to-refresh triggers `refresh()` → re-fetches page 1.
- [ ] End-of-list (0.5 threshold) → `loadMore()` → fetches next page.
- [ ] onViewableItemsChanged (60% threshold) → updates `activeIndex`; only active card's video plays, others pause.

### Sponsored impression
- [ ] Active + sponsored card visible for 2s → fires `earn('view_sponsored', post.id)` exactly once per lifetime.
- [ ] Non-sponsored card visible for any duration → no view_sponsored fire.
- [ ] Claim Offer CTA tap → `earn('click_sponsored_cta', post.id)` + navigate.

### Bottom tab bar
- [ ] 5 tabs visible: 🏠 Home (active), 🔍 Explore, ➕ Create (gradient orange→pink), ▶️ Reels, 😊 Profile.
- [ ] Active tab state persists.

## Edge cases

- [ ] Empty feed (new user, no published content in 7 days) → loading→empty state ("No posts yet — come back later") OR empty list silently.
- [ ] 401 on /feed → axios interceptor clears auth + redirects to /welcome.
- [ ] 500 on /feed → catch block; prior content retained.
- [ ] Media URL missing on a post → poster image shows; no crash.
- [ ] Video fails to load → shows poster image; tapOverlay still works.
- [ ] Post has no `pointsEarnedOnView` → PostPointsBadge not rendered.
- [ ] Post has no `locationLabel` → no location row.
- [ ] Post `ugcBadge=null` AND `moderationBadge=null` → no badge row.
- [ ] Sponsored post with `offerUrl=null` → Claim Offer bar not rendered.
- [ ] Poll post with `userVote` set → selected option reflects the vote.
- [ ] FlatList performance: 50 posts loaded without jank (viewable items change doesn't stutter).
- [ ] Background mode: videos pause when app backgrounded (verifiable on phone).

## Notes for Playwright web run

- `expo-video`'s `VideoView` on web MAY render as an HTML `<video>` via shim, but may also crash. If reels post (V6) errors, fall back to mocking with image-only posts.
- `ShareButton` opens native share; on web, it likely no-ops or opens the Web Share API. Check console.
- Sponsored impression timer can be verified via `browser_wait_for` delays + `browser_network_requests` capturing the earn POST.
- Viewability tracking (FlatList) works on web but may not fire the 60% threshold consistently — verify first card's video autoplay by presence of playing ARIA state or computed `<video>` currentTime advancing.
