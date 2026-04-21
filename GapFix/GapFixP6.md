# GapFix P6 — Phase 2: Core loop (home, create, post-detail)

> **For agentic workers:** Required reading: [`GapFix_Agent_Protocol.md`](./GapFix_Agent_Protocol.md). P4 + P5 must be green. This phase renders and wires the 3 screens that form the app's minimum valuable loop.

**Goal:** A returning user can open Home, see 6 post variants rendering with every badge/CTA/metadata the PWA shows, tap into Post Detail with sort + business-reply threading + points-earning comment input, and Create a new post with 5 formats × 12 subtypes × business tagging.

**Architecture:** Heavy mobile work. API gets response-shape enrichments (Feature 4 of P4 already added the schema; P6 now ships the *computed-field* logic + business search endpoint). Comment word-count gating moves from client to server.

---

## The post-office analogy

The home feed is a **letter carrier walking their route**: they deliver many kinds of envelopes — regular mail (photo UGC), packages (video), express bills (sponsored), postcards (polls), personal notes from known senders (creator posts), and occasional registered mail with a signature required (boost proposals that show up as notifications). Each envelope has its own markings, return address, and urgency. Create is the **post office counter**: you choose envelope size (format) and service type (content type), write your message, attach photos, address it. Post Detail is **reading mail at your kitchen table**: you see the letter, can reply, can see who else has replied. P6 is ensuring every envelope type is correctly labeled, every counter form has the right boxes, and every reply lands in the right inbox.

---

## Feature inventory

| # | Feature | Backend | Mobile | Priority |
|---|---------|---------|--------|----------|
| 1 | Feed response derived fields | Already shipped in P4 F4 — verify only | PostCard 6 variants | P6a |
| 2 | Home screen pixel parity | — | Story row, app header, FlatList | P6a |
| 3 | Create screen pixel parity (format tabs + 12 subtypes + tagging) | `GET /businesses/search` (lockdown + fuzzy match) | Content type grid, business tag autocomplete, moderation/points banners | P6b |
| 4 | Post Detail pixel parity | Comment sort by top; business reply flag | Post header, action row, comment list w/ business reply styling, +3pt input | P6c |
| 5 | Comment word-count gating server-side | `POST /content/:id/comments` validates ≥ 10 words for points | Remove client-side gating | P6c |

Sub-groupings:

- **P6a** — home feed (blocks nothing — ship first)
- **P6b** — create (blocks nothing)
- **P6c** — post detail (depends on feed-item fields and comment API)

Parallelizable after Feature 1 is verified.

---

## Prerequisites

- [ ] P4 + P5 green.
- [ ] `Content.businessTagId` FK present (P4 F4).
- [ ] `FeedPostItem` shared type has all derived fields (P4 F4).
- [ ] `ContentSubtypeSelector` component exists (from P3) with 12 subtypes.

---

## Existing-implementation audit (RUN FIRST)

### C1. Current PostCard rendering

```
Read: apps/mobile/components/PostCard.tsx
```

Confirm what it renders today (from agent audit: like/dislike/comment/share/save + caption + comment count + video). Gap: UGC/moderation badges, sponsored label, Claim Offer CTA, per-post points badge, location, time-ago, carousel dots, reel-type badge.

### C2. Current create screen

```
Read: apps/mobile/app/(tabs)/create.tsx
Read: apps/mobile/components/ContentSubtypeSelector.tsx
```

Confirm: 5 format tabs, 12 subtypes exist, poll + thread composer, media picker, hashtag input, location picker, user-tag picker. Gap: media preview grid visual, points preview card, business tag autocomplete, moderation notice with timeframe + approval points, tab styling.

### C3. Current post-detail

```
Glob: apps/mobile/app/post/**/*.tsx
Read: (the file Glob finds)
Read: apps/mobile/components/CommentInput.tsx
```

Confirm existing fields and gaps (business reply styling, sort dropdown, stars on review comments, points hint).

### C4. Feed endpoint response shape

```
Read: apps/api/src/routes/feed.ts
```

Confirm after P4 F4: includes `ugcBadge`, `moderationBadge`, `isSponsored`, `sponsorName`, `offerUrl`, `pointsEarnedOnView`, `locationLabel`, `createdAt`, `mediaKind`, `durationSeconds`, `carouselCount`. If any missing, fix in P4 before starting P6.

