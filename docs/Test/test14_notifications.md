# Test 14 — Notifications

**Route:** `/notifications`
**Mobile source:** `apps/mobile/app/notifications/index.tsx` (+ `RelativeTime.tsx`, `NotificationBell.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 3220-3320
**Screenshot:** `docs/pwa-screenshots/14-notifications.png`

## Visual parity

### Header
- [ ] Back `←`, title `Notifications` (16px/700 g900), right `Mark all read` (12px/600 blue) — only shown when `unreadCount > 0`, else 100px spacer.

### Filter tabs
- [ ] Horizontal scroll, 12 padding, 8 gap, bottom border 0.5 g100.
- [ ] 6 pills in order:
  1. `All` (testID `notif-tab-all`)
  2. `Posts`
  3. `Offers`
  4. `Leaderboard`
  5. `Messages`
  6. `Activity`
- [ ] Each: 12 horizontal / 5 vertical padding, 999 radius, 1px g300 border.
- [ ] Active: g800 bg, white 12px/600.
- [ ] Inactive: white bg, g600 12px/600.

### NEW / EARLIER sections
- [ ] `SectionList` with sticky-ish section headers.
- [ ] Section titles: `NEW` / `EARLIER` (10px/800 g500 letter-spacing 1, 12 vertical padding, white bg).
- [ ] NEW section = unread notifications; EARLIER = read.

### Notification row
- [ ] Row layout: emoji (22px width centred) + body (flex 1) + 3px accent left-border in type-color.
- [ ] Row padding 12 vertical, 12 horizontal, 0.5 bottom border `#FAFAFA`.
- [ ] Unread row: subtle lavender bg `#FAFAFF`.
- [ ] Title (13px/700 g800).
- [ ] Body (12px g600, 17-lh) optional.
- [ ] Relative time below body via `<RelativeTime />` (11px g400).
- [ ] Type-specific emoji + left-border color:
  - boost_proposal → 🚀 orange
  - post_approved → ✓ green
  - post_declined → ⚠️ red
  - trending → 🔥 orange
  - watchlist_offer → 🏪 teal
  - leaderboard → 👑 gold
  - follower → 👥 blue
  - quest → 🎯 purple
  - expiry → ⏰ red
  - default → 🔔 g300

### Type-specific CTA buttons (below body)
- [ ] `follower` with `data.userId`:
  - [ ] Blue `#0095F6` bg pill, 12 horizontal / 6 vertical, 999 radius, white 12px/700.
  - [ ] Copy `Follow back`.
  - [ ] a11yLabel `Follow back`.
- [ ] `boost_proposal`:
  - [ ] Orange bg pill.
  - [ ] Copy `Tap to accept →`.
  - [ ] Deep-link destination `/sponsorship` (or `data.deepLink` if present).
- [ ] `watchlist_offer`:
  - [ ] Teal `#0D9488` bg pill.
  - [ ] Copy `Redeem now →`.
  - [ ] Destination `/redeem?type=local` (or deepLink).
- [ ] `post_approved` / `trending` with `data.contentId`:
  - [ ] Secondary: g100 bg, g700 12px/700 label.
  - [ ] Copy `View post →`.
  - [ ] Destination `/post/[id]`.
- [ ] `post_declined` with `data.contentId`:
  - [ ] Secondary pill.
  - [ ] Copy `See reason →`.
  - [ ] Destination `/my-content`.
- [ ] `leaderboard`:
  - [ ] Secondary pill, copy `See ranks →`, destination `/leaderboard`.
- [ ] `quest`:
  - [ ] Secondary pill, copy `View quests →`, destination `/leaderboard`.
- [ ] `expiry`:
  - [ ] Orange-accent pill, copy `Redeem now →`, destination `/redeem?type=all`.

## Functional behaviour

### On mount
- [ ] Fires `useNotificationStore.refresh()` → `GET /api/v1/notifications?page=1&limit=20`.

### Filter tap
- [ ] Filters local items by type family:
  - all: everything.
  - posts: `post_approved | post_declined | trending`.
  - offers: `watchlist_offer | boost_proposal`.
  - leaderboard: `leaderboard`.
  - messages: `message` (if implemented).
  - activity: `follower | quest | expiry`.
- [ ] No additional API call (client-side filter).

### Mark all read
- [ ] Tap `Mark all read` → calls `markAllRead()` in store:
  - [ ] Finds all unread items.
  - [ ] PUT `/notifications/read` with `{ids}`.
  - [ ] On success: marks local items read, resets `unreadCount=0`.

### CTA tap
- [ ] Follow back → `userService.follow(data.userId)` → alert `Followed`.
- [ ] Tap to accept → `router.push('/sponsorship')` or deepLink.
- [ ] Redeem now → `router.push('/redeem?type=local')`.
- [ ] View post → `router.push({pathname:'/post/[id]', params:{id:data.contentId}})`.
- [ ] See reason → `router.push('/my-content')`.
- [ ] See ranks / View quests → `router.push('/leaderboard')`.

### Pull-to-refresh
- [ ] Re-runs `refresh()`.

### Infinite scroll
- [ ] `onEndReached` at 0.5 threshold → `loadMore()` → page+1 fetch.

### Back tap
- [ ] `router.back()`.

## Edge cases

- [ ] No notifications at all → `ListEmptyComponent`: 🔔 + `No notifications yet` (g400).
- [ ] All read → no `Mark all read` link; no NEW section.
- [ ] Filter yields 0 → just section headers absent; empty area below tabs.
- [ ] Notification with no `data` (e.g., leaderboard without recipient context) → CTA still shows with default destinations.
- [ ] Notification `type` not in TYPE_META map → default emoji 🔔, g300 accent.
- [ ] Very long body text → wraps; row height grows.
- [ ] unreadCount field out of sync with actual `isRead=false` count → Mark-all-read resets both.
- [ ] 401 on fetch → interceptor.

## Notes for Playwright web run

- All items testable on web (no native-only deps).
- Follow-back CTA makes a real API call; verify via `browser_network_requests`.
- CTA navigation: verify `location.pathname` change post-tap.
- Mark-all-read API call verification.
