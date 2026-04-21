# Test 16 — Business Storefront

**Route:** `/business/[id]`
**Mobile source:** `apps/mobile/app/business/[id]/index.tsx`
**API:** `GET /api/v1/business/:id` (legacy) + `GET /api/v1/businesses/:id/storefront` (aggregate, P9 F1)
**PWA reference:** `Eru_Consumer_PWA.html` lines 3101-3218
**Screenshot:** `docs/pwa-screenshots/16-storefront.png`

## Visual parity

### Header
- [ ] Back `←`, title = business name (single line, 15px/700 g900, centred), right 24-wide spacer.

### Hero banner
- [ ] Orange `#FFA726` flat bg, height 180.
- [ ] (PWA has bannerUrl support; if `business.bannerUrl` present, shows image with overlay.)

### Business profile block
- [ ] Padding 16.
- [ ] Name row: business name (22px/800 g900) + blue ✓ verified badge if `isVerified`.
- [ ] Category + pincode: `{category} · 📍 {pincode}` (g500, 4 top margin).
- [ ] Rating + review-count row: `⭐ {rating}` (g700) + `{reviewCount} reviews` (g700), 16 gap.

### Follow / CTA row
- [ ] `⭐ Follow & Get Offers` (orange bg, 12 padding, 10 radius, white 700).
- [ ] When following: `✓ Following` (rgba green 12% bg, 1px green border, green label).

### Tabs — About / Offers / Reviews / Tagged
- [ ] 4 tabs row below action button; 8 gap, underline active.
- [ ] Tab copy per PWA: `About`, `Offers (N)`, `Reviews`, `Tagged (N)`.

### About content
- [ ] Description paragraph (14px g700, 20-lh).

### Offers list (in Offers tab, or below on About in simplified view)
- [ ] Section header `Offers ({offers.length})` (16px/700 g800).
- [ ] Each offer row: title (flex 1, g800) + `🪙 {pointsCost}` (700 green) + `Claim` button (may be absent in storefront view).
- [ ] Padding 12, g50 bg, 10 radius, 6 bottom margin.

### Info / contact block
- [ ] Open hours row: `🕐 Open today` + times `8:00 AM – 10:00 PM` + `OPEN NOW` chip (green tint) when `openNow: true`.
- [ ] Phone row: `📞 +91 {phone}` + `Call` link (blue).
- [ ] Address row: `📍 {address}` + distance `0.8 km away` + `Directions` link.

### Reviews tab (if shipped)
- [ ] Top reviews list (up to 5 from `topReviews` in storefront aggregate).

### Tagged UGC tab
- [ ] 3-col grid of tagged content thumbnails.

### Create CTA (footer)
- [ ] `Create a post tagging {business}` button → `/(tabs)/create?businessTagId={id}` (prefills tag).

## Functional behaviour

### On mount
- [ ] Fires `businessService.get(id)` → `GET /business/{id}`.
- [ ] Fires `watchlistService.list()` → populates watchlist state → sets `following` based on whether this business is in items.

### Follow tap (not following)
- [ ] Calls `watchlistService.add(id)` → `POST /watchlist`.
- [ ] On success: alert `Following! — You'll be notified when this business drops new offers.`; button flips to `✓ Following`.
- [ ] On error: alert `Couldn't update — {error}`.

### Follow tap (already following)
- [ ] Calls `watchlistService.remove(id)` → `DELETE /watchlist/{id}`.
- [ ] On success: button flips back to `⭐ Follow & Get Offers`.

### Phone Call tap
- [ ] `Linking.openURL('tel:{phone}')`.

### Offer tap / Claim
- [ ] Tap a live offer → calls `offersService.claim(offerId)` OR navigates to offer detail.
- [ ] On success: alert with claim code.

### Create CTA tap
- [ ] `router.push('/(tabs)/create?businessTagId={id}')` — prefills the business tag in Create.

### Back tap
- [ ] `router.back()`.

## Edge cases

- [ ] Unknown business id → 404; error screen; back works.
- [ ] No offers → `Offers (0)`; empty section.
- [ ] No reviews → `Reviews` tab empty.
- [ ] No phone → Call button hidden.
- [ ] No address → Directions hidden.
- [ ] User already in watchlist → button pre-populated `✓ Following` on load.
- [ ] Follow API fails → toast error, state unchanged.
- [ ] Open-now logic: IST-computed; storefront aggregate's `openNow` boolean respected.
- [ ] Business owner (`user.id === business.ownerId`) → may show "Edit Storefront" admin link (future).

## Notes for Playwright web run

- All items testable on web.
- Linking.openURL on web opens a new tab/no-op; skip `Call`/`Directions` functional items.
- Verify watchlist add/remove via `browser_network_requests` capturing POST/DELETE.
