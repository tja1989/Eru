# GapFix P8 — Phase 4: Social layer (profile, explore, reels, notifications, messages)

> **For agentic workers:** Required reading: [`GapFix_Agent_Protocol.md`](./GapFix_Agent_Protocol.md). P4–P7 must be green. This phase covers the 5 screens that make the app feel *social*.

**Goal:** Profile has 5 grid tabs (Posts/Reels/My Creations/Saved/Tagged) with exact PWA styling. Explore shows masonry grid with points badges and live/reel/ad markers. Reels add pts/min indicator. Notifications have 6 category tabs + NEW/EARLIER grouping + typed CTAs (boost proposal, approval, watchlist offer, leaderboard, follower, trending, quest, declined, expiry). Messages have filter tabs + boost-proposal pill + open chat view with proposal context + realtime bubble updates via the Socket.io gateway (P4 F2).

---

## The neighborhood-notice-board analogy

The social layer is the physical notice board at a village post office. Profile is your **personal noticeboard tile** — your photos pinned in 5 rows. Explore is the **main town display** — everyone's photos arranged by visual weight with little colored stickers (LIVE, Reel, Ad). Reels is a **vertical stack of moving posters** that flip on the hour — and every time you stand in front of one for a minute, the post office slips a token into your pocket. Notifications are the **cubby with your name on it** where tickets, offers, and messages land. Messages are **the envelope-drawer next to the cubby** where business proposals and creator DMs go. P8 is labelling every cubby correctly and making the envelopes from Kashi Bakes look different from the one from your friend Meera.

---

## Feature inventory

| # | Feature | Backend | Mobile | Priority |
|---|---------|---------|--------|----------|
| 1 | Profile 5-tab grid pixel parity | `/users/:id/content?tab=<>` filter | HighlightsRow + 5 grid tabs | P8a |
| 2 | Explore masonry badges (pts/ad/reel/live) | `/explore` derived fields | Masonry tile + overlays | P8a |
| 3 | Reels pts/min indicator + heartbeat | `POST /actions/earn { actionType:'reel_watch', watchTimeSeconds }` heartbeat every 30s | Indicator + timer | P8a |
| 4 | Notifications 6-tab filter + grouping + typed CTAs | `/notifications?filter=<category>` + type-specific `data` field | Tabs + NEW/EARLIER + type-specific cards | P8b |
| 5 | Messages filter + priority styling + proposal context | `/conversations?filter=<category>` + realtime via WebSocket | Tabs + BOOST PROPOSAL pill + proposal context card + realtime bubbles | P8c |

Sub-groupings:

- **P8a** — visual surfaces: profile, explore, reels
- **P8b** — notifications inbox
- **P8c** — messages + realtime wiring

Parallelizable between sub-groups.

---

## Prerequisites

- [ ] P4 + P5 + P6 + P7 green.
- [ ] Socket.io gateway working (P4 F2) — `apps/api/tests/ws/gateway.test.ts` green.
- [ ] Mobile `realtime.ts` singleton (P4 F2).
- [ ] Notification types exist in `apps/api/src/services/notificationService.ts` — audit for `boost_proposal`, `post_approved`, `post_declined`, `watchlist_offer`, `leaderboard`, `follower`, `trending`, `quest`, `expiry`.

---

## Existing-implementation audit (RUN FIRST)

### E1. Profile route

```
Read: apps/mobile/app/(tabs)/profile.tsx
Read: apps/mobile/components/HighlightsRow.tsx
Read: apps/api/src/routes/users.ts (profile + content sections)
```

Confirm existing grid tabs (from P3 + P0 lockdown) + HighlightsRow. Gap: exact 5 tabs with PWA icons (⊞ ▶ ✍️ 🔖 👤), grid item indicators (▶ ◫), dropdown on username.

### E2. Explore route

```
Read: apps/mobile/app/(tabs)/explore.tsx
Read: apps/api/src/routes/explore.ts
```