### C5. Business search

```
Grep: pattern="businesses/search|business.*search" path=apps/api/src/routes
```

Expected: some search endpoint — check path. If `GET /api/v1/businesses/search?q=<query>` doesn't exist, add it in Feature 3 below.

### C6. Comment word-count

```
Grep: pattern="wordCount|word_count|\\.split\\(" path=apps/api/src/routes/content.ts
Grep: pattern="wordCount|\\.split" path=apps/mobile/components/CommentInput.tsx
```

If any client-side word-count gating exists in `CommentInput.tsx`, note it — it will move to server.

---

# Feature 1 — Verify feed derived fields (sanity)

**Goal:** Before touching mobile PostCard, prove that the feed response includes every field PostCard needs. If P4 F4 was done correctly, this is a 5-minute test. If not, fix P4 before P6.

### Task 1.1: Contract smoke test

- [ ] RED in `apps/api/tests/routes/feed.test.ts` (extend):

```ts
it('feed item has every field PostCard needs to render all 6 PWA variants', async () => {
  // seed: 1 creator user, 1 business, 1 poll, 1 sponsored post (business + offer), 1 UGC approved, 1 reel
  const res = await getTestApp().inject({
    method: 'GET',
    url: '/api/v1/feed',
    headers: { Authorization: devToken('dev-test-feed1') },
  });
  const items = res.json().items;
  for (const item of items) {
    expect(item).toEqual(expect.objectContaining({
      id: expect.any(String),
      ugcBadge: expect.any(String),  // 'creator' | 'user_created' | null — but at least a property
      moderationBadge: expect.anything(),
      isSponsored: expect.any(Boolean),
      offerUrl: expect.anything(),
      pointsEarnedOnView: expect.any(Number),
      locationLabel: expect.anything(),
      createdAt: expect.any(String),
      mediaKind: expect.any(String),
      durationSeconds: expect.anything(),
      carouselCount: expect.anything(),
    }));
  }
});
```

- [ ] GREEN by confirming P4 F4 shipped the fields. If not: **stop P6, finish P4 F4**.

---

# Feature 2 — Home screen pixel parity

**Goal:** `app/(tabs)/index.tsx` + `PostCard.tsx` + `StoryRow.tsx` render exactly the PWA home feed.

**PWA reference checklist (lines 485–693):**

### App header (lines 488–499)

- Eru logo (26px, Georgia italic, g800)
- PointsBadge (existing) — shows `🪙 4,820` + `🔥24` streak, background rgba green
- 🔔 bell with red unread count badge (border white, 1.5px)
- ✉️ messages icon

### Stories row (lines 502–519)

- "Your story" first slot with 📷+ overlay
- 7 other story entries with rings (`.unseen`, `.seen`, `.live`), usernames, optional `LIVE` overlay

### 6 post variants (lines 521–683)

**Variant 1: Creator photo (UGC)**
- Avatar (34×34 ring), username + verified checkmark + `• 32m` time
- Location line: `Munnar, Kerala`
- Right-aligned points badge: `🪙 +8` (rgba green)
- Square image
- **`✓ CREATOR` badge** (top-left, teal rgba)
- Actions row: like 🤍, dislike 👎 (55% opacity), comment 💬, share 📤, save 🏷
- Like count: `5,124 likes`
- Caption with hashtags in blue: `Monsoon mornings in Munnar hit different...`
- Comment preview + `View all 342 comments`

**Variant 2: Creator video**
- Same shape as V1, plus:
- Play button circle in center (64px, backdrop blur)
- Duration badge bottom-right: `4:32`

**Variant 3: Sponsored (business)**
- Avatar tappable → Storefront
- Name: `Kashi Bakes • Sponsored` (sponsored label is g400, not orange)
- Location: `📍 682016 • 0.8 km`
- Points badge: `🪙 +15`
- **CTA bar overlaid** bottom of image: full-width `Claim Offer →` orange button with shadow

**Variant 4: UGC (user created, approved)**
- Avatar normal (no ring)
- Username + time (no verified)
- Both `✓ USER CREATED` + `✓ APPROVED` badges inline
- Points badge: `🪙 +30`
- Carousel with 3 dots (first active, blue)
- Standard action row

