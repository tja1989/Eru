# GapFix P9 — Phase 5: Business integration (storefront, creator × business)

> **For agentic workers:** Required reading: [`GapFix_Agent_Protocol.md`](./GapFix_Agent_Protocol.md). P4–P8 must be green. This phase is the **linking layer** between the consumer app and the (separate) business app.

**Goal:** Storefront is a full business profile — banner, stats, 4 tabs (About/Offers/Reviews/Tagged), live offers carousel, info block (hours/phone/address), tagged-UGC grid, reviews, and a "create a reel about X" CTA. Creator × Business is the UGC marketplace dashboard — earnings banner, active sponsored posts with reach/clicks/spend/earning stats, pending proposals with Accept/Negotiate/Decline, and a "review a business & earn" CTA.

**Architecture:** Backend mostly exists (`routes/business.ts`, `routes/sponsorship.ts`, `SponsorshipProposal` model). The major API work is (a) a storefront aggregate endpoint that returns profile + offers + reviews + tagged-UGC in one call, and (b) proposal negotiate endpoint with state transitions. Mobile is significant — both screens are largely stubs today.

---

## The farmers-market-stall analogy

A storefront is a **market stall with a sign, a price list on the wall, a testimonials corkboard, and a basket of Polaroids from happy customers pinned at the front**. Creator × Business is the **creator's own notebook where they track which stalls have hired them** to hand out samples — with columns for hours worked, tips earned, and next week's bookings. P9 is building both so the consumer can see who runs the stall, and the creator can see which stalls are paying them this month.

---

## Feature inventory

| # | Feature | Backend | Mobile | Priority |
|---|---------|---------|--------|----------|
| 1 | Storefront aggregate endpoint | `GET /businesses/:id/storefront` returning profile + offers + reviews + tagged UGC | — | P9a |
| 2 | Storefront pixel parity | — | Banner + stats + 4 tabs + About content | P9a |
| 3 | Follow business = create Watchlist row | `POST /watchlist` (P4 F1) wired | Follow button | P9a |
| 4 | Creator × Business dashboard endpoint | `GET /creator/sponsored` + `GET /creator/pending-proposals` with enriched stats | — | P9b |
| 5 | Creator × Business pixel parity | — | Earnings banner + Active cards + Pending cards + CTA | P9b |
| 6 | Proposal negotiate endpoint | `POST /sponsorship/proposals/:id/negotiate {counterAmount}` | Negotiate button flow | P9b |

Parallelizable: P9a and P9b are independent after Feature 6 (negotiate endpoint) ships.

---

## Prerequisites

- [ ] P4 + P5 + P6 + P7 + P8 green.
- [ ] `Watchlist` model (P4 F1) + mobile service.
- [ ] `OfferSummary` shared type (P7 F6).
- [ ] `SponsorshipProposal` model exists — confirm state column and `accepted | declined | negotiating | live | completed | proposed` enum.

---

## Existing-implementation audit (RUN FIRST)

### F1. Business routes

```
Read: apps/api/src/routes/business.ts
Grep: pattern="app\\.(get|post)" path=apps/api/src/routes/business.ts
```

Confirm existing subroutes. Expect: `GET /:id`, possibly `POST /:id/follow` (now maps to watchlist). Gap: aggregate endpoint, reviews, tagged-UGC.

### F2. Business Prisma model

```
Read: apps/api/prisma/schema.prisma (Business model section)
```

Expected fields: id, name, category, pincode. Gap: `avatarUrl`, `bannerUrl`, `verified`, `since` (YYYY founding), `description`, `hours` (jsonb), `phone`, `address`, `ratingAvg`, `ratingCount`, `responseTimeMinutes`, `pincodeRank`. Add what's missing.

### F3. Sponsorship routes

```
Read: apps/api/src/routes/sponsorship.ts
Grep: pattern="accept|decline|negotiate" path=apps/api/src/routes/sponsorship.ts
```

Confirm accept + decline exist. Gap: `negotiate` endpoint + mobile service method.

### F4. Business reviews

```
Grep: pattern="BusinessReview|business_review|reviews" path=apps/api/prisma/schema.prisma
```

If no dedicated `BusinessReview` model: use `Content` rows where `subtype='review'` and `businessTagId = :businessId`. Dev Spec §2.6 S17: "Top reviews: customer reviews with star ratings and verified badge" — rating comes from the content's rating sub-field or the review text's star count parsed out. Best: add `rating Int?` to `Content` (1–5 stars) and a validation that review subtype requires it.

### F5. Mobile existing