Confirm current state. Gap: masonry with variable heights, points badge overlays, LIVE badge, `▶ Reel` badge, `Ad` label, carousel indicator.

### E3. Reels

```
Read: apps/mobile/app/(tabs)/reels.tsx
Read: apps/api/src/routes/actions.ts
Grep: pattern="reel_watch|watch_time" path=apps/api/src/services/pointsEngine.ts
```

Confirm actions endpoint accepts `watchTimeSeconds`. Gap: pts/min indicator top-right, heartbeat every 30s, dislike-with-count styling.

### E4. Notifications

```
Read: apps/mobile/app/notifications/index.tsx
Read: apps/mobile/stores/notificationStore.ts
Read: apps/api/src/routes/notifications.ts
Read: apps/api/src/services/notificationService.ts
```

Confirm existing list rendering. Gap: 6 filter tabs, NEW/EARLIER grouping, type-specific left border color + icon + CTA (Follow back button on follower, Tap to accept on boost proposal, etc.).

### E5. Messages

```
Read: apps/mobile/app/messages/index.tsx
Read: apps/mobile/app/messages/[id].tsx (may not exist)
Read: apps/mobile/components/ConversationRow.tsx
Read: apps/mobile/components/MessageBubble.tsx
Read: apps/api/src/routes/messages.ts
```

Confirm conversation list + chat detail. Gap: filter tabs, BOOST PROPOSAL pill, priority styling, proposal context card in chat view, realtime updates.

---

# Feature 1 — Profile 5-tab grid + HighlightsRow

**Goal:** `app/(tabs)/profile.tsx` matches PWA lines 1032–1107.

**PWA reference checklist:**

### Header (1034–1041)

- Username `arjun.s` + verified ✓ + dropdown ▾
- Right: `➕` (Create) + `☰` (Settings)

### Profile stats (1042–1066)

- Avatar (80×80) with orange ring (tier border — Influencer uses orange per PWA)
- Stats row: Posts / Followers / Following (17px count, 13px label)
- Bio: Name (14, 700) + multi-line text (13, g600)
- Badges row: `🔥 Influencer`, `🪙 4,820 pts`, `🔥 24d streak`, `✍️ Creator`
- Actions row: Edit Profile (gray) + ✨ Create (blue) + 👤 (share)

### Highlights row (1068–1075)

- Circular 60×60 tiles w/ border, name label. Last is `➕ New` tile.

### Grid tabs (1077–1083)

5 icon-only tabs:
- ⊞ Posts (default)
- ▶ Reels
- ✍️ Threads (per Dev Spec "My Creations" — but PWA icon is `✍️`; use tooltip)
- 🔖 Saved
- 👤 Tagged

### Photo grid (1085–1098)

- 3-column grid, 1.5px gap
- Item indicators:
  - ▶ for video in top-right
  - ◫ for carousel in top-right
  - none for photo
  - Poll items likely render the poll emoji

### Task 1.1: Content-by-tab endpoint

- [ ] Verify `/users/:id/content?tab=<posts|reels|threads|saved|tagged>&page=N` works. If `threads` or `tagged` missing, extend.

```ts
// apps/api/tests/routes/users-content.test.ts
it('tab=tagged returns content where taggedUserIds includes viewerId', async () => { /* ... */ });
it('tab=saved returns content where InteractionType=save by viewerId', async () => { /* ... */ });
it('tab=threads returns content where threadParentId IS NULL AND threadChildren exist', async () => { /* ... */ });
```

- [ ] RED → GREEN per tab.
- [ ] Commit.

### Task 1.2: Profile screen + grid tabs

- [ ] RED:

```tsx
it('renders exactly 5 icon tabs in order: ⊞ ▶ ✍️ 🔖 👤', () => {
  const { getAllByLabelText } = render(<ProfileScreen />);
  const tabs = getAllByLabelText(/tab-/);
  expect(tabs.map(t => t.props.accessibilityLabel)).toEqual([
    'tab-posts','tab-reels','tab-threads','tab-saved','tab-tagged',
  ]);
});

it('tapping ▶ Reels tab fetches /users/me/content?tab=reels', async () => { /* ... */ });

it('grid items show ▶ indicator when mediaKind=reel, ◫ when mediaKind=carousel, nothing for photo', () => { /* ... */ });
```

- [ ] GREEN.
- [ ] Commit.

### Task 1.3: HighlightsRow full CRUD

- [ ] Existing `HighlightEditor` and `HighlightViewer` components exist from P3. Audit for gaps. RED for any missing flow (create new highlight on press of `➕ New`, open viewer on tap).
- [ ] GREEN.
- [ ] Commit.

---

# Feature 2 — Explore masonry

**Goal:** `app/(tabs)/explore.tsx` matches PWA lines 1110–1145.

**PWA reference checklist:**

- Search bar (g100 bg, 15px placeholder).
- Category pills (horizontal scroll, g800 filled / g200 outlined): For You, Food, Travel, Tech, Fitness, Local.
- Masonry grid (3 cols, 130px base row, variable spans):
  - Some items `grid-row: span 2` (taller), some `grid-column: span 2` (wider), some normal.
- Per-item overlays:
  - Points badge bottom-right green tint: `🪙+8`
  - LIVE badge top-left red: `LIVE`
  - Reel badge bottom-left: `▶ Reel`
  - Ad label bottom-left: `Ad`
  - Play indicator: `▶` corner

### Task 2.1: Explore response fields

- [ ] Verify `GET /api/v1/explore` returns per item: `id`, `thumbnailUrl`, `emoji` (optional), `mediaKind`, `pointsEarnedOnView`, `isSponsored`, `isLive`, `durationSeconds`, `spanWidth` (1 or 2), `spanHeight` (1 or 2).
- [ ] Add `spanWidth` / `spanHeight` as derived fields in the explore service (pseudo-random weighted by engagement).
- [ ] Lockdown shared type.
- [ ] Commit.

### Task 2.2: Masonry layout

- [ ] RED:

```tsx
it('renders a grid where tall items take 2 row spans', () => { /* ... */ });
it('item with isSponsored renders "Ad" label bottom-left', () => { /* ... */ });
it('item with isLive renders red "LIVE" badge top-left', () => { /* ... */ });
it('item with mediaKind=reel renders "▶ Reel" indicator', () => { /* ... */ });
it('points badge shows "🪙+X" bottom-right when pointsEarnedOnView > 0', () => { /* ... */ });
```

- [ ] GREEN: use `MasonryFlashList` (if installed) or a manually-laid-out grid.
- [ ] Commit.

### Task 2.3: Category filtering

- [ ] RED: tapping a category pill re-fetches with `?category=<slug>`; the 6 pills are exactly: For You / Food / Travel / Tech / Fitness / Local.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 3 — Reels pts/min + heartbeat

**Goal:** `app/(tabs)/reels.tsx` matches PWA lines 1148–1198.

**PWA reference checklist:**

- Full-screen dark background, tabs (Following / For You / Local).
- Points indicator top-right (green tint, rounded):
  - `+5 pts` (14px, 800)
  - `per min` (8px subtext)
- Right column actions: ❤️ 24.5K, 👎 312 (70% opacity, w/ count), 💬 1.2K, 📤 Share, 🔖 Save, 🎵 (audio disc)
- Bottom overlay: avatar + username + ✓ + Follow button + CREATOR badge + caption + `🎵 Original Audio — ChefRaju`

### Task 3.1: Pts-per-min indicator

- [ ] RED: renders `+5 pts` and `per min` text top-right when playing.
- [ ] GREEN.
- [ ] Commit.

### Task 3.2: Watch-time heartbeat