**Variant 5: Poll**
- Avatar + `Eru Community` + verified + time
- Points badge: `🪙 +25`
- Poll container (padding 10 14):
  - Question (16px, 700): `🍜 Best street food in Kochi?`
  - 4 options (rounded 10px). Selected has orange border + orange tint fill bar. Vote bar widths match percentages.
  - Percentage label right-aligned (14px, 700; orange when selected, g500 otherwise)
  - Total: `4,200 votes • 🪙 +25 earned`
- Standard action row

**Variant 6: Reel (UGC)**
- UGC badge + APPROVED
- Aspect 4/5 (taller than square)
- Play button + reel badge top-left: `▶ Reel • 0:45`
- Caption has `...more` truncation indicator

**Files:**

- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/components/PostCard.tsx` (major rewrite)
- Modify: `apps/mobile/components/PollCard.tsx`
- Modify: `apps/mobile/components/StoryRow.tsx`
- Create: `apps/mobile/components/UgcBadge.tsx`
- Create: `apps/mobile/components/SponsoredCtaBar.tsx`
- Create: `apps/mobile/components/CarouselDots.tsx`
- Create: `apps/mobile/components/ReelTypeBadge.tsx`
- Create: `apps/mobile/components/PostPointsBadge.tsx`
- Create: `apps/mobile/components/RelativeTime.tsx`
- Modify: `apps/mobile/__tests__/components/PostCard.test.tsx`

### Task 2.1: Small badge components (RED + GREEN per component)

For each of UgcBadge, SponsoredCtaBar, CarouselDots, ReelTypeBadge, PostPointsBadge, RelativeTime:

- [ ] Write 1–2 failing snapshot-free tests (one per prop variant) that assert text + accessibility labels.
- [ ] Implement.
- [ ] Commit: `feat(mobile): <Component> — PWA parity primitive`.

Example — UgcBadge:

```tsx
// __tests__/components/UgcBadge.test.tsx
describe('<UgcBadge />', () => {
  it('renders "✓ CREATOR" when variant=creator', () => {
    const { getByText } = render(<UgcBadge variant="creator" />);
    expect(getByText(/✓ CREATOR/)).toBeTruthy();
  });
  it('renders "✓ USER CREATED" when variant=user_created', () => {
    expect(render(<UgcBadge variant="user_created" />).getByText(/✓ USER CREATED/)).toBeTruthy();
  });
  it('returns null when variant=null', () => {
    const { UNSAFE_root } = render(<UgcBadge variant={null} />);
    expect(UNSAFE_root.children).toHaveLength(0);
  });
});
```

### Task 2.2: PostCard variant tests

- [ ] RED in `__tests__/components/PostCard.test.tsx` (expand existing):

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { PostCard } from '@/components/PostCard';

const basePost = {
  id: 'p1',
  author: { id: 'u1', username: 'KeralaDiaries', verified: true, avatarUrl: null },
  mediaKind: 'photo',
  media: [{ url: 'x', thumbnailUrl: 'x' }],
  caption: 'Monsoon mornings…',
  hashtags: ['KeralaMonsoon', 'Munnar'],
  likeCount: 5124,
  commentCount: 342,
  dislikeCount: 0,
  ugcBadge: 'creator' as const,
  moderationBadge: null,
  isSponsored: false,
  sponsorName: null,
  sponsorAvatarUrl: null,
  sponsorBusinessId: null,
  offerUrl: null,
  pointsEarnedOnView: 8,
  locationLabel: 'Munnar, Kerala',
  locationPincode: '685613',
  createdAt: new Date(Date.now() - 32 * 60_000).toISOString(),
  durationSeconds: null,
  carouselCount: null,
};

describe('<PostCard /> variants (PWA parity)', () => {
  it('V1 creator photo: shows ✓ CREATOR, location, +8 pts, 5,124 likes, 342 comments', () => {
    const { getByText } = render(<PostCard post={basePost} isActive={false} />);
    expect(getByText('✓ CREATOR')).toBeTruthy();
    expect(getByText('Munnar, Kerala')).toBeTruthy();
    expect(getByText(/🪙 \+8/)).toBeTruthy();
    expect(getByText(/5,124 likes/i)).toBeTruthy();
    expect(getByText(/View all 342 comments/i)).toBeTruthy();
    expect(getByText(/32m/)).toBeTruthy();  // relative time
  });

  it('V2 creator video: shows play button + duration badge', () => {
    const video = { ...basePost, mediaKind: 'video' as const, durationSeconds: 272 };
    const { getByLabelText, getByText } = render(<PostCard post={video} isActive={false} />);
    expect(getByLabelText('play')).toBeTruthy();
    expect(getByText('4:32')).toBeTruthy();
  });

  it('V3 sponsored: • Sponsored label + distance + Claim Offer CTA', () => {
    const sp = {
      ...basePost,
      isSponsored: true,
      sponsorName: 'Kashi Bakes',
      sponsorBusinessId: 'b1',
      offerUrl: '/offers/20-off-cakes',
      locationLabel: '682016 • 0.8 km',
      pointsEarnedOnView: 15,
      ugcBadge: null,
    };
    const { getByText } = render(<PostCard post={sp} isActive={false} />);
    expect(getByText(/Kashi Bakes/)).toBeTruthy();
    expect(getByText(/• Sponsored/)).toBeTruthy();
    expect(getByText(/0\.8 km/)).toBeTruthy();
    expect(getByText(/🪙 \+15/)).toBeTruthy();
    expect(getByText(/Claim Offer/i)).toBeTruthy();
  });

  it('V3 sponsored: tapping name/avatar navigates to storefront', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, replace: jest.fn() });
    const sp = { ...basePost, isSponsored: true, sponsorName: 'Kashi Bakes', sponsorBusinessId: 'b1' };
    const { getByText } = render(<PostCard post={sp} isActive={false} />);
    fireEvent.press(getByText(/Kashi Bakes/));
    expect(push).toHaveBeenCalledWith('/business/b1');
  });

  it('V4 UGC approved: ✓ USER CREATED + ✓ APPROVED + carousel dots', () => {
    const ugc = {
      ...basePost,
      ugcBadge: 'user_created' as const,
      moderationBadge: 'approved' as const,
      mediaKind: 'carousel' as const,
      carouselCount: 3,
    };
    const { getByText, getByLabelText } = render(<PostCard post={ugc} isActive={false} />);
    expect(getByText('✓ USER CREATED')).toBeTruthy();
    expect(getByText('✓ APPROVED')).toBeTruthy();
    expect(getByLabelText('carousel indicator')).toBeTruthy();  // renders 3 dots
  });

  it('V5 poll: renders question + 4 options + vote-bar widths', () => {
    const poll = {
      ...basePost,
      mediaKind: 'poll' as const,
      poll: {
        question: '🍜 Best street food in Kochi?',
        options: [
          { id: 'a', text: 'Sharjah Shake at Beach', percent: 42, selected: true },
          { id: 'b', text: 'Pazhampori from bakery', percent: 31, selected: false },
          { id: 'c', text: 'Fish fry Fort Kochi', percent: 18, selected: false },
          { id: 'd', text: 'Egg puffs anywhere 🥚', percent: 9, selected: false },
        ],
        totalVotes: 4200,
      },
    };
    const { getByText } = render(<PostCard post={poll} isActive={false} />);
    expect(getByText(/Best street food in Kochi\?/)).toBeTruthy();
    expect(getByText(/4,200 votes/)).toBeTruthy();
    expect(getByText(/42%/)).toBeTruthy();
    // assert the selected option has an orange-tint style somehow (via test id or accessible state)
  });

  it('V6 reel: renders ▶ Reel • 0:45 badge + 4/5 aspect', () => {
    const reel = { ...basePost, mediaKind: 'reel' as const, durationSeconds: 45 };
    const { getByText } = render(<PostCard post={reel} isActive={false} />);
    expect(getByText(/▶ Reel • 0:45/)).toBeTruthy();
  });
});
```