```
Read: apps/mobile/app/business/[id].tsx  (or ls app/business/)
Read: apps/mobile/app/sponsorship/index.tsx
Read: apps/mobile/components/SponsorshipCard.tsx
Read: apps/mobile/components/CreatorEarningsCard.tsx
```

Confirm what exists. Gaps: storefront is a stub; sponsorship has basic dashboard but missing reach/clicks/earning stats, CTA card.

---

# Feature 1 — Storefront aggregate endpoint

**Goal:** One server round-trip returns everything a Storefront screen needs: business profile, live offers (≤10), top reviews (≤5), tagged UGC (≤12). Avoids 4 independent requests.

### Task 1.1: Schema extensions for Business

- [ ] If missing, add to `Business` model:
  - `avatarUrl String? @map("avatar_url")`
  - `bannerUrl String? @map("banner_url")`
  - `verified Boolean @default(false)`
  - `since Int?` (year of founding)
  - `description String?`
  - `hours Json?` (e.g., `[{day:'mon', open:'08:00', close:'22:00'}, ...]`)
  - `phone String?`
  - `address String?`
  - `ratingAvg Float @default(0) @map("rating_avg")`
  - `ratingCount Int @default(0) @map("rating_count")`
  - `responseTimeMinutes Int? @map("response_time_minutes")`
- [ ] `npx prisma db push && npx prisma generate`.
- [ ] Commit.

### Task 1.2: Storefront response shared type

```ts
// packages/shared/src/types/storefront.ts
import { OfferSummary } from './offers';

export interface StorefrontBusiness {
  id: string;
  name: string;
  verified: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  category: string | null;
  pincode: string | null;
  since: number | null;
  description: string | null;
  hours: Array<{ day: string; open: string; close: string }>;
  phone: string | null;
  address: string | null;
  ratingAvg: number;
  ratingCount: number;
  responseTimeMinutes: number | null;
  pincodeRank: number | null;
  followerCount: number;
  distanceKm: number | null;
  isFollowedByMe: boolean;
  openNow: boolean;
}

export interface StorefrontReview {
  id: string;
  userId: string;
  username: string;
  userAvatarUrl: string | null;
  rating: number | null;
  body: string;
  createdAt: string;
  isVerifiedEruCustomer: boolean;
}

export interface StorefrontTaggedContent {
  id: string;
  thumbnailUrl: string;
  mediaKind: 'photo' | 'video' | 'reel' | 'carousel';
  isTrending: boolean;
  durationSeconds: number | null;
}

export interface StorefrontResponse {
  business: StorefrontBusiness;
  offers: OfferSummary[];          // live only
  reviews: StorefrontReview[];     // top 5 by likes
  taggedContent: StorefrontTaggedContent[]; // 12 most recent
  offersCount: number;
  taggedCount: number;
}
```

- [ ] Export from shared index.
- [ ] Commit.

### Task 1.3: Route

- [ ] RED in `apps/api/tests/routes/storefront.test.ts`:

```ts
it('GET /businesses/:id/storefront returns aggregate payload', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-sf1', phone: '+912000090001', username: 'sf1' });
  const biz = await prisma.business.create({
    data: {
      name: 'Kashi Bakes', category: 'bakery', pincode: '682016', verified: true,
      ratingAvg: 4.7, ratingCount: 287, since: 2015,
      description: 'Kochi\'s favourite artisan bakery.',
      hours: [{ day: 'mon', open: '08:00', close: '22:00' }],
      phone: '+919843215678', address: 'MG Road, Ernakulam',
    },
  });
  // seed 3 offers, 2 reviews, 4 tagged posts
  const res = await getTestApp().inject({
    method: 'GET',
    url: `/api/v1/businesses/${biz.id}/storefront`,
    headers: { Authorization: devToken('dev-test-sf1') },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.business.ratingAvg).toBeCloseTo(4.7);
  expect(body.offers.length).toBeGreaterThan(0);
  expect(body.reviews.length).toBeGreaterThan(0);
  expect(body.taggedContent.length).toBeGreaterThan(0);
});
```

- [ ] GREEN: add subroute in `routes/business.ts`. Use `Promise.all` for parallel fetch of offers/reviews/tagged. Compute `openNow` from current time vs. hours. Compute `distanceKm` from user's primary pincode vs. business pincode. `isFollowedByMe` = existence of `Watchlist` row.
- [ ] Commit.

---

# Feature 2 — Storefront screen pixel parity

**Goal:** `app/business/[id].tsx` matches PWA lines 2364–2512.

**PWA reference checklist:**

### Banner (2367–2375) — 140px gradient

- Back arrow (top-left, 36×36 glass circle)
- ⋯ (top-right, 36×36) + 📤 (next to ⋯)
- Big emoji/logo bottom-left + `Since 20XX` sub