- [ ] RED in `__tests__/screens/reels.test.tsx`:

```tsx
it('fires actionsService.earn({actionType:"reel_watch", contentId, watchTimeSeconds}) every 30s', () => {
  jest.useFakeTimers();
  const earn = jest.spyOn(actionsService, 'earn').mockResolvedValue({ pointsCredited: 3 });
  render(<ReelsScreen />);
  jest.advanceTimersByTime(30000);
  expect(earn).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'reel_watch', watchTimeSeconds: 30 }));
  jest.advanceTimersByTime(30000);
  expect(earn).toHaveBeenCalledTimes(2);
});

it('stops heartbeat when scroll moves to next reel', () => { /* ... */ });
```

- [ ] GREEN: add heartbeat hook using `useEffect` + `setInterval` guarded on `isActive`.
- [ ] Commit.

### Task 3.3: Dislike opacity + count

- [ ] RED: dislike button defaults to 70% opacity, displays count, tapping it calls dislike endpoint.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 4 — Notifications inbox

**Goal:** `app/notifications/index.tsx` matches PWA lines 2515–2641.

**PWA reference checklist:**

### Header (2517–2521)

- Back → `/(tabs)`
- Title: `Notifications`
- Right: `Mark all read` (blue)

### Filter tabs (2523–2530) — horizontally scrollable

6 pills in order: `All (N)` (purple filled), `🪙 Points`, `👥 Social`, `🎁 Offers`, `🛡️ Moderation`, `💼 Business`.

### Grouping (2533, 2586)

- `NEW` section header (10px, g400, letter-spacing 1px)
- `EARLIER TODAY` section header

### Notification types with distinct colors + icons + CTAs

| Type | Left border | Icon | Body pattern | CTA | Deep link |
|---|---|---|---|---|---|
| `boost_proposal` | orange | 🚀 | `<Business> wants to boost your <content>!` | Tap to accept | `/sponsorship` |
| `post_approved` | green | ✅ | `Your post "<title>" was approved!` | +30 pts noted | `/my-content` |
| `post_declined` | red (low opacity) | 🛡️ | `Your post was declined: <reason>` | MOD code | `/my-content?postId=<id>` |
| `watchlist_offer` | teal | 🎂 (business emoji) | `<Business> just dropped a new offer 🎉` | Points cost | `/business/<id>` |
| `leaderboard` | purple | 🏆 | `You're #N in <pincode> this week!` | Rank delta | `/leaderboard` |
| `follower` | blue | (user avatar) | `<User> started following you` | **Follow back** button | `/profile/<id>` |
| `trending` | orange | 🔥 | `Your reel is trending in Kerala!` | +200 pts | `/my-content` |
| `quest` | green | 🎯 | `Weekly quest completed: <title>` | +N pts | `/leaderboard` |
| `expiry` | gold (low opacity) | ⚠️ | `<N> pts expiring in <D> days` | `Redeem before <date>` | `/redeem` |

### Task 4.1: Notification type + data column

- [ ] Audit `Notification` model. Ensure it has `type`, `title`, `body`, `screenTarget` (deep-link route), `entityId`, `data` (jsonb for type-specific fields like `pointsCredited`, `modCode`, `rankDelta`, etc.).
- [ ] If missing, extend schema via `db push`.
- [ ] Commit.

### Task 4.2: Filter endpoint

- [ ] RED: `GET /notifications?filter=business` returns only `type IN ('boost_proposal')`. `?filter=moderation` returns `type IN ('post_approved', 'post_declined', 'quest')` per Dev Spec §2.7 S19.
- [ ] GREEN: map category → type list in the handler. Lock down shared type with the category union.
- [ ] Commit.

### Task 4.3: NotificationRow types

- [ ] Create a component per type with the exact color + icon + CTA behavior. Or one generic `NotificationRow` that switches on `type`. Preference: switch component internally, one file.
- [ ] RED per type (one behavior test each).
- [ ] GREEN.
- [ ] Commit.