- [ ] GREEN by rewriting `PostCard.tsx` to handle all 6 variants. Break out sub-components for header, image block, actions, caption, comments preview.
- [ ] Commit: `feat(mobile): PostCard — 6 PWA variants with exact badges, CTAs, and metadata`.

### Task 2.3: Dislike button polish

- [ ] RED: assert dislike button has 55% opacity by default, tooltip/accessibility label `"Not for me — helps us improve your feed and affects creator score"`.
- [ ] GREEN: style adjust in PostCard.
- [ ] Commit.

### Task 2.4: Stories row

- [ ] RED: assert StoryRow renders 3 ring variants (unseen with gradient, seen with gray, live with red badge), plus "Your story" slot with `+` overlay routes to `/(tabs)/create`.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 3 — Create screen pixel parity

**Goal:** `app/(tabs)/create.tsx` matches PWA lines 696–851.

**PWA reference checklist:**

### Header (697–702)

- Close ✕ (→ back)
- Title: `Create Post` (16px, 800)
- Right `Next →` (14px, 700, blue)

### Format tabs (703–709)

- 5 tabs underline-style: `📝 Post`, `📸 Photo`, `🎬 Reel`, `📊 Poll`, `📖 Thread`
- Active: bold + underline g800

### Content type section (711–784)