### Header section (2378–2405) — overlaps banner

- 72×72 avatar with white ring (borders the banner)
- Name (18px, 800) + verified ✓ badge
- Category + location (`🎂 Artisan Bakery • 📍 682016 Ernakulam`)
- **4-stat row** (10px padding, border-bottom):
  - `4.7 ★` / `287 reviews`
  - `1,240 followers`
  - `~12 min response time` (green)
  - `🔥 Top 10 in <pincode>` (orange)
- **Actions**:
  - `⭐ Follow & Get Offers` (2/3 width, orange filled)
  - `💬 Message` (1/3 width, gray)
  - `📍` (square gray)

### Tabs (2407–2412)

`About (selected)` / `Offers (N)` / `Reviews` / `Tagged (N)`

### About tab content (2413–2502)

- Description text
- Live Offers section — horizontal carousel of 3 offer cards (same OfferCard shape as P7, distinct per-offer brand border color)
- Info block (3 rows, rounded):
  - 🕒 Open today / `8:00 AM – 10:00 PM` + `OPEN NOW` badge (green)
  - 📞 `+91 98432 15678` + WhatsApp welcome sub + `Call` link
  - 📍 MG Road, Ernakulam + distance + `Directions` link
- Creator content section: header + `See all →` + 3-col grid (12 items mentioned) with video/trending indicators
- Top reviews section: 2 review cards
- Create CTA (teal card): `🎬 Create a reel about Kashi Bakes?` + `Create` button → Create screen with prefilled @business tag

### Task 2.1: Banner + Header

- [ ] RED: gradient banner renders with back/menu/share buttons; avatar overlaps top (negative margin); verified checkmark shown if `business.verified`; category + location exact format.
- [ ] GREEN.
- [ ] Commit.

### Task 2.2: 4-stat row

- [ ] RED: renders 4 stat cells with correct labels and values.
- [ ] GREEN.
- [ ] Commit.

### Task 2.3: Follow + Message buttons

- [ ] RED: tapping Follow calls `POST /watchlist {businessId}`, button flips to `Following`.
- [ ] RED: tapping Message creates a conversation with `kind='business'` and navigates to `/messages/[conversationId]`.
- [ ] GREEN. Commit.

### Task 2.4: Tabs

- [ ] RED: 4 tabs in order, About selected by default; `Offers (N)` count matches `offersCount`; `Tagged (N)` matches `taggedCount`.
- [ ] GREEN.
- [ ] Commit.

### Task 2.5: About tab content

- [ ] RED: description, offers carousel, info block with `OPEN NOW` green badge when `openNow=true`, creator content grid with ▶ and 🔥 overlays, reviews rendered, CTA card present.
- [ ] GREEN. Commit.

### Task 2.6: Offers tab

- [ ] RED: switching to Offers tab shows full list of `offers`, not just the About-tab carousel's 3.
- [ ] GREEN. Commit.

### Task 2.7: Reviews tab

- [ ] RED: renders all reviews, sorted by createdAt desc (or likes desc). Each review card shows user avatar, name + stars, text, "verified Eru customer" badge.
- [ ] GREEN. Commit.

### Task 2.8: Tagged tab

- [ ] RED: renders tagged-UGC 3-col grid. Tapping an item navigates to `/post/[id]`.
- [ ] GREEN. Commit.

### Task 2.9: Create CTA

- [ ] RED: tapping `Create` CTA navigates to `/(tabs)/create?businessTagId=<id>` — query param pre-fills the business-tag chip on the create screen.
- [ ] GREEN: extend create screen's `useLocalSearchParams` handling to read `businessTagId` and seed `taggedBusinessId` state.
- [ ] Commit.

---

# Feature 3 — Follow button = Watchlist

**Goal:** The Storefront Follow button is a UI wrapper around `watchlistService.add(businessId)` (P4 F1). No new endpoint.

This is a verification feature — make sure the button's tests actually cover the watchlist side effect. Already addressed in Feature 2.3.

---

# Feature 4 — Creator × Business dashboard endpoints

**Goal:** Two endpoints return enough for the dashboard: one for active sponsored content with campaign stats, one for pending proposals.

### Task 4.1: `GET /creator/sponsored` response shape

- [ ] `packages/shared/src/types/sponsorship.ts`:

```ts
export interface SponsoredContentItem {
  id: string;
  contentId: string;
  contentTitle: string;
  contentThumbnailUrl: string | null;
  contentMediaKind: 'photo' | 'video' | 'reel' | 'carousel';
  businessId: string;
  businessName: string;
  status: 'live' | 'completed';
  boostAmountRupees: number;
  commissionRupees: number;        // 20% of boostAmountRupees
  reach: number;
  clicks: number;
  claims: number;
  campaignProgressPct: number;     // 0-100
  campaignDaysLeft: number | null;
  startedAt: string;
}

export interface PendingProposalItem {
  id: string;
  contentId: string;
  contentTitle: string;
  contentThumbnailUrl: string | null;
  businessId: string;
  businessName: string;
  businessAvatarUrl: string | null;
  proposedBoostRupees: number;
  yourEarningRupees: number;       // 20% of proposed
  proposedAt: string;
  status: 'proposed' | 'negotiating';
  latestCounter: { byUserId: string; amountRupees: number; at: string } | null;
}

export interface CreatorDashboardResponse {
  monthlyEarnings: {
    totalRupees: number;
    commissionRupees: number;
    pointsEarned: number;
    sponsoredPostsCount: number;
  };
  active: SponsoredContentItem[];
  pending: PendingProposalItem[];
}
```

- [ ] Export from shared index. Commit.

### Task 4.2: Route

- [ ] RED in `apps/api/tests/routes/creator-dashboard.test.ts`:

```ts
it('GET /creator/dashboard returns aggregated dashboard', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-cd1', phone: '+912000090010', username: 'cd1' });
  // seed: 2 live sponsorships, 1 pending proposal, 1 completed sponsorship w/ commission
  const res = await getTestApp().inject({
    method: 'GET',
    url: '/api/v1/creator/dashboard',
    headers: { Authorization: devToken('dev-test-cd1') },
  });
  const body = res.json();
  expect(body.monthlyEarnings.sponsoredPostsCount).toBe(2);
  expect(body.active).toHaveLength(2);
  expect(body.pending).toHaveLength(1);
});
```

- [ ] GREEN: add `GET /api/v1/creator/dashboard` in `routes/sponsorship.ts` or a new `routes/creator.ts`. Compute reach/clicks/claims from SponsoredUGC + Interaction tables.
- [ ] Commit.

---

# Feature 5 — Creator × Business screen pixel parity

**Goal:** `app/sponsorship/index.tsx` matches PWA lines 2234–2361.

**PWA reference checklist:**

### Earnings banner (2243–2264) — dark green gradient

- Label: `SPONSORED CONTENT EARNINGS`
- Big: `₹2,850` + `this month`
- 3-col stats: `₹1,800 Commission (20%)` / `750 Points Earned` / `4 Sponsored Posts`

### How-to (2267–2270) — teal tinted

`💡 How to earn from businesses` + body text.

### Active Sponsored Content (2273–2320)

Cards with green border:
- Thumbnail tile + title + `SPONSORED` + `🔥 LIVE` badges + `Tagged: @BusinessName • Reel 0:32`
- 4-col stats row: Reach / Clicks / Boost Spend (blue) / Your Earning (green)
- Progress bar + `Campaign: 85% budget spent • 3 days left`

### Pending Proposals (2322–2342)

Cards with gold border:
- Thumbnail + title + `⏳ PENDING` badge
- Tagged: `@Business wants to sponsor this!`
- `Proposed boost: ₹2,000 → Your earning: ₹400`
- Accept (green, flex:1) / Negotiate (gray, flex:1) / ✕ (square)

### Create CTA (2344–2350) — teal gradient

- 📸 + `Review a Business & Earn`
- Body: `Visit a local spot, create a reel or post, tag the business. If they boost it, you earn 20% commission!`
- `Create Tagged Content →` button → `/(tabs)/create`

### Task 5.1: Screen tests

- [ ] RED: all the sections — earnings banner, how-to, active cards w/ stats, pending cards w/ 3-button action row, CTA card.
- [ ] GREEN by rewriting `app/sponsorship/index.tsx` to consume the new `CreatorDashboardResponse` shape.
- [ ] Commit.

### Task 5.2: SponsorshipCard component extensions

- [ ] RED: the existing `SponsorshipCard` component renders either Active or Pending variant based on prop. Covers the 4-stat row for Active and 3-button row for Pending.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 6 — Proposal negotiate endpoint

**Goal:** `POST /sponsorship/proposals/:id/negotiate {counterAmountRupees}` lets the creator counter-propose. State transitions to `negotiating`; business app sees and can accept/decline/counter.

### Task 6.1: Schema

- [ ] Add `negotiationHistory Json @default("[]")` to `SponsorshipProposal` (if not present). Each entry: `{byUserId, byKind: 'creator'|'business', amountRupees, at}`.
- [ ] `npx prisma db push`. Commit.

