# Test 10 — My Rewards

**Route:** `/my-rewards`
**Mobile source:** `apps/mobile/app/my-rewards/index.tsx` (+ `RewardCard.tsx`, `WatchlistStoresRow.tsx`, `WatchlistDealCard.tsx`, `WatchlistNotifyToggle.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 1513-1778
**Screenshot:** `docs/pwa-screenshots/10-my-rewards.png`

## Visual parity

### Header
- [ ] Back `←`, title `My Rewards` (16px/700 g900), right spacer 30px.

### Tabs
- [ ] 4 tabs in a row, 8px gap, 12 padding:
  1. `Active` (testID `reward-tab-active`)
  2. `Watchlist` (testID `reward-tab-watchlist`)
  3. `Used` (testID `reward-tab-used`)
  4. `Expired` (testID `reward-tab-expired`)
- [ ] Each: 14 horizontal / 6 vertical padding, 999 radius, 1px g300 border.
- [ ] Inactive: white bg, 12px/600 g700.
- [ ] Active: g800 bg, white label.
- [ ] a11yState `selected=true` on active.

### Active tab — reward cards
- [ ] Each reward renders `<RewardCard />`:
  - [ ] Card bg white, 12px radius, 14 padding, 12 bottom margin, shadow (0 0 4 rgba 5%).
  - [ ] Header row: title (16px/700 g800, flex 1, padding-right 8) + badge top-right.
  - [ ] Badge:
    - active: green `#10B981` bg, label `ACTIVE`.
    - used: g500 bg, label `USED ✓`.
    - expired: g500 bg, label `EXPIRED`.
    - badge text: white 11px/700 letter-spacing 0.5, 10 horizontal / 4 vertical padding, 12 radius.
  - [ ] Expiry line below title (12px g500):
    - active + days ≤ 7: `⚡ Expires in {N} day{s}` (urgent: orange `#E8792B` 700-weight).
    - active + days > 7: `Expires in {N}d`.
    - used: `USED ✓`.
    - expired: `Expired`.
  - [ ] QR wrapper centre: 160×160.
    - If `reward.qrSvg`: `<SvgXml xml={reward.qrSvg} width={160} height={160}/>` (testID `reward-qr-server`).
    - Else: `<QRCode value={reward.claimCode} size={160}/>` (testID `reward-qr-client`).
  - [ ] Code below QR: 1 letter-spacing, 700 centred g800.
  - [ ] Active only: `Use at store` button (orange `#E8792B` bg, white 700, 10 padding vertical, 8 radius, 12 top margin).
  - [ ] Used/expired: dim card (opacity 0.6).

### Watchlist tab
- [ ] If empty (no stores + no deals): placeholder card:
  - [ ] 🏪 (48px), title `Stores you follow` (15px/700 g800), body `Live deals from businesses you've added to your watchlist will show up here. Follow your favourite stores from their storefront to get notified first.` (13px g500 centred 18-lh, 8px gap).
- [ ] If stores or deals present:
  - [ ] `<WatchlistNotifyToggle />` at top — single row:
    - [ ] Label `Get notified when followed stores drop offers` (13px/600 g800) + sub `One push per new live deal.` (11px g500).
    - [ ] Switch right-aligned; track false=g300, track true=orange; thumb white.
    - [ ] Default value from `userService.getSettings()` → `notifyWatchlistOffers`.
  - [ ] Section header `🏪 Stores you follow` (13px/700 g800, 12 horizontal / 8 vertical padding).
  - [ ] `<WatchlistStoresRow />` below:
    - [ ] Horizontal scroll, white bg, 8 vertical / 12 horizontal padding, 14 gap.
    - [ ] Each store tile: 68px wide.
      - [ ] Avatar 58×58 with optional orange dot badge top-right showing `{activeOfferCount}` (white 9px/800, 18×18, 1.5 white border).
      - [ ] Name below (10.5px g800, 68 max-width, centre, single line).
      - [ ] a11yLabel `{name} has {N} active offers`.
    - [ ] Tap store → `router.push('/business/{id}')`.
  - [ ] If deals > 0: Section `🔥 Live deals` + list of `<WatchlistDealCard />`:
    - [ ] Each card: orange left border (3px accent), white bg, 0.5 g200 border, 12 radius, 12 padding.
    - [ ] Header row: business name (12px/700 g800, flex 1) + `✓ Followed` chip (rgba green 12% bg, 999 radius, 8 horizontal / 2 vertical, 9px/700 green).
    - [ ] Title (14px/700 g900), optional description (12px g500, 4 top margin, 16-lh).
    - [ ] Footer row: `🪙 {pointsCost} pts` (12px/700 green) + Claim button (orange bg, 14 horizontal / 7 vertical, 999 radius, 12px/700 white).
    - [ ] a11yLabel for Claim: `Claim {title}`.
  - [ ] If deals = 0 but stores > 0: `No live deals right now — check back soon.` (centre g500).

### Used tab
- [ ] List of RewardCards with `status=used` (dimmed).

### Expired tab
- [ ] List of RewardCards with `status=expired` (dimmed).

## Functional behaviour

### On mount
- [ ] Default tab `active`.
- [ ] Fires `rewardsService.list('active')` → `GET /api/v1/rewards?status=active`.

### Tab switch
- [ ] Tap `reward-tab-active` → `load('active')`.
- [ ] Tap `reward-tab-used` → `load('used')`.
- [ ] Tap `reward-tab-expired` → `load('expired')`.
- [ ] Tap `reward-tab-watchlist` → calls `loadWatchlist()` (parallel `watchlistService.list()` + `watchlistService.listDeals()` + `userService.getSettings()`).
- [ ] Rewards list does NOT fire on watchlist tab.

### Watchlist toggle
- [ ] Tap → optimistic flip; POST `PUT /users/me/settings` with `{notifyWatchlistOffers: newValue}`.
- [ ] Error → rolls back to prior value.

### WatchlistStoresRow tap
- [ ] Tap store tile → `router.push('/business/{businessId}')`.

### WatchlistDealCard Claim
- [ ] Tap → `offersService.claim(dealId)`.
- [ ] On success: alert `Claimed! — Your code: {claimCode}`.
- [ ] Re-runs `loadWatchlist()` to refresh list.
- [ ] On error: alert `Could not claim — {error}`.

### Active RewardCard `Use at store` button
- [ ] Tap → `rewardsService.markUsed(id)` → `PUT /rewards/{id}/use`.
- [ ] On success: alert `Redeemed — Reward marked as used.`.
- [ ] Reloads list → moves reward from Active to Used.
- [ ] On error: alert.

### Back tap
- [ ] `router.back()`.

## Edge cases

- [ ] No active rewards → list shows `No rewards yet` (centre g500).
- [ ] Watchlist with stores but 0 deals → shows stores row + `No live deals right now — check back soon.`.
- [ ] Watchlist empty (0 stores + 0 deals) → coming-soon placeholder.
- [ ] getSettings fails → toggle defaults to true (optimistic default).
- [ ] Reward has no qrSvg → client-side QRCode fallback testID `reward-qr-client`.
- [ ] Reward with days = 0 → `⚡ Expires in 0 day` (singular special case).
- [ ] 401 on any fetch → axios clears auth.
- [ ] Unused reward days ≤ 7: expiry line orange-urgent.
- [ ] Very long reward title (2+ lines) → wraps, QR stays centred.
- [ ] Used tab with a reward whose title is very long and badge says `USED ✓` → layout stays intact.

## Notes for Playwright web run

- `react-native-svg` SvgXml renders as inline SVG on web — verifiable by inspecting `<svg>` element.
- Fallback `react-native-qrcode-svg` also renders SVG on web.
- Toggle switch works via `browser_click`; verify PUT /users/me/settings payload via `browser_network_requests`.
- Watchlist tab requires seeded stores + deals — ensure seed script creates these.