- Section header: `📋 What type of content?` + helper: `Shapes reach & earnings`
- **12-card grid** (2 columns, 6 rows) with selected state. All 12 from PWA:
  - ⭐ Review — `Rate a business or product`
  - 💡 Recommendation — `Suggest a place or product`
  - 🎬 Vlog / Day-in-Life — `Behind-the-scenes, experience`
  - 📸 Photo Story — `Visual carousel or album`
  - 📖 Tutorial / How-to — `Step-by-step guide or lesson`
  - 🆚 Comparison — `A vs B side-by-side`
  - 📦 Unboxing / First Try — `Trying something new`
  - 🎪 Event Coverage — `Festival, pop-up, opening`
  - 🔥 Hot Take / Opinion — `Discussion starter, debate`
  - 😂 Meme / Fun — `Humor, entertainment`
  - 🍳 Recipe — `Food recipe or cooking guide`
  - 📍 Local Guide — `Hidden gems, neighbourhood walks`
- Selected shows check badge top-right, orange border, tinted background.
- Below grid: contextual banner — when Review selected: `⭐ Review selected: Tag a business with @name to earn 20% commission if they boost your content. Reviews get 3x more reach from local users.`
- Each subtype has its own banner text per PWA; derive from the Dev Spec content-type table.

### Compose area (785–791)

- User avatar (36×36 circle gradient)
- Textarea 15px, line-height 1.5, placeholder: `What's on your mind? Share a photo, write a review, tell a story...`

### Media preview grid (792–797)

- 3-column grid, 2-gap. Selected photos render inline. Trailing `+` tile opens picker.

### Hashtag chips (798–807)

- Label: `Add tags`
- Row of selected chips (blue outlined) + `+ Add` pill.

### Location (808–813)

- Icon + label: `Fort Kochi, 682001` + right-aligned `Change`.

### Business tag (814–827) — orange highlighted

- Label: `🏪 Tag a Business` + green `+20% commission` badge
- Chip: `@PageTurnerKochi` with ✕ remove.
- Help text: `The business will see your content. If they boost it as sponsored, you earn 20% of their spend — real money, not just points!`

### Moderation notice (828–835) — gold tinted

- `🛡️ Content Review`
- `Your post will be reviewed by Eru's moderation team before it appears in the public feed. Most posts are approved within 15 minutes. You'll earn +30 pts once approved.`

### Points preview (836–844) — green tinted

- `🪙 Points You'll Earn`
- 3 columns: `Post approved +30`, `Each like received +1`, `If it trends +200` (orange).

### Bottom toolbar (846–849)

- 6 icon buttons: 📷 🎬 📊 📍 👤 🎵 + right-aligned primary `Share →` (orange).

**Files:**

- Modify: `apps/mobile/app/(tabs)/create.tsx` (major rewrite)
- Modify: `apps/mobile/components/ContentSubtypeSelector.tsx` (ensure 12 subtypes + contextual banner derived from the subtype)
- Create: `apps/mobile/components/BusinessTagPicker.tsx` (new component — autocomplete)
- Create: `apps/mobile/components/PointsPreviewCard.tsx`
- Create: `apps/mobile/components/ModerationNoticeCard.tsx`
- Modify: `apps/mobile/services/businessService.ts` — `search(q)` call
- Modify: `apps/api/src/routes/business.ts` — ensure `GET /api/v1/businesses/search?q=<q>` is present + lockdown

### Task 3.1: Business search API

- [ ] RED in `apps/api/tests/routes/business-search.test.ts`:

```ts
it('GET /api/v1/businesses/search?q=kash returns fuzzy matches', async () => {
  await seedUser({ firebaseUid: 'dev-test-bs1', phone: '+912000050001', username: 'bs1' });
  await prisma.business.createMany({
    data: [
      { name: 'Kashi Bakes', category: 'bakery', pincode: '682016' },
      { name: 'Brew District', category: 'cafe', pincode: '682001' },
    ],
  });
  const res = await getTestApp().inject({
    method: 'GET',
    url: '/api/v1/businesses/search?q=kash',
    headers: { Authorization: devToken('dev-test-bs1') },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.items).toHaveLength(1);
  expect(body.items[0].name).toBe('Kashi Bakes');
});

it('returns 400 on empty q', async () => { /* ... */ });
it('caps results at 10', async () => { /* ... */ });
```

- [ ] GREEN: add `GET /search` subroute in `routes/business.ts` that does `Business.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, take: 10 })`. Annotate response `Promise<BusinessSearchResponse>` from new shared type.
- [ ] RED + GREEN for mobile service.
- [ ] Commit: `feat(api): GET /businesses/search + shared type lockdown`.

### Task 3.2: BusinessTagPicker component

- [ ] RED: autocomplete shows results after 150ms debounce; tapping a result selects it; selected chip shows `@Name` with ✕; visible only when content type is "review" (or user explicitly adds).
- [ ] GREEN.
- [ ] Commit.

### Task 3.3: ContentSubtypeSelector contextual banner

- [ ] RED: for each of the 12 subtypes, the banner text below the grid matches the PWA-specified copy. If a subtype doesn't have banner text in PWA, it uses a default from the Dev Spec content-type table.
- [ ] GREEN: move banner text to a `SUBTYPE_BANNERS` constant (in `@eru/shared/constants/content.ts`) keyed by subtype.
- [ ] Commit: `feat(shared): SUBTYPE_BANNERS — 12 subtypes with contextual reach/earnings copy`.

### Task 3.4: Create screen pixel parity

- [ ] RED tests asserting:
  - 5 format tabs render in exact order with exact labels
  - 12 subtype cards render with exact title + body
  - Subtype selection updates contextual banner
  - PointsPreviewCard shows `+30 / +1 / +200` breakdown
  - ModerationNoticeCard shows 15-minute copy exactly
  - BusinessTagPicker opens only when subtype=review (for now) OR user taps the 👤 toolbar button
  - Toolbar has 6 icons in exact order: 📷 🎬 📊 📍 👤 🎵
  - `Share →` submits and navigates to `/my-content`
- [ ] GREEN.
- [ ] Commit: `feat(mobile): create screen pixel-parity — 12 subtypes, business tag autocomplete, moderation + points cards`.

### Task 3.5: Content-create payload extends with businessTagId

- [ ] RED in `apps/api/tests/routes/content-create.test.ts`:

```ts
it('POST /content/create accepts businessTagId and persists it', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-cc1', phone: '+912000050010', username: 'cc1' });
  const b = await prisma.business.create({ data: { name: 'Kashi Bakes', pincode: '682016' } });
  const res = await getTestApp().inject({
    method: 'POST',
    url: '/api/v1/content/create',
    headers: { Authorization: devToken('dev-test-cc1') },
    payload: { type: 'post', subtype: 'review', text: 'Best cake ever', businessTagId: b.id, mediaIds: [], hashtags: [] },
  });
  expect(res.statusCode).toBe(201);
  const content = await prisma.content.findFirst({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } });
  expect(content?.businessTagId).toBe(b.id);
});

it('notifies the tagged business via FCM when a review is created', async () => {
  // mock FCM; assert notification call with the business's FCM topic
});
```

- [ ] GREEN: extend `routes/content.ts` Zod schema with optional `businessTagId`, persist it. Call `notificationService.createForBusiness(businessId, 'new_ugc_tag', ...)` on create.
- [ ] Commit.

---

# Feature 4 — Post Detail pixel parity

**Goal:** `app/post/[id].tsx` matches PWA lines 2739–2848.

**PWA reference checklist:**

### Header (2741–2745)

- Back arrow → previous screen
- Title: `Post` (14px, 700)
- Right ⋯ (action sheet trigger)

### Post block (2747–2774)

