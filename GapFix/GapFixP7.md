# GapFix P7 — Phase 3: Earn/Redeem loop (wallet, redeem, my-rewards)

> **For agentic workers:** Required reading: [`GapFix_Agent_Protocol.md`](./GapFix_Agent_Protocol.md). P4 + P5 + P6 must be green. This phase closes the economic loop: see your balance → spend on local offers → carry the voucher → show QR at the store.

**Goal:** Wallet renders all 5 quick-action tiles, daily progress with streak + "pts to goal" hint, tier progress with "Next: Champion" label, earning history with See All. Redeem has 6 category tabs (All/Local/Gift Cards/Recharge/Donate/Premium), hot-deals carousel, gift-card grid, recharge amount picker with phone selector, donate matching copy. My Rewards has 4 tabs (Active/Watchlist/Used/Expired), QR-rendered rewards, watchlist stores with offer-count dots, live-deals-from-watchlist, and a notify-me toggle.

**Architecture:** Mostly mobile. API gets category filter on `offers.ts`, a mobile-recharge endpoint scaffold, and `watchlist/deals` (which builds on P4 Feature 1 Watchlist). Server-side QR (P4 F3) is rendered here for the first time.

---

## The loyalty-card-wallet analogy

Think of the wallet as your actual physical wallet. The balance card on top = the cash balance. The 5 quick actions = the "most recent" gift-card folds you access often. The history = receipts you keep for tax day. The tier card = your airline status (once you know you're 1 flight from Gold, you book differently). Redeem = the **gift-card display rack at the mall**: the 6 tabs are the shelves (Local, Gift Cards, Recharge, Donate, Premium), each with an orderly grid. My Rewards = the **ticket pocket in your wallet**: active coupons ready to show at the counter, plus a tab for "stores I follow" where new deals land first.

---

## Feature inventory

| # | Feature | Backend | Mobile | Priority |
|---|---------|---------|--------|----------|
| 1 | Wallet pixel parity | `/wallet` already locked (P0 field drift); extend fields | 5 tile row, TierProgressCard enrichment | P7a |
| 2 | Redeem pixel parity | `/offers` category filter + typed shape | 6 tabs, hot-deals carousel, gift-cards grid, recharge, donate | P7a |
| 3 | Mobile recharge endpoint scaffold | `POST /rewards/recharge` stub → logs + returns placeholder voucher | amount picker UI | P7b |
| 4 | Watchlist stores row + live deals | `GET /watchlist` (P4 F1) + `GET /watchlist/deals` NEW | Watchlist tab, stores row, live-deal cards, notify toggle | P7b |
| 5 | My Rewards pixel parity (Active/Watchlist/Used/Expired) | `GET /rewards?status=<>` add `watchlist` status + shape | 4 tabs + QR card + compact row | P7c |
| 6 | Offer details fields | `/offers` response adds discount label, distance, category | Used across all 3 screens | P7a (shared) |

---

## Prerequisites

- [ ] P4 + P5 + P6 green.
- [ ] `Watchlist` model shipped (P4 F1).
- [ ] Server-side QR generator (P4 F3) produces SVGs persisted on `UserReward`.
- [ ] `packages/shared/src/types/wallet.ts` has the P0-locked `WalletResponse`, `WalletHistoryResponse`, `WalletExpiringResponse`.

---

## Existing-implementation audit (RUN FIRST)

### D1. Wallet route + shape

```
Read: apps/api/src/routes/wallet.ts
Read: apps/mobile/services/walletService.ts
Read: apps/mobile/app/wallet/index.tsx
```

The P0-era lockdown added `WalletResponse`. Confirm it already has: `balance`, `rupeeValue`, `dailyGoal`, `dailyEarned`, `streakDays`, `currentTier`, `nextTier`, `pointsToNext`. Missing: `pointsToGoal` (derived), `dailyGoalHintCopy`? These may need extension in P7 F1.

### D2. Offers route + shape

```
Read: apps/api/src/routes/offers.ts
Grep: pattern="category|type" path=apps/api/src/routes/offers.ts
```

Confirm offers either support category filter today or we need to add it. Expected gap: the `type` field (local/giftcard/recharge/donate/premium) likely not on `Offer` model yet — add in Feature 2.

### D3. Rewards status filter

```
Grep: pattern="status" path=apps/api/src/routes/rewards.ts
```

Confirm `?status=active|used|expired` works. `watchlist` status does NOT exist — it's a synthetic tab that aggregates from `watchlist` + active offers of those businesses. Build in Feature 4.

### D4. Mobile components already present

```
ls apps/mobile/components/OfferCard.tsx RewardCard.tsx WalletQuickActions.tsx TierBadge.tsx TierProgressCard.tsx PointsBadge.tsx
```

All six present. They may need field extensions; don't fork them.

### D5. My Rewards tab filter

```
Read: apps/mobile/app/my-rewards/index.tsx
```

Confirm it has tabs but likely only for `active | used | expired` — missing `watchlist`. This is the biggest gap in the 3-screen cluster.

---

# Feature 1 — Wallet pixel parity

**Goal:** `app/wallet/index.tsx` matches PWA lines 1201–1338.

**PWA reference checklist:**

### Header (1203–1208)

- Back arrow → `/(tabs)`
- Title: `Eru Wallet`
- Right: `History` (g400, soft link — scrolls to history section)

### Balance card (1210–1243) — navy gradient, rounded 20px

- Label: `TOTAL BALANCE` (10px, letter-spacing 2px, g400)
- Big number: `4,820` (44px, 900, white) + `pts` (16px, orange, 700)
- Sub: `Equivalent value: ≈ ₹48.20 in rewards`
- 5 quick-action tiles (glass, 10px padding, centered):
  - 🛒 **Shop** → `/redeem?category=giftcard`
  - 🏪 **Local Offers** → `/redeem?category=local`
  - 🎁 **Gift Cards** → `/redeem?category=giftcard`
  - 📱 **Recharge** → `/redeem?category=recharge`
  - 💝 **Donate** → `/redeem?category=donate`

### Daily progress (1246–1258)

- `Today's Earnings` (left) + `145 / 250 pts` (right, orange).
- Progress bar (orange → gold gradient) at percent.
- Bottom row: `🔥 24-day streak` (left, g400) + `105 pts to daily goal!` (right, teal).

### Tier progress (1261–1277)

- 🔥 icon + `Influencer Tier` (orange) + sub `1.5x earning multiplier active`
- Right-aligned: `Next: 👑 Champion` (g400) + `45,180 / 50,000 pts` (purple, 700)
- Progress bar (orange → purple).
- Footer (purple, 10px): `4,820 pts away from 2.0x multiplier! 🚀`

### Earning history (1280–1320)

- Header (g50 bg, border bottom): `Recent Activity` + right `See All` (blue, 600).
- Rows: 36×36 icon tile + title + relative time + points delta (green for positive, red for spend).
- At least 7 historical rows (varied icons: 📖, 🍳, 🗳️, 🔥 check-in, 🍰 sponsored view, ✍️ post approved, 🎫 redeemed).

### Expiry warning (1323–1329) — gold tinted

- `⚠️ 320 pts expiring in 12 days` + sub `Points earned before <Date> will expire. Redeem now →` (blue link).

**Files:**

- Modify: `apps/mobile/app/wallet/index.tsx`
- Modify: `apps/mobile/components/WalletQuickActions.tsx`
- Modify: `apps/mobile/components/TierProgressCard.tsx`
- Modify: `apps/api/src/routes/wallet.ts` — ensure response includes `pointsToGoal = dailyGoal - dailyEarned` (derive; don't add DB column)

### Task 1.1: WalletResponse field verification

- [ ] Verify `WalletResponse` includes `pointsToGoal`, `dailyGoalHintCopy`. If `dailyGoalHintCopy` doesn't exist, add it to shared type as `string | null` and derive server-side: `pointsToGoal > 0 ? '${pointsToGoal} pts to daily goal!' : 'Daily goal hit 🎉'`.
- [ ] RED in `apps/api/tests/routes/wallet.test.ts`:

```ts
it('wallet response has pointsToGoal and hint copy', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-w1', phone: '+912000070001', username: 'w1' });
  await prisma.pointsLedger.create({ data: { userId: u.id, actionType: 'like', points: 100 } });
  const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/wallet', headers: { Authorization: devToken('dev-test-w1') } });
  const body = res.json();
  expect(body.pointsToGoal).toBe(150);  // default goal 250 - earned 100
  expect(body.dailyGoalHintCopy).toMatch(/150 pts to daily goal/);
});
```

- [ ] GREEN: compute in `routes/wallet.ts`. Commit.

### Task 1.2: WalletQuickActions — 5 tiles routing

- [ ] RED: each of the 5 tile press handlers navigates to `/redeem?category=<key>`.
- [ ] GREEN.
- [ ] Commit.

### Task 1.3: TierProgressCard — "Next: Champion" label

- [ ] RED: assert card shows `Next: 👑 Champion` above the progress bar when current tier is Influencer.
- [ ] GREEN.
- [ ] Commit.

### Task 1.4: Daily progress bar + streak

- [ ] RED: renders progress bar at 58% width when `dailyEarned=145`, `dailyGoal=250`. Streak label `🔥 24-day streak`. Hint copy `105 pts to daily goal!`.
- [ ] GREEN.
- [ ] Commit.

### Task 1.5: History "See All"

- [ ] RED: `See All` press routes to `/wallet/history` (new screen or modal).
- [ ] GREEN. If no dedicated screen yet, keep the press routed to a not-yet-implemented path and flag it as known TODO (P7 scope creep kept out).
- [ ] Commit.

### Task 1.6: Expiry warning

- [ ] RED: banner renders iff `expiringPoints > 0`. Copy matches `⚠️ ${expiringPoints} pts expiring in ${expiringDays} days`. Press routes to `/redeem`.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 2 — Redeem pixel parity

**Goal:** `app/redeem/index.tsx` matches PWA lines 1341–1510.

**PWA reference checklist:**

### Header (1343–1347)

- Back → `/wallet`
- Title: `Rewards Store`
- Right: `🪙 4,820` (green mini pill)

### Category tabs (1350–1357) — horizontally scrollable, 20px radius

6 pills in order: 🔥 All, 🏪 Local, 🎁 Gift Cards, 📱 Recharge, 💝 Donate, ⭐ Premium. Selected is g800 filled, others g500 outlined.

### Hot Deals Near You (1360–1408) — horizontal carousel

Section title: `🔥 Hot Deals Near You`. Cards 240px min-width:
- 100px gradient header w/ big emoji + right-aligned discount badge (`20% OFF`, `₹100 OFF`, `FREE`) — red-ish background on badge.
- Padding row: name (14px, 700) + `📍 pincode • N km` (11px, g400).
- Bottom row: `🪙 200 pts` + `Claim` orange button.

### Gift Cards (1412–1446) — 3-column grid

6 tiles (Amazon, Flipkart, Swiggy, BookMyShow, BigBasket, Myntra). Each: 48×48 colored icon tile, brand name, `From N pts` subtext.

### Mobile Recharge (1449–1476)

Card with:
- Row: phone icon + `+91 98765 43210` + `Jio • Last recharge: ₹239` + `Change` link.
- 3 amount buttons: `₹149` / `₹239` (selected, orange border) / `₹479`, each with `1,490 pts` subtext.
- Bottom CTA: `Recharge with 2,390 pts →` (blue, full-width).

### Donate (1479–1501)

Section title: `💝 Donate (Eru Matches +20%)`.
3 tiles (Plant Tree, Books for Kids, Local Cause): emoji + title + `500 pts = 1 tree` + `Eru adds +X pts match` (green, 600).

**Files:**

- Modify: `apps/mobile/app/redeem/index.tsx` (major rewrite)
- Modify: `apps/mobile/components/OfferCard.tsx` (extend with discount label + km distance)
- Create: `apps/mobile/components/GiftCardTile.tsx`
- Create: `apps/mobile/components/RechargeCard.tsx`
- Create: `apps/mobile/components/DonateTile.tsx`
- Modify: `apps/api/src/routes/offers.ts` — support `?category=<local|giftcard|recharge|donate|premium>`
- Modify: `apps/api/prisma/schema.prisma` — add `Offer.category` enum if missing
- Modify: `packages/shared/src/types/offers.ts` — extend `OfferCategory` union

### Task 2.1: Offer category schema

- [ ] Audit: `Grep: pattern="category" path=apps/api/prisma/schema.prisma -- within the Offer model`.
- [ ] If no `category` field:
  - Add enum `OfferCategory { local giftcard recharge donate premium }` to schema.
  - Add `category OfferCategory` to `Offer`, default `local`.
  - `npx prisma db push && npx prisma generate`.
- [ ] Commit: `chore(api): Offer.category enum`.

### Task 2.2: Offers endpoint filter

- [ ] RED in `apps/api/tests/routes/offers.test.ts`:

```ts
it('GET /offers?category=giftcard returns only giftcard offers', async () => {
  await prisma.offer.createMany({
    data: [
      { title: 'Amazon Voucher', pointsCost: 100, category: 'giftcard', /* ... */ },
      { title: 'Kashi 20% off', pointsCost: 200, category: 'local', /* ... */ },
    ],
  });
  const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/offers?category=giftcard', headers: { Authorization: devToken('dev-test-of1') } });
  expect(res.json().items).toHaveLength(1);
});

it('GET /offers (no category) returns all', async () => { /* ... */ });
```

- [ ] GREEN. Commit.

### Task 2.3: Discount label + distance in response

- [ ] RED: offer response includes `discountLabel` (`20% OFF`, `₹100 OFF`, `FREE`, `30% off Mother's Day`) and `distanceKm: number | null` (derived from user's primary pincode).
- [ ] GREEN: add these as derived fields in the offers handler; `discountLabel` from the offer's `discount_label` column (add if missing) OR compute from `discount_value + discount_type`.
- [ ] Commit.

### Task 2.4: RedeemScreen tests

- [ ] RED:
  - 6 category tabs in exact order
  - Default selected tab = `All` (or from `?category=<q>` query)
  - Hot Deals carousel renders offers where `distanceKm <= 5`
  - Gift-cards grid (3 cols) renders giftcard offers
  - Recharge card shows phone from user profile + 3 amount buttons
  - Donate tiles show exact copy including `Eru adds +X pts match`

- [ ] GREEN. Commit.

### Task 2.5: GiftCardTile + RechargeCard + DonateTile

- [ ] Per-component tests (each must be unit-testable).
- [ ] GREEN. Commit.

---

# Feature 3 — Mobile recharge endpoint scaffold

**Goal:** `POST /api/v1/rewards/recharge {planId, phone}` accepts a request, creates a `UserReward` row with `type='recharge'` and status `pending`, deducts points, returns a receipt. It does **not** actually recharge the phone — that's a third-party integration (Ezetap/Paytm) deferred to a later phase. The placeholder lets the UI flow complete end-to-end.

**Why P7:** Without this endpoint, Redeem's recharge button falls flat. Better to have a stub that acts correctly (point deduction + record) than nothing.

### Task 3.1: Endpoint

- [ ] RED in `apps/api/tests/routes/rewards-recharge.test.ts`:

```ts
it('POST /rewards/recharge deducts points and creates a pending UserReward', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-rc1', phone: '+912000070010', username: 'rc1', pointsBalance: 5000 });
  const res = await getTestApp().inject({
    method: 'POST',
    url: '/api/v1/rewards/recharge',
    headers: { Authorization: devToken('dev-test-rc1') },
    payload: { planId: 'jio_239', phone: '+919876543210' },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json();
  expect(body.reward.type).toBe('recharge');
  expect(body.reward.status).toBe('pending');
  const refreshed = await prisma.user.findUnique({ where: { id: u.id } });
  expect(refreshed?.pointsBalance).toBe(5000 - 2390);  // ₹239 plan
});

it('returns 402 when insufficient points', async () => { /* ... */ });
```

- [ ] GREEN: extend `routes/rewards.ts`. Hardcode plan-to-points map:

```ts
const RECHARGE_PLANS: Record<string, { amountRupees: number; pointsCost: number; operator: string }> = {
  jio_149: { amountRupees: 149, pointsCost: 1490, operator: 'Jio' },
  jio_239: { amountRupees: 239, pointsCost: 2390, operator: 'Jio' },
  jio_479: { amountRupees: 479, pointsCost: 4790, operator: 'Jio' },
};
```

Wrap in a `prisma.$transaction` to keep deduction + reward creation atomic.

- [ ] Commit: `feat(api): POST /rewards/recharge scaffold (no 3rd-party integration yet)`.

### Task 3.2: Shared type + mobile service

- [ ] `packages/shared/src/types/rewards.ts` add `RechargeRequest` + `RechargeResponse`.
- [ ] Annotate handler.
- [ ] Mobile `rewardsService.recharge(planId, phone)` wraps the call.
- [ ] Commit.

---

# Feature 4 — Watchlist stores + live deals

**Goal:** My Rewards has a Watchlist tab that shows:
- Horizontal row of watched businesses with unread offer dots.
- Vertical list of live deals from those businesses, colored by brand accent.
- `Get notified when followed stores drop offers` toggle.

**Why P7:** My Rewards is the surface where the Watchlist adds value (stores you follow). Every other reference (storefront follow button in P9, notifications for watchlist offers in P8) points here.

**Files:**

- Modify: `apps/mobile/app/my-rewards/index.tsx`
- Create: `apps/mobile/components/WatchlistStoresRow.tsx`
- Create: `apps/mobile/components/WatchlistDealCard.tsx`
- Create: `apps/mobile/components/WatchlistNotifyToggle.tsx`
- Modify: `apps/api/src/routes/watchlist.ts` — add `GET /watchlist/deals` subroute
- Modify: `apps/api/src/services/watchlistService.ts` — add `listDealsForUser(userId)` method

### Task 4.1: Watchlist deals service + route

- [ ] RED in `apps/api/tests/services/watchlist-deals.test.ts`:

```ts
it('listDealsForUser returns offers from watched businesses, not-yet-claimed, sorted by newest first', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-wd1', phone: '+912000070020', username: 'wd1' });
  const b1 = await prisma.business.create({ data: { name: 'Kashi', pincode: '682016' } });
  const b2 = await prisma.business.create({ data: { name: 'Brew', pincode: '682001' } });
  const b3 = await prisma.business.create({ data: { name: 'Elsewhere', pincode: '682001' } });
  await prisma.watchlist.createMany({ data: [{ userId: u.id, businessId: b1.id }, { userId: u.id, businessId: b2.id }] });
  await prisma.offer.createMany({ data: [
    { businessId: b1.id, title: 'Kashi Deal', pointsCost: 200, category: 'local', expiresAt: new Date(Date.now() + 86400000) },
    { businessId: b2.id, title: 'Brew Deal', pointsCost: 150, category: 'local', expiresAt: new Date(Date.now() + 86400000) },
    { businessId: b3.id, title: 'Skipped', pointsCost: 100, category: 'local', expiresAt: new Date(Date.now() + 86400000) },
  ]});
  const deals = await watchlistService.listDealsForUser(u.id);
  expect(deals).toHaveLength(2);
  expect(deals.map(d => d.business.name).sort()).toEqual(['Brew', 'Kashi']);
});
```

- [ ] GREEN: add service method that does `prisma.offer.findMany({ where: { businessId: { in: watchedIds } } })`. Shape each deal to include business metadata.
- [ ] Add route `GET /api/v1/watchlist/deals` annotated `Promise<WatchlistDealsResponse>`.
- [ ] Commit.

### Task 4.2: WatchlistStoresRow

- [ ] RED: renders one circular tile per watched business. Unread-offer-count dot overlays if `activeOfferCount > 0`. Press tile → `/business/[id]`.
- [ ] GREEN.
- [ ] Commit.

### Task 4.3: WatchlistDealCard

- [ ] RED: colored left border = business's brand color (derived or fallback orange). Shows followed badge. Claim button wires to existing offer-claim flow.
- [ ] GREEN.
- [ ] Commit.

### Task 4.4: WatchlistNotifyToggle

- [ ] RED: defaults to on. Press triggers `PATCH /watchlist/:businessId` with `{notifyOnOffers: !current}` per business (or a single global toggle — confirm with PWA: the PWA shows one global toggle, `Get notified when followed stores drop offers`. This likely maps to a `user.notifyWatchlistOffers` flag rather than per-business).

Given PWA has **one global toggle**, change the semantics: add `notifyWatchlistOffers: boolean` to `User` table (default true). Toggle updates `PUT /users/me/settings`.

- [ ] Commit.

### Task 4.5: My Rewards Watchlist tab

- [ ] RED: tapping `Watchlist` tab (next to Active) renders Stores row + deals list + notify toggle. Tab count dot matches `deals.length`.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 5 — My Rewards pixel parity (Active / Used / Expired)

**Goal:** The existing 3 status tabs plus the new Watchlist tab render exactly to PWA 1513–1778.

### Task 5.1: Active full-card with QR

- [ ] RED: when a reward row has `qrSvg` (from P4 F3), render `<SvgXml xml={reward.qrSvg} />` inside a white card. Title + expiry + reward code + `Get Directions` + `Share` buttons.
- [ ] GREEN. Commit.

### Task 5.2: Compact reward row

- [ ] RED: rewards without QR render as compact rows (icon + text + badge + `Use →`). Expiry countdown copy `⚡ Expires in 3 days` when `< 7d left`.
- [ ] GREEN. Commit.

### Task 5.3: Previously Used section

- [ ] RED: Used tab shows 60%-opacity rows with `USED ✓` label. Donations render with `DONATED 💚`.
- [ ] GREEN. Commit.

---

# Feature 6 — Offer shared fields consolidation

**Goal:** Ensure a single `OfferResponseItem` shared type is used across redeem carousel, gift-cards grid, storefront offers (P9), and watchlist deals. Extends `packages/shared/src/types/offers.ts`.

### Task 6.1: Consolidate

```ts
// packages/shared/src/types/offers.ts
export type OfferCategory = 'local' | 'giftcard' | 'recharge' | 'donate' | 'premium';

export interface OfferSummary {
  id: string;
  businessId: string | null;  // null for gift-cards / recharge / donate partners
  businessName: string;
  businessPincode: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  emoji: string | null;
  pointsCost: number;
  discountLabel: string;   // "20% OFF", "₹100 OFF", "FREE"
  category: OfferCategory;
  distanceKm: number | null;
  expiresAt: string;
  isWatchlisted: boolean;
}
```

- [ ] Route handler types refer to this. Mobile service types refer to this. OfferCard, WatchlistDealCard, GiftCardTile, storefront (P9) all consume it.
- [ ] Commit.

---

## Playwright smoke

Per protocol §5. Capture:

- Wallet with real data: balance, tier card, daily progress, 7 history rows, expiry banner.
- Redeem on each category tab.
- My Rewards on Active tab (with QR-rendered reward) and Watchlist tab.

---

## Phase-completion gate

- [ ] Wallet: balance card + 5 tiles + daily progress with hint + tier card with "Next: Champion" + history with See All + expiry banner.
- [ ] `WalletResponse` returns `pointsToGoal` and `dailyGoalHintCopy`.
- [ ] Redeem: 6 tabs, hot-deals carousel, gift-cards grid, recharge card with 3 amounts + phone selector, donate tiles with `+X pts match` copy.
- [ ] `Offer.category` enum present; `GET /offers?category=<>` filters correctly.
- [ ] `POST /rewards/recharge` deducts points atomically; returns a pending UserReward; 402 on insufficient balance.
- [ ] My Rewards: 4 tabs (Active/Watchlist/Used/Expired), QR-rendered active rewards, compact rows for non-QR, Used/Expired dimmed.
- [ ] Watchlist: stores row + unread dots + deals list + global notify toggle.
- [ ] `GET /watchlist/deals` returns live offers from followed businesses only.
- [ ] All cross-screen visual primitives (OfferCard, RewardCard, GiftCardTile, etc.) consume `OfferSummary` shared type.
- [ ] `ALLOW_DEV_TOKENS=true npm test` green in `apps/api`.
- [ ] `npm test` green in `apps/mobile`.
- [ ] `npx tsc --noEmit` clean in both workspaces.
- [ ] Playwright screenshots attached.
- [ ] Commits scoped per protocol §7.

---

## What could go wrong

- **Point-deduction race** — two simultaneous redeem taps could double-spend. Use `prisma.$transaction` + `user.update({ where: { id, pointsBalance: { gte: cost } }, data: { pointsBalance: { decrement: cost } }})`. The `where` clause enforces atomicity.
- **Recharge phone mismatch** — user's registered phone vs. recharge target phone are different. The PWA shows "Change" link — support this, don't silently use primary phone.
- **Distance on sparse pincodes** — `distanceKm` may be null when pincode coordinates aren't known. Handle null: don't render "• null km" — omit the distance text.
- **Gift-card inventory** — real gift-card codes come from partner APIs (Amazon SPN, Qwikcilver, etc.). The MVP stub returns a fake code + QR. Document this in the reward response (`status: 'pending_fulfillment'`) so the UI can label it "processing" if needed.
- **Watchlist tab count wrong** — the badge `Watchlist (8)` in PWA is the count of *live deals*, not the count of followed businesses. Don't double-count.
- **Expiring-points math** — derived from `PointsLedger.expiresAt`. If the pointsExpiry cron already moved expired points out of balance, don't double-count them in the warning. Audit the cron's behavior first.

---

## Next phase

Once the gate is green, open [`GapFixP8.md`](./GapFixP8.md) — Phase 4: Social layer (profile, explore, reels, notifications, messages).