### Task 6.2: Endpoint

- [ ] RED in `apps/api/tests/routes/sponsorship-negotiate.test.ts`:

```ts
it('POST /sponsorship/proposals/:id/negotiate appends to history and sets status=negotiating', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-sn1', phone: '+912000090020', username: 'sn1' });
  const biz = await prisma.business.create({ data: { name: 'X', pincode: '682001' } });
  const content = await seedContent(u.id);
  const prop = await prisma.sponsorshipProposal.create({
    data: { contentId: content.id, creatorId: u.id, businessId: biz.id, boostAmount: 2000, status: 'proposed' },
  });
  const res = await getTestApp().inject({
    method: 'POST',
    url: `/api/v1/sponsorship/proposals/${prop.id}/negotiate`,
    headers: { Authorization: devToken('dev-test-sn1') },
    payload: { counterAmountRupees: 3500 },
  });
  expect(res.statusCode).toBe(200);
  const updated = await prisma.sponsorshipProposal.findUnique({ where: { id: prop.id } });
  expect(updated?.status).toBe('negotiating');
  expect((updated?.negotiationHistory as any[]).length).toBe(1);
});

it('emits proposal:updated to the business via socket', () => { /* ... */ });
it('rejects when proposal.status is already completed or declined', () => { /* ... */ });
```

- [ ] GREEN. Use `emitToUser(businessOwnerId, 'proposal:updated', {...})` (from P4 F2).
- [ ] Commit.

### Task 6.3: Mobile service + UI

- [ ] RED: `sponsorshipService.negotiate(proposalId, counterAmount)` POSTs and refetches the dashboard.
- [ ] RED: tapping Negotiate in SponsorshipCard opens a modal/prompt with numeric input, submits, closes on success.
- [ ] GREEN. Commit.

---

## Playwright smoke

Per protocol §5. Capture:

- Storefront for a seeded Kashi Bakes with rating, followers, response time, top-10 badge, 3 live offers, 3 reviews, 6 tagged posts.
- Creator × Business dashboard with 2 active sponsorships (different brands) and 1 pending proposal. Open the Negotiate modal in the screenshot.

---

## Phase-completion gate

- [ ] `Business` model has all 10 extended fields.
- [ ] `GET /businesses/:id/storefront` returns the full aggregate.
- [ ] Storefront: banner + header + 4-stat row + Follow button wiring watchlist + 4 tabs + About content (description, offers carousel, info block with OPEN NOW, tagged grid, top reviews, Create CTA).
- [ ] Create CTA deep-links to `/(tabs)/create?businessTagId=<id>` which prefills the business tag chip.
- [ ] `GET /creator/dashboard` returns monthly earnings + active + pending.
- [ ] Creator × Business: earnings banner + how-to + active cards w/ 4-stat row + pending cards w/ 3-button row + Review CTA card.
- [ ] `POST /sponsorship/proposals/:id/negotiate` appends to history + emits realtime event + returns 200.
- [ ] Accept / Negotiate / ✕ on pending proposal all work end-to-end.
- [ ] `ALLOW_DEV_TOKENS=true npm test` green in `apps/api`.
- [ ] `npm test` green in `apps/mobile`.
- [ ] `npx tsc --noEmit` clean in both workspaces.
- [ ] Playwright screenshots attached.
- [ ] Commits scoped per protocol §7.

---

## What could go wrong

- **Hours.json schema drift** — the business dashboard (separate app, out of P9 scope) may store hours differently. Pick a shape here (array of `{day, open, close}`) and document; the business app will migrate when it lands.
- **openNow is per-timezone** — compute against IST (`Asia/Kolkata`) explicitly, not server locale.
- **Negotiate race** — if both sides counter at the same time, the second write wins. Either accept that (eventual consistency is fine for proposals) or add optimistic concurrency via a `version` column.
- **Commission math rounding** — 20% of odd rupee amounts produces fractions. Policy: round *down* to nearest rupee. Cover in a test.
- **Aggregate endpoint N+1** — storefront hits 4 sub-queries; use `Promise.all`. Monitor with a perf test (`expect(durationMs).toBeLessThan(500)`) if flaky.
- **`isFollowedByMe` for unauthenticated viewers** — storefront should still load for logged-out viewers eventually (anonymous browsing is out of scope now). Return `false` if no auth.
- **Tagged-UGC includes non-public content** — `taggedContent` must filter `moderationStatus='approved'`. Otherwise pending/declined posts appear on storefronts.

---

## Next phase

Once the gate is green, open [`GapFixP10.md`](./GapFixP10.md) — Phase 6: Polish (my-content, settings, leaderboard).