- Same as V3 sponsored variant from feed if sponsored, else full V1/V2/V4/V5/V6 as appropriate. Include:
- CTA button overlaid on sponsored image: `🎂 Claim 20% off →`
- Action row: like/dislike/comment/share + bookmark right-aligned.
- Likes/dislikes line: `890 likes • 12 dislikes`.
- Caption with hashtags in blue.
- Time-ago: `2 hours ago`.

### Comments section (2777–2832)

- Header: `Comments (67)` + right `Most liked ▾` (sort dropdown).
- Each comment:
  - Avatar (32×32)
  - Card (gray rounded): username + stars if review rating + body text.
  - Footer row: time, `Like (N)`, `Reply` or `Reply (M)`.
- **Business reply** (nested under parent comment):
  - Avatar (26×26)
  - Card (orange-tinted rounded)
  - Username in orange + verified ✓
  - Body text

### Comment input (2833–2839)

- User avatar left (32×32)
- Input (g50 bg, g200 border, placeholder: `Add a comment... (+3 pts for 10+ words)`)
- 😊 emoji picker
- `Post` (blue, 14px, 700)

**Files:**

- Modify: `apps/mobile/app/post/[id].tsx`
- Modify: `apps/mobile/components/CommentInput.tsx`
- Create: `apps/mobile/components/CommentRow.tsx`
- Create: `apps/mobile/components/BusinessReplyCard.tsx`
- Create: `apps/mobile/components/CommentSortDropdown.tsx`
- Modify: `apps/api/src/routes/content.ts` — comment POST validates word count server-side + credits `+3 pts` iff ≥ 10 words
- Modify: `apps/api/src/services/pointsEngine.ts` — `comment` action conditional

### Task 4.1: Comment server-side gating

- [ ] RED in `apps/api/tests/routes/content-comments.test.ts`:

```ts
it('POST /content/:id/comments credits +3 pts when body has >= 10 words', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-cm1', phone: '+912000050020', username: 'cm1' });
  const post = await seedContent(u.id);
  const res = await getTestApp().inject({
    method: 'POST',
    url: `/api/v1/content/${post.id}/comments`,
    headers: { Authorization: devToken('dev-test-cm1') },
    payload: { text: 'This is a long thoughtful comment with more than ten words included.' },
  });
  expect(res.statusCode).toBe(201);
  const ledger = await prisma.pointsLedger.findMany({ where: { userId: u.id, actionType: 'comment' } });
  expect(ledger).toHaveLength(1);
  expect(ledger[0].points).toBe(3);
});

it('credits 0 pts when body has < 10 words', async () => {
  // Same as above but body = 'short one' → no ledger entry
});
```

- [ ] GREEN: add word-count check in the comment handler. Use `.trim().split(/\s+/).filter(Boolean).length`.
- [ ] Commit.

### Task 4.2: Remove client-side gating (if any)

- [ ] Audit `CommentInput.tsx` — remove any `validateWordCount` pre-submit hook. The placeholder text `(+3 pts for 10+ words)` stays (informational), but gating happens server-side.

### Task 4.3: Comment sort endpoint

- [ ] RED: `GET /content/:id/comments?sort=top&page=1` returns comments ordered by like_count DESC then recency. `sort=recent` orders by created_at DESC.
- [ ] GREEN: extend `routes/content.ts` comments handler with the Zod query parser; reuse `getComments()` service if exists, otherwise add switch.
- [ ] Commit.

### Task 4.4: Post Detail UI

- [ ] RED: all the PWA block tests (header, post block, comments header, sort dropdown, comment rows, business reply styling, comment input placeholder text).
- [ ] GREEN.
- [ ] Commit.

### Task 4.5: Business reply rendering

- [ ] RED: comments whose author is a business (e.g., `comment.author.kind === 'business'`) render inside `BusinessReplyCard` (orange-tint bg, ✓ verified, indented under parent).
- [ ] GREEN. Requires the comment response to carry `author.kind` and `author.verified` — extend `CommentItem` shared type if needed.
- [ ] Commit.

---

# Feature 5 — Points-earning on sponsored impression + click

**Goal:** When a sponsored post is visible on screen for ≥ 2s, fire `view_sponsored` action (+2 pts). When CTA is tapped, fire `click_sponsored_cta` (+5).