### Task 4.4: NEW vs EARLIER grouping

- [ ] RED: notifications created < 1h ago grouped under NEW; older grouped under EARLIER TODAY (or "YESTERDAY" when applicable).
- [ ] GREEN.
- [ ] Commit.

### Task 4.5: Follow-back CTA

- [ ] RED: tapping Follow back on a `follower` notification calls `POST /users/:id/follow` and updates the button to "Following".
- [ ] GREEN.
- [ ] Commit.

### Task 4.6: Mark all read

- [ ] RED: tapping Mark all read calls `POST /notifications/mark-all-read`; unread count drops to 0.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 5 — Messages + realtime

**Goal:** `app/messages/index.tsx` (conversation list) + `app/messages/[id].tsx` (chat view) match PWA lines 2644–2736, with realtime updates via Socket.io.

**PWA reference checklist:**

### Conversation list (2644–2695)

- Header: back, `Messages`, ✏️ (compose).
- Filter tabs: All, 💼 Business, 👥 Creators, 💬 Friends.
- **Business-proposal conversation** (priority, orange left border):
  - Avatar with `💼` badge overlay (bottom-right of avatar)
  - Name + timestamp
  - `BOOST PROPOSAL` pill (orange filled, white text)
  - Last message preview
  - Unread count badge (orange)
- **Creator conversation**:
  - Avatar with online indicator (green dot bottom-right)
  - Name + timestamp + preview + unread count
- **Friend conversation**:
  - Avatar + name + timestamp + preview
- **Eru Support** (dimmed):
  - Orange italic "E" avatar + name + timestamp + preview

### Chat view (2696–2726)

- "💬 Viewing: <conversation>" header (10px, g400).
- **Proposal context card** (only for boost-proposal conversations):
  - `💼 Boost Proposal` (11px, 700, orange)
  - Body: `Kashi Bakes wants to boost your plum cake reel. Proposed: ₹3,000 • Your commission (20%): ₹600 • Reach: 25K+ in 3 pincodes`
  - Buttons: Accept (green) / Negotiate (gray) / ✕
- **Message bubbles**:
  - Inbound: g100 bg, rounded 14px (14 14 14 4), left-aligned
  - Outbound (navy text on navy bg): right-aligned
  - Timestamps (9px, g400) beneath each bubble
- **Input row**: avatar + text input + 📎 + ➤ (send, navy circle).

### Task 5.1: Conversation filter endpoint

- [ ] RED: `GET /conversations?filter=business` returns only conversations with `conversationKind = 'business'`.
- [ ] GREEN. Requires `Conversation` to have a `kind` column (add via `db push` if missing: `kind ConversationKind` enum `{business, creator, friend, support}`).
- [ ] Commit.

### Task 5.2: Proposal context in chat

- [ ] RED in `__tests__/screens/messages-chat.test.tsx`:

```tsx
it('renders the proposal context card when conversation.kind === business and has proposal', async () => {
  // fetch mock returns conversation with proposal field; assert "Accept" button present
});

it('tapping Accept calls POST /sponsorship/proposals/:id/accept', () => { /* ... */ });
```

- [ ] GREEN. The chat-detail handler should fetch the proposal alongside messages and return it on the response.
- [ ] Commit.

### Task 5.3: Realtime bubble update

- [ ] RED in `__tests__/screens/messages-chat-realtime.test.tsx`:

```tsx
it('appends an inbound message to the list when realtime emits message:new', () => {
  // mock realtime.on('message:new', ...) — trigger handler; assert new bubble rendered
});

it('does not append a duplicate if a message with the same id is already rendered (idempotency)', () => { /* ... */ });
```

- [ ] GREEN: subscribe in `useEffect` to `realtime.on('message:new', ...)` on mount; unsubscribe on unmount; filter by `payload.conversationId === currentConvoId`.
- [ ] Commit: `feat(mobile): realtime inbound message bubbles`.

