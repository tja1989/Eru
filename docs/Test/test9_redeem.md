# Test 9 — Redeem (Rewards Store)

**Route:** `/redeem`
**Mobile source:** `apps/mobile/app/redeem/index.tsx` (+ `GiftCardTile.tsx`, `RechargeCard.tsx`, `DonateTile.tsx`, `OfferCard.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 1341-1510
**Screenshot:** `docs/pwa-screenshots/09-redeem.png`

## Visual parity

### Header
- [ ] 14px horizontal padding, 12 vertical, white bg, 0.5px bottom border g100.
- [ ] Left: `←` (22px g800).
- [ ] Centre: `Rewards Store` (16px/700 g900).
- [ ] Right: **Balance pill** — rgba green 12% bg, 10 horizontal / 4 vertical padding, 999 radius. Text: `🪙 {balance.toLocaleString()}` (12px/700 green).

### Category tabs
- [ ] Horizontal scroll, 8px gap, 12px horizontal padding, 8px vertical.
- [ ] 6 tabs in order:
  1. `🔥 All` (testID `tab-all`)
  2. `🏪 Local` (testID `tab-local`)
  3. `🎁 Gift Cards` (testID `tab-giftcard`)
  4. `📱 Recharge` (testID `tab-recharge`)
  5. `💝 Donate` (testID `tab-donate`)
  6. `⭐ Premium` (testID `tab-premium`)
- [ ] Each: 12 horizontal / 6 vertical padding, 999 radius, 1px g300 border.
- [ ] Inactive: white bg, 12px/600 g500 label.
- [ ] Active: bg g800, border g800, white label.
- [ ] a11yState `selected: true` on active tab.

### Hot Deals section (All + Local tabs)
- [ ] Title `🔥 Hot Deals Near You` (14px/700 g800, 16 horizontal / 8 vertical padding).
- [ ] Horizontal scroll of OfferCard tiles, 12px gap.
- [ ] Each tile 240px wide; renders local offers.
- [ ] Empty state: `No local offers right now` (centre, g500).
- [ ] Loading: ActivityIndicator below title.

### Gift Cards section (All + Gift Cards tabs)
- [ ] Title `🎁 Gift Cards` (14px/700 g800).
- [ ] 3-column grid, 8px gap, 6 hardcoded tiles:
  1. Amazon (orange `#FF9900`, 🛒, from 1,000 pts)
  2. Flipkart (blue `#2874F0`, 🛍, from 1,000 pts)
  3. Swiggy (orange `#FC8019`, 🍔, from 500 pts)
  4. BookMyShow (red `#C4242D`, 🎟, from 800 pts)
  5. BigBasket (green `#84C225`, 🍅, from 1,000 pts)
  6. Myntra (pink `#FF3E6C`, 👟, from 1,000 pts)
- [ ] Each tile (width ~31%): icon box (48×48, colored bg) + brand name (12px/700 g800) + `From {N} pts` (10px g500).
- [ ] a11yLabel: `{brand} gift card, from {N} points`.

### Mobile Recharge section (All + Recharge tabs)
- [ ] Title `📱 Mobile Recharge` (14px/700 g800).
- [ ] `RechargeCard` component (`components/RechargeCard.tsx`):
  - [ ] Phone row: 📱 icon (20px) + phone `+91 98765 43210` (14px/700 g800) + sub `Jio • Last recharge: ₹239` (11px g500) + optional `Change` blue link right.
  - [ ] 3 amount pills in a row:
    - `₹149` / `₹239` / `₹479`.
    - Each: centred, 1px g200 border, 8px radius, 10 vertical padding, flex 1, 8px gap.
    - Active (selectedPlanId): 1.5px orange border, rgba orange 6% bg.
    - Amount text: 15px/700 g700 inactive; orange active.
    - Below: `{pointsCost.toLocaleString()} pts` (10px g500, 2px top margin).
  - [ ] CTA: Blue `#0095F6` bg, 12 padding vertical, 8 radius.
  - [ ] Copy when selected: `Recharge with {pointsCost.toLocaleString()} pts →` (white, 14px/700).
  - [ ] Copy when no selection: `Select an amount`.
  - [ ] Disabled when no selection: opacity 0.5.

### Donate section (All + Donate tabs)
- [ ] Title `💝 Donate (Eru Matches +20%)` (14px/700 g800).
- [ ] 3 tiles in a row (flex 1 each, 8px gap):
  1. 🌳 `Plant a Tree` — `500 pts = 1 tree` — match `Eru adds +100 pts match`
  2. 📚 `Books for Kids` — `1,000 pts = 3 books` — match `Eru adds +200 pts match`
  3. 🤝 `Local Cause` — `200 pts minimum` — match `Eru adds +40 pts match`
- [ ] Each tile: emoji (28px, 2px bottom margin) + title (12px/700 g800) + cost (10px g500 centred) + match (10px/600 green centred).
- [ ] Tile bg white, 0.5px g200 border, 12px radius, 12px padding.

## Functional behaviour

### On mount
- [ ] Reads `type` from `useLocalSearchParams`; defaults to `all` if absent or invalid.
- [ ] Sets initial `category` state from query.
- [ ] Fires `offersService.list(category)` → `GET /api/v1/offers?type={category}`.
- [ ] Active tab's testID has `accessibilityState.selected=true`.

### Tab switch
- [ ] Tap a tab → updates `category` state.
- [ ] Re-fires `offersService.list(newCategory)`.
- [ ] Visibility of sections adjusts per `showHotDeals / showGiftCards / showRecharge / showDonate`:
  - All: shows all 4 sections.
  - Local: shows Hot Deals only.
  - Gift Cards: shows Gift Cards only.
  - Recharge: shows Recharge only.
  - Donate: shows Donate only.
  - Premium: none of the four (may show empty or premium-specific content).

### Hot deals card tap
- [ ] Tap a Hot Deal's Claim button → calls `offersService.claim(offerId)`.
- [ ] On success: alerts `Claimed! — Your code: {claimCode}`.
- [ ] Refreshes `usePointsStore.refreshSummary()` (balance update).
- [ ] Adds to `claimed` map; `{offer.id}` key makes its claimCode visible in UI.
- [ ] On error: alerts `Could not claim — {error}`.

### Gift card tile tap
- [ ] Tap → Alert `Coming soon — {brand} gift-card fulfilment ships with partner integration.`

### Recharge plan select
- [ ] Tap ₹149 / ₹239 / ₹479 → sets `selectedPlanId` to `jio_149` / `jio_239` / `jio_479`.
- [ ] CTA updates: shows `Recharge with {N} pts →`.

### Recharge CTA tap
- [ ] Alert `Submitted — Recharge queued for plan {planId}`.
- [ ] **TODO (not wired yet):** should call `POST /api/v1/rewards/recharge` with `{planId, phone}` and handle 402 (insufficient) / 400 (unknown plan).

### Donate tile tap
- [ ] Alert `Thanks! — {title} donation flow coming soon.`

### Back tap
- [ ] `router.back()`.

## Edge cases

- [ ] Query param `type=unknown` → falls back to `all`.
- [ ] No local offers returned → Hot Deals shows `No local offers right now`.
- [ ] API 401 → axios interceptor clears auth.
- [ ] Balance not loaded (store default 0) → pill shows `🪙 0`.
- [ ] Recharge CTA tapped while disabled → no API call, no navigation.
- [ ] Switching tabs rapidly → stale fetch could race; verify last tab's response wins via `alive` flag in effect.

## Notes for Playwright web run

- All tabs + sections testable.
- Recharge plan amount + point-cost computed purely from static RECHARGE_PLANS array → verify exact labels via `browser_snapshot`.
- Confirm balance pill updates after a Hot Deal claim (pointsStore.refreshSummary).