**Why here:** P6 feed renders sponsored posts; the earning actions are already defined in `pointsEngine.ts` (P4 F6). The missing piece is client-side fire + server credit.

### Task 5.1: Impression detection

- [ ] Failing test in `__tests__/components/PostCard.test.tsx`:

```ts
it('fires actionsService.earn(view_sponsored) once after 2s in view for a sponsored post', () => {
  jest.useFakeTimers();
  const earn = jest.spyOn(actionsService, 'earn').mockResolvedValue({ pointsCredited: 2 });
  render(<PostCard post={sponsoredPost} isActive={true} />);
  jest.advanceTimersByTime(2100);
  expect(earn).toHaveBeenCalledWith({ actionType: 'view_sponsored', contentId: sponsoredPost.id });
});

it('does NOT fire view_sponsored for a non-sponsored post', () => {
  // ...
});

it('fires only once per post per session (dedup)', () => {
  // ...
});
```

- [ ] GREEN: add a `useImpressionTimer` hook that fires once `isActive === true` for 2 seconds and the post is sponsored. Dedup via a Set in the parent screen.
- [ ] Commit.

### Task 5.2: CTA click

- [ ] RED: tapping `Claim Offer →` fires `click_sponsored_cta` and navigates to the offer URL (or storefront with offerId).
- [ ] GREEN.
- [ ] Commit.

---

## Playwright smoke

Per protocol §5, capture for:

- home screen with each of the 6 post variants visible (seed test data first)
- create screen with Review subtype selected (to show business-tag highlighted card) and Meme subtype selected (to show fun card)
- post detail with 3 comments including one business reply

Paste screenshots into PR description.

---

## Phase-completion gate

- [ ] Home screen renders all 6 post variants exactly to PWA.
- [ ] PostCard: UGC / Moderation / Sponsored badges; carousel dots; reel badge; points badge; location; time-ago; claim-offer CTA; tapping sponsor name routes to storefront.
- [ ] Dislike at 55% opacity with tooltip.
- [ ] Stories row renders 3 ring variants + "your story" slot.
- [ ] Create screen: 5 format tabs, 12 subtypes, contextual banners per subtype, business tag autocomplete, moderation + points cards, 6-icon toolbar + Share.
- [ ] `POST /content/create` accepts and persists `businessTagId`; business gets FCM on new UGC tag.
- [ ] Post Detail: header, post block (sponsored CTA variant), sort dropdown, comment rows with business reply styling, +3pt hint.
- [ ] Comment +3 pts credited server-side iff word-count ≥ 10 (not client).
- [ ] Comment sort query works (`?sort=top` and `?sort=recent`).
- [ ] `view_sponsored` fires once per post per session after 2s visible; `click_sponsored_cta` on CTA tap.
- [ ] `ALLOW_DEV_TOKENS=true npm test` green in `apps/api`.
- [ ] `npm test` green in `apps/mobile`.
- [ ] `npx tsc --noEmit` clean in both workspaces.
- [ ] Playwright side-by-side screenshots attached for home, create, post-detail.
- [ ] Commits scoped per protocol §7.

---

## What could go wrong

- **Impression timer fires during scroll** — `isActive` state must account for the FlatList's viewability config (60% threshold per `useFeed`). Don't use "mount" as impression trigger.
- **Dedup set leaks** — if the Set stays in a parent component that remounts, you'll over-credit. Keep it in a `useRef` scoped to the screen.
- **Business search N+1** — when rendering 10 results, don't fetch `_count.offers` per row synchronously; use a single Prisma query with `include` in the route handler.
- **Comment 10-word rule counts emoji** — normalize: `text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).length`. Test with "👍 👍 👍 only emoji" → 2 words (filter out single emojis? dev spec is ambiguous; decide and document).
- **Sponsored + creator combo** — a creator can author a post that becomes sponsored later. Precedence rule: show `isSponsored=true` label, **also** show `CREATOR` badge. PWA V3 shows only sponsor label; treat CREATOR as secondary in that case — verify visual.
- **Poll render clipping** — the PWA poll container has a max height. On long option text, mobile must wrap without breaking the percentage alignment. Add a visual test.

---

## Next phase

Once the gate is green, open [`GapFixP7.md`](./GapFixP7.md) — Phase 3: Earn/Redeem loop (wallet, redeem, my-rewards).