### Task 5.4: Conversation list priority styling

- [ ] RED: business-proposal conversation renders with orange left border, BOOST PROPOSAL pill, orange unread badge.
- [ ] GREEN.
- [ ] Commit.

### Task 5.5: Online indicator

- [ ] RED: creator conversation with `lastSeenAt < 5min ago` renders green dot overlay on avatar.
- [ ] GREEN: requires `User.lastSeenAt` timestamp; bump it on every authenticated API call via a tiny preHandler hook (or accept this is eventually consistent).
- [ ] Commit.

### Task 5.6: Message send + optimistic update

- [ ] RED: typing + tapping send appends the message immediately (optimistic) + calls `POST /conversations/:id/send`; on success the optimistic message is replaced by the server-persisted one.
- [ ] GREEN.
- [ ] Commit.

---

## Playwright smoke

Per protocol §5. Capture:

- Profile with 5 tabs + HighlightsRow.
- Explore masonry with LIVE + Ad + Reel badges visible.
- Reels with pts/min indicator.
- Notifications with all 6 filter tabs visible + NEW/EARLIER groups + at least 3 type variants rendered.
- Messages list with the boost-proposal priority conversation.
- Messages chat with proposal context card + bubbles on both sides.

---

## Phase-completion gate

- [ ] Profile: 5 tabs, grid indicators (▶/◫), HighlightsRow CRUD, badges row, orange tier ring on avatar.
- [ ] `/users/:id/content?tab=<>` supports all 5 tabs (posts/reels/threads/saved/tagged).
- [ ] Explore: masonry with span-1/2 items, pts/ad/reel/live badges, category pills in exact PWA order.
- [ ] Reels: pts/min indicator, 30s heartbeat, dislike count at 70% opacity.
- [ ] Notifications: 6 filter tabs, NEW/EARLIER grouping, 9 type variants with correct color + icon + CTA + deep link.
- [ ] Follow-back button, Mark all read, deep-link targets all work.
- [ ] Messages: filter tabs (All/Business/Creators/Friends), BOOST PROPOSAL pill on proposals, online dot on creators.
- [ ] Chat view: proposal context card with Accept/Negotiate/✕ wired to `/sponsorship/proposals/:id/*`.
- [ ] Realtime: inbound message bubbles appear without refresh; no duplicates.
- [ ] `ALLOW_DEV_TOKENS=true npm test` green in `apps/api`.
- [ ] `npm test` green in `apps/mobile`.
- [ ] `npx tsc --noEmit` clean in both workspaces.
- [ ] Playwright screenshots attached.
- [ ] Commits scoped per protocol §7.

---

## What could go wrong

- **Heartbeat fires during backgrounded reel** — if the user backgrounds the app mid-reel, the interval keeps firing. Pause on `AppState.change('background')`, resume on 'active'.
- **Notification filter mis-mapping** — `Moderation` tab must show `post_approved` AND `post_declined`; easy to miss `approved`. Assert via explicit test that both render in the Moderation filter.
- **Realtime leaks** — always unsubscribe in the `useEffect` cleanup. Listener count can explode if you don't.
- **Optimistic message ID collision** — use a client-generated UUID (e.g., `crypto.randomUUID()`) for optimistic messages; the server replaces it with its canonical ID.
- **Follow-back double-call** — debounce the button; optimistically set state to "Following" on tap; rollback on error.
- **Grid indicator wrong** — a carousel post has multiple media entries; check `media.length > 1` rather than a separate `mediaKind` flag if inconsistent.
- **lastSeenAt update on every request** — could be expensive. Rate-limit: only update if `now - lastSeenAt > 60s`.

---

## Next phase

Once the gate is green, open [`GapFixP9.md`](./GapFixP9.md) — Phase 5: Business integration (storefront, creator × business).
