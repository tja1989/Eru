# GapFix P2 — Discovery, Community & Creator Economy

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. TDD rules identical to P0 — see [P0 TDD Protocol](./GapFixP0.md#tdd-protocol).

**Goal:** Open the community and creator economy. Users discover local businesses with full storefront pages. Creators and brands can DM each other. Sponsored-content dashboards show boost earnings. Stories, richer leaderboard, and reel tabs round out the social polish.

**Architecture:** Three new domain models (`Conversation`, `Message`, `Story`) + extensions to the `Business` and `Offer` models from P1. Creator×Business introduces a `SponsorshipProposal` model. Lots of mobile screen work; backend is ~40% of the effort.

**Tech Stack:** Same as P0/P1 + optional: WebSockets via Fastify plugin `@fastify/websocket` for live DMs (can defer to polling for MVP); `expo-notifications` for push on new DM.

---

## The neighbourhood market analogy

Think of the Eru economy as a **local market on a Saturday morning**. P0 + P1 gave you:
- Stalls with customers walking past (feed + reels)
- A bursar handing out loyalty stamps (points + rewards)
- A redemption booth (Redeem + My Rewards)

P2 fills out the social layer of the market:

| Mockup feature | Analogy | What we build |
|---|---|---|
| **Business Storefront** | Each stall has a signboard, offers list, reviews, "call the owner" button | Full business profile screen with tabs |
| **Messages / DMs** | People whisper deals to each other | Conversation list + chat screens |
| **Creator × Business** | Sponsorship board showing which stall pays which influencer | Dashboard + proposal accept/reject |
| **Stories** | "What's happening today" sandwich board at the market entrance | Story rings at top of home feed |
| **Top-3 podium** | Podium stage with the best stall holder of the week | Visual podium component |
| **Reel tabs** | "What's trending" / "People you follow" / "Near you" signs above the reel booth | Tab bar on reels |
| **Leaderboard scope** | "Kerala's best" / "India's best" / "Your street's best" filter | Scope tabs |

**Key Insight:** P2 is the biggest P in code volume, but also the one with the **smallest impact per line**. P0 + P1 are product-critical. P2 is product-polish that unlocks B2B2C (businesses paying creators). Ship P0+P1 first; consider whether to fully ship P2 at launch or slice it.

---

## Big-picture schema additions

```
          ┌──────────────┐
          │ Conversation │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   Message    │  (stream per conversation)
          └──────────────┘

┌─────────┐        ┌──────────────────────┐
│ Content │◄──────►│ SponsorshipProposal  │
└─────────┘ 1    1 └──────────┬───────────┘
                              │
                        ┌─────▼────┐
                        │ Business │
                        └──────────┘

┌────────┐        ┌───────────────┐
│ Story  │◄──────►│ StoryView     │  (track who saw what)
└────────┘ 1    * └───────────────┘
```

---

## TDD Protocol

Same rules as P0. Brief reminder: RED → Verify fails → GREEN → Verify passes → REFACTOR → Commit. One behavior per test.

---

## Prerequisites

- [ ] P0 complete (mobile test infra + auth + comments + notifications + follow + share)
- [ ] P1 complete (offers + rewards + quests + spin + badges + `Business` table)
- [ ] Decide: polling vs WebSockets for DMs. **Recommendation: start with polling (5-second interval) for MVP; swap to WebSockets when DAU > 1K.**

---

## File structure

### New files

```
apps/api/
├── prisma/migrations/
│   └── YYYYMMDD_p2_messages_stories/migration.sql       (auto)
├── src/
│   ├── routes/
│   │   ├── business.ts                                  (NEW)
│   │   ├── messages.ts                                  (NEW)
│   │   ├── sponsorship.ts                               (NEW)
│   │   └── stories.ts                                   (NEW — replaces stub)
│   └── services/
│       ├── businessService.ts                           (NEW)
│       ├── messagesService.ts                           (NEW)
│       ├── sponsorshipService.ts                        (NEW)
│       └── storiesService.ts                            (NEW)
└── tests/
    ├── routes/
    │   ├── business.test.ts
    │   ├── messages.test.ts
    │   ├── sponsorship.test.ts
    │   └── stories.test.ts
    └── services/
        ├── messagesService.test.ts
        └── storiesService.test.ts

apps/mobile/
├── app/
│   ├── business/[id]/
│   │   └── index.tsx                                    (NEW — storefront)
│   ├── messages/
│   │   ├── index.tsx                                    (NEW — conversation list)
│   │   └── [id].tsx                                     (NEW — chat detail)
│   ├── sponsorship/
│   │   └── index.tsx                                    (NEW — creator×biz dashboard)
│   └── stories/
│       └── [id].tsx                                     (NEW — story viewer)
├── components/
│   ├── Storefront.tsx, StorefrontHeader.tsx             (NEW)
│   ├── ConversationRow.tsx                              (NEW)
│   ├── MessageBubble.tsx                                (NEW)
│   ├── SponsorshipCard.tsx                              (NEW)
│   ├── StoryRingReal.tsx                                (replace existing stub)
│   ├── LeaderboardPodium.tsx                            (NEW)
│   └── LeaderboardScopeTabs.tsx                         (NEW)
├── services/
│   ├── businessService.ts                               (NEW)
│   ├── messagesService.ts                               (NEW)
│   ├── sponsorshipService.ts                            (NEW)
│   └── storiesService.ts                                (NEW)
└── __tests__/...                                        (mirroring structure)
```

### Modified files

```
apps/api/prisma/schema.prisma            (+5 models, +1 enum)
apps/api/src/app.ts                      (register new routes)
apps/api/src/routes/reels.ts             (tab=following|foryou|local logic)
apps/api/src/routes/leaderboard.ts       (add scope=state|national|friends)
apps/mobile/app/(tabs)/reels.tsx         (add tab bar)
apps/mobile/app/leaderboard/index.tsx    (add podium + scope tabs)
apps/mobile/components/StoryRow.tsx      (call real /stories endpoint)
apps/mobile/app/(tabs)/index.tsx         (wire envelope icon to /messages)
```

---

## Task order

```
  ┌──────────────────────────┐
  │ F0: Schema migration     │  ◄── blocks everything
  └──────────────┬───────────┘
                 │
     ┌───────────┼────────────┬─────────────┬─────────────┐
     ▼           ▼            ▼             ▼             ▼
  ┌──────┐   ┌──────┐     ┌──────┐      ┌──────┐      ┌──────┐
  │ F1:  │   │ F2:  │     │ F3:  │      │ F4:  │      │ F5:  │
  │Biz   │   │DMs   │     │Sposr │      │Story │      │Reel  │
  └──────┘   └──────┘     └──────┘      └──────┘      │Tabs  │
                                                      └──────┘

                              ┌──────────────────────────┐
                              │ F6: Leaderboard podium + │
                              │     scope tabs           │
                              └──────────────────────────┘
```

F1–F6 independent after F0. Parallelize.

---

# Feature 0 — Schema migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Test: extend the existing `apps/api/tests/services/schema.test.ts`

### Task 0.1: Schema additions

- [ ] **Step 1: Append to `schema.prisma`**

```prisma
// ========== P2 additions ==========

enum SponsorshipStatus {
  pending
  accepted
  active
  completed
  declined
}

model Conversation {
  id            String    @id @default(uuid())
  userAId       String    @map("user_a_id")
  userBId       String    @map("user_b_id")
  lastMessageAt DateTime? @map("last_message_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  userA    User      @relation("convUserA", fields: [userAId], references: [id])
  userB    User      @relation("convUserB", fields: [userBId], references: [id])
  messages Message[]

  @@unique([userAId, userBId])
  @@index([userAId, lastMessageAt])
  @@index([userBId, lastMessageAt])
  @@map("conversations")
}

model Message {
  id              String       @id @default(uuid())
  conversationId  String       @map("conversation_id")
  senderId        String       @map("sender_id")
  text            String
  readAt          DateTime?    @map("read_at")
  createdAt       DateTime     @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id])
  sender       User         @relation(fields: [senderId], references: [id])

  @@index([conversationId, createdAt])
  @@map("messages")
}

model SponsorshipProposal {
  id              String            @id @default(uuid())
  businessId      String            @map("business_id")
  contentId       String?           @map("content_id")
  creatorId       String            @map("creator_id")
  boostAmount     Decimal           @map("boost_amount") @db.Decimal(10, 2)
  commissionPct   Decimal           @default(20) @map("commission_pct") @db.Decimal(5, 2)
  creatorEarnings Decimal?          @map("creator_earnings") @db.Decimal(10, 2)
  status          SponsorshipStatus @default(pending)
  reach           Int               @default(0)
  clicks          Int               @default(0)
  boostSpent      Decimal           @default(0) @map("boost_spent") @db.Decimal(10, 2)
  acceptedAt      DateTime?         @map("accepted_at")
  startsAt        DateTime?         @map("starts_at")
  endsAt          DateTime?         @map("ends_at")
  createdAt       DateTime          @default(now()) @map("created_at")

  business Business @relation(fields: [businessId], references: [id])
  creator  User     @relation(fields: [creatorId], references: [id])
  content  Content? @relation(fields: [contentId], references: [id])

  @@index([businessId])
  @@index([creatorId, status])
  @@map("sponsorship_proposals")
}

model Story {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  mediaUrl     String   @map("media_url")
  thumbnailUrl String?  @map("thumbnail_url")
  isLive       Boolean  @default(false) @map("is_live")
  createdAt    DateTime @default(now()) @map("created_at")
  expiresAt    DateTime @map("expires_at")

  user  User         @relation(fields: [userId], references: [id])
  views StoryView[]

  @@index([userId, expiresAt])
  @@index([expiresAt])
  @@map("stories")
}

model StoryView {
  id        String   @id @default(uuid())
  storyId   String   @map("story_id")
  viewerId  String   @map("viewer_id")
  viewedAt  DateTime @default(now()) @map("viewed_at")

  story  Story @relation(fields: [storyId], references: [id])
  viewer User  @relation(fields: [viewerId], references: [id])

  @@unique([storyId, viewerId])
  @@map("story_views")
}
```

- [ ] **Step 2: Add relations to `User`**

```prisma
  convsAsA                  Conversation[]         @relation("convUserA")
  convsAsB                  Conversation[]         @relation("convUserB")
  messagesSent              Message[]
  sponsorshipsAsCreator     SponsorshipProposal[]
  stories                   Story[]
  storyViews                StoryView[]
```

- [ ] **Step 3: Add relation to `Content`**

```prisma
  sponsorshipProposals SponsorshipProposal[]
```

- [ ] **Step 4: Migrate**

```bash
cd apps/api && npx prisma migrate dev --name p2_messages_stories_sponsorship
```

- [ ] **Step 5: Extend schema sanity test**

Append to `apps/api/tests/services/schema.test.ts`:

```typescript
it('can count P2 tables', async () => {
  await expect(prisma.conversation.count()).resolves.toBeTypeOf('number');
  await expect(prisma.message.count()).resolves.toBeTypeOf('number');
  await expect(prisma.sponsorshipProposal.count()).resolves.toBeTypeOf('number');
  await expect(prisma.story.count()).resolves.toBeTypeOf('number');
  await expect(prisma.storyView.count()).resolves.toBeTypeOf('number');
});
```

- [ ] **Step 6: Run + commit.**

```bash
cd apps/api && npm test -- schema
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/*p2_messages* apps/api/tests/services/schema.test.ts
git commit -m "feat(api): schema migration for P2 (conversations, messages, stories, sponsorship)"
```

---

# Feature 1 — Business Storefront

**Goal:** `/business/:id` shows the business profile: hero, ratings, hours, phone, tabs (About / Offers / Reviews / Tagged), follow button, create-content CTA.

**Backend work:**
- `GET /api/v1/business/:id` — business + stats + active offers
- `GET /api/v1/business/:id/tagged-content` — posts tagging this business (uses hashtag convention `#biz-<businessId>` or a separate `taggedBusinessId` column)
- `POST /api/v1/business/:id/follow` — reuse the User-follow pattern but on businesses. Add a `BusinessFollow` join (or extend `Follow` to support business targets). For MVP, add `businessFollows Int @default(0)` on `Business` and create a separate join table.

### Task 1.1: businessService + route tests

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/routes/business.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedBiz(overrides = {}) {
  return prisma.business.create({
    data: {
      name: 'Kashi Bakes',
      category: 'Bakery',
      pincode: '682016',
      isVerified: true,
      rating: 4.7 as any,
      reviewCount: 287,
      ...overrides,
    },
  });
}

describe('GET /api/v1/business/:id', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
    await prisma.business.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns business profile with rating + review count', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bz1', phone: '+911100000001', username: 'tbz1' });
    const biz = await seedBiz();
    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/business/${biz.id}`,
      headers: { Authorization: devToken('dev-test-bz1') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().business.name).toBe('Kashi Bakes');
    expect(res.json().business.rating).toBe('4.7');
  });

  it('includes active offers in the response', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bz2', phone: '+911100000002', username: 'tbz2' });
    const biz = await seedBiz();
    await prisma.offer.create({
      data: {
        type: 'local', businessId: biz.id, title: '20% off', pointsCost: 200,
        cashValue: 50 as any, validFrom: new Date('2020-01-01'), validUntil: new Date('2030-01-01'),
      },
    });
    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/business/${biz.id}`,
      headers: { Authorization: devToken('dev-test-bz2') },
    });
    expect(res.json().business.offers).toHaveLength(1);
    expect(res.json().business.offers[0].title).toBe('20% off');
  });

  it('returns 404 for unknown id', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bz3', phone: '+911100000003', username: 'tbz3' });
    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/business/00000000-0000-0000-0000-000000000000`,
      headers: { Authorization: devToken('dev-test-bz3') },
    });
    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Implement `apps/api/src/routes/business.ts`**

```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

export async function businessRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/business/:id', async (request) => {
    const { id } = request.params as { id: string };
    const biz = await prisma.business.findUnique({
      where: { id },
      include: {
        offers: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!biz) throw Errors.notFound('Business');
    return { business: biz };
  });
}
```

- [ ] **Step 3: Register + test + commit**

```typescript
// app.ts
app.register(businessRoutes, { prefix: '/api/v1' });
```

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- business
git add ... && git commit -m "feat(api): GET /business/:id"
```

### Task 1.2: Mobile storefront screen

- [ ] **Step 1: Failing test**

```typescript
// apps/mobile/__tests__/screens/storefront.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import Storefront from '@/app/business/[id]/index';
import { businessService } from '@/services/businessService';

jest.mock('@/services/businessService');
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'b1' }),
}));

describe('<Storefront />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (businessService.get as jest.Mock).mockResolvedValue({
      id: 'b1',
      name: 'Kashi Bakes',
      category: 'Bakery',
      rating: '4.7',
      reviewCount: 287,
      pincode: '682016',
      address: 'MG Road',
      phone: '+919843215678',
      isVerified: true,
      offers: [
        { id: 'o1', title: '20% off cakes', pointsCost: 200 },
      ],
    });
  });

  it('renders business name and rating', async () => {
    const { findByText } = render(<Storefront />);
    expect(await findByText('Kashi Bakes')).toBeTruthy();
    expect(await findByText(/4\.7/)).toBeTruthy();
    expect(await findByText(/287 reviews/i)).toBeTruthy();
  });

  it('renders offers under the Offers tab', async () => {
    const { findByText } = render(<Storefront />);
    expect(await findByText('20% off cakes')).toBeTruthy();
  });

  it('renders follow button', async () => {
    const { findByText } = render(<Storefront />);
    expect(await findByText(/follow & get offers/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement**

Create `apps/mobile/services/businessService.ts`:

```typescript
import { api } from '@/services/api';
export const businessService = {
  async get(id: string) {
    const res = await api.get(`/business/${id}`);
    return res.data.business;
  },
};
```

Create `apps/mobile/app/business/[id]/index.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { businessService } from '@/services/businessService';

export default function Storefront() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [biz, setBiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessService.get(id).then((b) => {
      setBiz(b);
      setLoading(false);
    });
  }, [id]);

  if (loading || !biz) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.root}>
      <View style={styles.hero} />
      <View style={styles.body}>
        <Text style={styles.name}>{biz.name} {biz.isVerified ? '✓' : ''}</Text>
        <Text style={styles.cat}>{biz.category} · 📍 {biz.pincode}</Text>
        <View style={styles.stats}>
          <Text>⭐ {biz.rating}</Text>
          <Text>{biz.reviewCount} reviews</Text>
        </View>

        <TouchableOpacity style={styles.followBtn}>
          <Text style={styles.followText}>⭐ Follow & Get Offers</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Offers ({biz.offers.length})</Text>
        {biz.offers.map((o: any) => (
          <View key={o.id} style={styles.offerRow}>
            <Text style={{ flex: 1 }}>{o.title}</Text>
            <Text style={styles.pts}>🪙 {o.pointsCost}</Text>
          </View>
        ))}

        {biz.phone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${biz.phone}`)} style={styles.callBtn}>
            <Text>📞 Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  hero: { height: 180, backgroundColor: '#FFA726' },
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: '#262626' },
  cat: { color: '#737373', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 10 },
  followBtn: { marginTop: 16, backgroundColor: '#E8792B', padding: 12, borderRadius: 10, alignItems: 'center' },
  followText: { color: '#fff', fontWeight: '700' },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: 22, marginBottom: 8 },
  offerRow: { flexDirection: 'row', padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10, marginBottom: 6 },
  pts: { color: '#10B981', fontWeight: '700' },
  callBtn: { marginTop: 16, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10, alignItems: 'center' },
});
```

- [ ] **Step 3: Run + commit.**

```bash
cd apps/mobile && npm test -- storefront
git add apps/mobile/services/businessService.ts apps/mobile/app/business apps/mobile/__tests__/screens/storefront.test.tsx
git commit -m "feat(mobile): business storefront screen"
```

**Note:** Tabbed content (Offers / Reviews / Tagged) and the follow-business mutation are deferred to post-MVP polish. MVP ships a read-only storefront with offer list.

---

# Feature 2 — Messages / DMs

**Goal:** `/messages` shows conversation list. Tap a conversation → `/messages/:id` opens the chat. Users can send text messages. New messages update the list. Filter tabs (All / Business / Creators / Friends).

**MVP scope:** Polling, not WebSockets. 5-second interval when a chat is open. List refreshes on focus.

### Task 2.1: messagesService (backend)

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/services/messagesService.test.ts
describe('messagesService', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
  });

  it('getOrCreateConversation creates a new conversation for two users', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m1a', phone: '+911200000001', username: 'tm1a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m1b', phone: '+911200000002', username: 'tm1b' });
    const conv = await messagesService.getOrCreateConversation(a.id, b.id);
    expect(conv.userAId === a.id || conv.userAId === b.id).toBe(true);
  });

  it('getOrCreateConversation returns the existing conversation (regardless of user order)', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m2a', phone: '+911200000003', username: 'tm2a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m2b', phone: '+911200000004', username: 'tm2b' });
    const c1 = await messagesService.getOrCreateConversation(a.id, b.id);
    const c2 = await messagesService.getOrCreateConversation(b.id, a.id);
    expect(c1.id).toBe(c2.id);
  });

  it('sendMessage inserts a message and updates lastMessageAt', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m3a', phone: '+911200000005', username: 'tm3a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m3b', phone: '+911200000006', username: 'tm3b' });
    const conv = await messagesService.getOrCreateConversation(a.id, b.id);
    const msg = await messagesService.sendMessage(conv.id, a.id, 'Hello');
    expect(msg.text).toBe('Hello');
    const updated = await prisma.conversation.findUnique({ where: { id: conv.id } });
    expect(updated?.lastMessageAt).not.toBeNull();
  });

  it('listConversations returns the users conversations newest first', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m4a', phone: '+911200000007', username: 'tm4a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m4b', phone: '+911200000008', username: 'tm4b' });
    const c = await seedUser({ firebaseUid: 'dev-test-m4c', phone: '+911200000009', username: 'tm4c' });
    const conv1 = await messagesService.getOrCreateConversation(a.id, b.id);
    await messagesService.sendMessage(conv1.id, a.id, 'hi');
    await new Promise((r) => setTimeout(r, 20));
    const conv2 = await messagesService.getOrCreateConversation(a.id, c.id);
    await messagesService.sendMessage(conv2.id, a.id, 'yo');

    const list = await messagesService.listConversations(a.id);
    expect(list[0].id).toBe(conv2.id);
    expect(list[1].id).toBe(conv1.id);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/services/messagesService.ts
import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export const messagesService = {
  async getOrCreateConversation(userIdA: string, userIdB: string) {
    if (userIdA === userIdB) throw Errors.badRequest('Cannot DM yourself');
    const [userAId, userBId] = orderedPair(userIdA, userIdB);
    const existing = await prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (existing) return existing;
    return prisma.conversation.create({ data: { userAId, userBId } });
  },

  async sendMessage(conversationId: string, senderId: string, text: string) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw Errors.notFound('Conversation');
    if (conv.userAId !== senderId && conv.userBId !== senderId) throw Errors.forbidden();

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId, text },
        include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);
    return message;
  },

  async listConversations(userId: string) {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        userA: { select: { id: true, username: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, avatarUrl: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    return convs.map((c) => ({
      id: c.id,
      otherUser: c.userAId === userId ? c.userB : c.userA,
      lastMessage: c.messages[0] ?? null,
      lastMessageAt: c.lastMessageAt,
    }));
  },

  async listMessages(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw Errors.notFound('Conversation');
    if (conv.userAId !== userId && conv.userBId !== userId) throw Errors.forbidden();
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });
  },
};
```

- [ ] **Step 3: Run + commit.**

### Task 2.2: Messages routes

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/routes/messages.test.ts
describe('Messages routes', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
  });

  it('POST /conversations creates a new conversation with a target user', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr1a', phone: '+911200001001', username: 'tmr1a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr1b', phone: '+911200001002', username: 'tmr1b' });
    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr1a') },
      payload: { targetUserId: b.id },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().conversation.id).toBeDefined();
  });

  it('POST /conversations/:id/messages sends a message', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr2a', phone: '+911200001003', username: 'tmr2a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr2b', phone: '+911200001004', username: 'tmr2b' });
    const convRes = await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr2a') },
      payload: { targetUserId: b.id },
    });
    const convId = convRes.json().conversation.id;

    const res = await getTestApp().inject({
      method: 'POST', url: `/api/v1/conversations/${convId}/messages`,
      headers: { Authorization: devToken('dev-test-mr2a') },
      payload: { text: 'hey' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().message.text).toBe('hey');
  });

  it('GET /conversations lists user conversations', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr3a', phone: '+911200001005', username: 'tmr3a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr3b', phone: '+911200001006', username: 'tmr3b' });
    await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr3a') },
      payload: { targetUserId: b.id },
    });
    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr3a') },
    });
    expect(res.json().conversations).toHaveLength(1);
  });

  it("a third user cannot read someone else's conversation", async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr4a', phone: '+911200001007', username: 'tmr4a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr4b', phone: '+911200001008', username: 'tmr4b' });
    const c = await seedUser({ firebaseUid: 'dev-test-mr4c', phone: '+911200001009', username: 'tmr4c' });
    const convRes = await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr4a') },
      payload: { targetUserId: b.id },
    });
    const convId = convRes.json().conversation.id;

    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/conversations/${convId}/messages`,
      headers: { Authorization: devToken('dev-test-mr4c') },
    });
    expect(res.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/routes/messages.ts
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { messagesService } from '../services/messagesService.js';
import { z } from 'zod';
import { Errors } from '../utils/errors.js';

const createConvSchema = z.object({ targetUserId: z.string().uuid() });
const sendSchema = z.object({ text: z.string().min(1).max(2000) });

export async function messagesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/conversations', async (request, reply) => {
    const parsed = createConvSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const conversation = await messagesService.getOrCreateConversation(
      request.userId,
      parsed.data.targetUserId,
    );
    return reply.status(201).send({ conversation });
  });

  app.get('/conversations', async (request) => {
    const conversations = await messagesService.listConversations(request.userId);
    return { conversations };
  });

  app.get('/conversations/:id/messages', async (request) => {
    const { id } = request.params as { id: string };
    const messages = await messagesService.listMessages(id, request.userId);
    return { messages };
  });

  app.post('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = sendSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const message = await messagesService.sendMessage(id, request.userId, parsed.data.text);
    return reply.status(201).send({ message });
  });
}
```

- [ ] **Step 3: Register + test + commit.**

### Task 2.3: Mobile messages UI

Following the established TDD cycle, ship:

- **messagesService.ts** (mobile) — wraps the 4 endpoints.
- **ConversationRow.tsx** — avatar, name, preview text, time ago, unread badge. Tests: renders name, renders preview, shows unread badge when `unread > 0`.
- **MessageBubble.tsx** — left-aligned for other user, right-aligned for self. Tests: aligns correctly, shows timestamp.
- **app/messages/index.tsx** — conversation list with filter tabs. Tests: renders conversations, tapping row navigates to `/messages/:id`, filter tab changes the list.
- **app/messages/[id].tsx** — chat detail. Fetches messages on mount + polls every 5s. Sticky input at bottom. Tests: sending a message shows it optimistically, polling fetches new messages, back button pops.
- **Modify `(tabs)/index.tsx`** — wire envelope icon to `/messages`.

Sample test for chat detail:

```typescript
it('sends a message and appends it to the list', async () => {
  (messagesService.listMessages as jest.Mock).mockResolvedValue([]);
  (messagesService.send as jest.Mock).mockResolvedValue({
    id: 'm1', text: 'hi', sender: { id: 'u1', username: 'me' }, createdAt: 'z',
  });
  const { getByPlaceholderText, getByTestId, findByText } = render(<ChatDetail />);
  fireEvent.changeText(await getByPlaceholderText(/type a message/i), 'hi');
  fireEvent.press(getByTestId('send-btn'));
  expect(await findByText('hi')).toBeTruthy();
});
```

Commit after each component.

---

# Feature 3 — Creator × Business (Sponsorship) dashboard

**Goal:** Creators see incoming sponsorship proposals from businesses, accept/decline, track active campaigns with metrics (reach, clicks, boost spend, earnings).

**Files:**
- API: `apps/api/src/routes/sponsorship.ts`, `apps/api/src/services/sponsorshipService.ts`
- Mobile: `apps/mobile/app/sponsorship/index.tsx`, `components/SponsorshipCard.tsx`

### Task 3.1: sponsorshipService

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/services/sponsorshipService.test.ts
describe('sponsorshipService', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.sponsorshipProposal.deleteMany({});
    await prisma.business.deleteMany({});
  });

  it('creates a proposal with status=pending and 20% commission', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp1', phone: '+911300000001', username: 'tsp1' });
    const biz = await prisma.business.create({
      data: { name: 'B', category: 'X', pincode: '682016' },
    });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 3000);
    expect(p.status).toBe('pending');
    expect(Number(p.commissionPct)).toBe(20);
    expect(Number(p.creatorEarnings)).toBe(600);
  });

  it('accept() flips status to accepted', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp2', phone: '+911300000002', username: 'tsp2' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 1000);
    const after = await sponsorshipService.accept(p.id, creator.id);
    expect(after.status).toBe('accepted');
  });

  it('decline() flips status to declined', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp3', phone: '+911300000003', username: 'tsp3' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 1000);
    const after = await sponsorshipService.decline(p.id, creator.id);
    expect(after.status).toBe('declined');
  });

  it('getCreatorDashboard returns aggregates', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp4', phone: '+911300000004', username: 'tsp4' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p1 = await sponsorshipService.createProposal(biz.id, creator.id, 3000);
    await sponsorshipService.accept(p1.id, creator.id);
    const data = await sponsorshipService.getCreatorDashboard(creator.id);
    expect(data.activeCount).toBe(1);
    expect(Number(data.totalEarnings)).toBe(600);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/services/sponsorshipService.ts
import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';

export const sponsorshipService = {
  async createProposal(businessId: string, creatorId: string, boostAmount: number, contentId?: string) {
    const commissionPct = 20;
    const creatorEarnings = (boostAmount * commissionPct) / 100;
    return prisma.sponsorshipProposal.create({
      data: {
        businessId,
        creatorId,
        contentId,
        boostAmount: boostAmount as any,
        commissionPct: commissionPct as any,
        creatorEarnings: creatorEarnings as any,
      },
    });
  },

  async accept(proposalId: string, userId: string) {
    const p = await prisma.sponsorshipProposal.findUnique({ where: { id: proposalId } });
    if (!p) throw Errors.notFound('Proposal');
    if (p.creatorId !== userId) throw Errors.forbidden();
    if (p.status !== 'pending') throw Errors.badRequest('Proposal is not pending');
    return prisma.sponsorshipProposal.update({
      where: { id: proposalId },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
  },

  async decline(proposalId: string, userId: string) {
    const p = await prisma.sponsorshipProposal.findUnique({ where: { id: proposalId } });
    if (!p) throw Errors.notFound('Proposal');
    if (p.creatorId !== userId) throw Errors.forbidden();
    return prisma.sponsorshipProposal.update({
      where: { id: proposalId },
      data: { status: 'declined' },
    });
  },

  async getCreatorDashboard(creatorId: string) {
    const [active, pending, completed, earningsAgg] = await Promise.all([
      prisma.sponsorshipProposal.findMany({
        where: { creatorId, status: { in: ['accepted', 'active'] } },
        include: { business: true, content: true },
      }),
      prisma.sponsorshipProposal.findMany({
        where: { creatorId, status: 'pending' },
        include: { business: true, content: true },
      }),
      prisma.sponsorshipProposal.count({ where: { creatorId, status: 'completed' } }),
      prisma.sponsorshipProposal.aggregate({
        where: { creatorId, status: { in: ['accepted', 'active', 'completed'] } },
        _sum: { creatorEarnings: true },
      }),
    ]);

    return {
      activeCount: active.length,
      pendingCount: pending.length,
      completedCount: completed,
      totalEarnings: earningsAgg._sum.creatorEarnings ?? 0,
      active,
      pending,
    };
  },
};
```

- [ ] **Step 3: Routes**

```typescript
// apps/api/src/routes/sponsorship.ts
export async function sponsorshipRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/sponsorship/dashboard', async (request) => {
    return sponsorshipService.getCreatorDashboard(request.userId);
  });

  app.post('/sponsorship/:id/accept', async (request) => {
    const { id } = request.params as { id: string };
    const proposal = await sponsorshipService.accept(id, request.userId);
    return { proposal };
  });

  app.post('/sponsorship/:id/decline', async (request) => {
    const { id } = request.params as { id: string };
    const proposal = await sponsorshipService.decline(id, request.userId);
    return { proposal };
  });
}
```

Register, test, commit.

### Task 3.2: Mobile sponsorship dashboard

- **SponsorshipCard.tsx** — renders one proposal: title, business name, status badge (LIVE / PENDING / DECLINED), metrics row (reach, clicks, spend, your earning), progress bar. Tests per behavior.
- **app/sponsorship/index.tsx** — header stats, pending section (with Accept/Decline), active section. Tests for each.
- **CreatorEarningsCard.tsx** — reusable card summarising sponsorship earnings: displays `totalEarnings`, `activeCount`, `completedCount`, and a subtitle "Commission (20%)". Pulls from `GET /sponsorship/dashboard`. This card must render in **two places**:
  1. Inline at the top of `/sponsorship` (above the pending/active sections).
  2. Inline at the top of `/my-content`, below `<MyContentStatsBar />` (added in P1 F7) — this is what closes the "Creator Earnings this month" mockup card gap.
  
  Component test coverage:
  ```typescript
  it('renders totalEarnings formatted as rupees', async () => {
    (sponsorshipService.getDashboard as jest.Mock).mockResolvedValue({
      totalEarnings: 2850, activeCount: 2, pendingCount: 1, completedCount: 4, active: [], pending: [],
    });
    const { findByText } = render(<CreatorEarningsCard />);
    expect(await findByText(/₹2,?850/)).toBeTruthy();
  });
  it('renders "No sponsored earnings yet" when totalEarnings is 0', async () => {
    (sponsorshipService.getDashboard as jest.Mock).mockResolvedValue({
      totalEarnings: 0, activeCount: 0, pendingCount: 0, completedCount: 0, active: [], pending: [],
    });
    const { findByText } = render(<CreatorEarningsCard />);
    expect(await findByText(/no sponsored earnings yet/i)).toBeTruthy();
  });
  ```

  Wire-in on `/my-content`:
  ```typescript
  // apps/mobile/app/my-content/index.tsx, above the filter pills
  import { MyContentStatsBar } from '@/components/MyContentStatsBar';  // from P1 F7
  import { CreatorEarningsCard } from '@/components/CreatorEarningsCard';
  // ...
  <MyContentStatsBar />
  <CreatorEarningsCard />
  ```

Commit each file as its own commit: `SponsorshipCard`, then `app/sponsorship/index.tsx`, then `CreatorEarningsCard`, then the `/my-content` wire-in. That keeps diffs scoped and reviewable.

---

# Feature 4 — Stories

**Goal:** Replace the empty `/stories` stub with real functionality. Users can post a 24-hour story; followers see their stories at the top of home feed as gradient rings. Tapping a ring plays through the stories in sequence.

**Files:** `apps/api/src/routes/stories.ts`, `apps/api/src/services/storiesService.ts`, `apps/mobile/components/StoryRingReal.tsx`, `apps/mobile/app/stories/[id].tsx`.

### Task 4.1: storiesService

- [ ] **Step 1: Failing test**

```typescript
describe('storiesService', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.story.deleteMany({});
  });

  it('post() creates a story expiring in 24h', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-st1', phone: '+911400000001', username: 'tst1' });
    const story = await storiesService.post(user.id, 'https://media/x.jpg', null);
    const ms = story.expiresAt.getTime() - story.createdAt.getTime();
    expect(ms).toBeCloseTo(24 * 60 * 60 * 1000, -3);
  });

  it('feed() returns stories from users I follow, excluding expired', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-st2', phone: '+911400000002', username: 'tst2' });
    const f = await seedUser({ firebaseUid: 'dev-test-st3', phone: '+911400000003', username: 'tst3' });
    await prisma.follow.create({ data: { followerId: me.id, followingId: f.id } });
    await prisma.story.create({
      data: { userId: f.id, mediaUrl: 'x', expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await prisma.story.create({
      data: { userId: f.id, mediaUrl: 'y', expiresAt: new Date(Date.now() - 60 * 60 * 1000) }, // expired
    });

    const list = await storiesService.feed(me.id);
    expect(list).toHaveLength(1);
  });

  it('markViewed creates a StoryView row', async () => {
    const viewer = await seedUser({ firebaseUid: 'dev-test-st4', phone: '+911400000004', username: 'tst4' });
    const author = await seedUser({ firebaseUid: 'dev-test-st5', phone: '+911400000005', username: 'tst5' });
    const story = await prisma.story.create({
      data: { userId: author.id, mediaUrl: 'x', expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await storiesService.markViewed(story.id, viewer.id);
    const view = await prisma.storyView.findUnique({
      where: { storyId_viewerId: { storyId: story.id, viewerId: viewer.id } },
    });
    expect(view).not.toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/services/storiesService.ts
import { prisma } from '../utils/prisma.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const storiesService = {
  async post(userId: string, mediaUrl: string, thumbnailUrl: string | null) {
    return prisma.story.create({
      data: {
        userId,
        mediaUrl,
        thumbnailUrl,
        expiresAt: new Date(Date.now() + ONE_DAY_MS),
      },
    });
  },

  async feed(userId: string) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = follows.map((f) => f.followingId);

    return prisma.story.findMany({
      where: {
        userId: { in: [userId, ...followedIds] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        views: { where: { viewerId: userId }, select: { id: true } },
      },
    });
  },

  async markViewed(storyId: string, viewerId: string) {
    return prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      update: {},
      create: { storyId, viewerId },
    });
  },
};
```

- [ ] **Step 3: Routes**

```typescript
// apps/api/src/routes/stories.ts  (replaces /stories stub)
export async function storiesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/stories', async (request) => {
    const stories = await storiesService.feed(request.userId);
    return { stories };
  });

  app.post('/stories', async (request, reply) => {
    const { mediaUrl, thumbnailUrl } = request.body as { mediaUrl: string; thumbnailUrl?: string };
    const story = await storiesService.post(request.userId, mediaUrl, thumbnailUrl ?? null);
    return reply.status(201).send({ story });
  });

  app.post('/stories/:id/view', async (request) => {
    const { id } = request.params as { id: string };
    await storiesService.markViewed(id, request.userId);
    return { success: true };
  });
}
```

Replace existing `/stories` registration if necessary. Test + commit.

### Task 4.2: Mobile StoryRingReal + viewer

- **StoryRow.tsx** (modify) — load from `/stories`, render rings with gradient border for unseen, gray for seen.
- **app/stories/[id].tsx** — fullscreen viewer, auto-advance after 5s, tap to skip, call `storiesService.markViewed` on enter.

Commit both.

---

# Feature 5 — Reel tabs (Following / For You / Local)

**Goal:** Add tab bar to reels screen. Backend filters by tab.

**Files:**
- Modify: `apps/api/src/routes/reels.ts` — use `tab` query param (already validated in `reelsQuerySchema`).
- Modify: `apps/mobile/app/(tabs)/reels.tsx` — add tab UI.

### Task 5.1: Backend tab filter

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/routes/reels-tabs.test.ts
describe('GET /api/v1/reels?tab=...', () => {
  beforeEach(cleanupTestData);

  it('tab=following returns reels only from users I follow', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-rt1', phone: '+911500000001', username: 'trt1' });
    const f = await seedUser({ firebaseUid: 'dev-test-rt2', phone: '+911500000002', username: 'trt2' });
    const o = await seedUser({ firebaseUid: 'dev-test-rt3', phone: '+911500000003', username: 'trt3' });
    await prisma.follow.create({ data: { followerId: me.id, followingId: f.id } });
    await prisma.content.create({
      data: { userId: f.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date() },
    });
    await prisma.content.create({
      data: { userId: o.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date() },
    });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/reels?tab=following',
      headers: { Authorization: devToken('dev-test-rt1') },
    });
    const reels = res.json().data ?? res.json().reels ?? [];
    const userIds = reels.map((r: any) => r.userId);
    expect(userIds).toContain(f.id);
    expect(userIds).not.toContain(o.id);
  });

  it('tab=local returns reels from users in my pincode', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-rt4', phone: '+911500000004', username: 'trt4' });
    await prisma.user.update({ where: { id: me.id }, data: { primaryPincode: '682016' } });
    const local = await seedUser({ firebaseUid: 'dev-test-rt5', phone: '+911500000005', username: 'trt5' });
    await prisma.user.update({ where: { id: local.id }, data: { primaryPincode: '682016' } });
    const distant = await seedUser({ firebaseUid: 'dev-test-rt6', phone: '+911500000006', username: 'trt6' });
    await prisma.user.update({ where: { id: distant.id }, data: { primaryPincode: '600001' } });

    await prisma.content.create({
      data: { userId: local.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date(), locationPincode: '682016' },
    });
    await prisma.content.create({
      data: { userId: distant.id, type: 'reel', moderationStatus: 'published', publishedAt: new Date(), locationPincode: '600001' },
    });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/reels?tab=local',
      headers: { Authorization: devToken('dev-test-rt4') },
    });
    const reels = res.json().data ?? res.json().reels ?? [];
    expect(reels.find((r: any) => r.userId === local.id)).toBeDefined();
    expect(reels.find((r: any) => r.userId === distant.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Update `apps/api/src/routes/reels.ts` to respect `tab`**

```typescript
app.get('/reels', async (request) => {
  const parsed = reelsQuerySchema.safeParse(request.query);
  if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
  const { tab, page, limit } = parsed.data;
  const userId = request.userId;

  const where: any = { type: 'reel', moderationStatus: 'published' };

  if (tab === 'following') {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    where.userId = { in: follows.map((f) => f.followingId) };
  } else if (tab === 'local') {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryPincode: true, secondaryPincodes: true },
    });
    const pincodes = [me?.primaryPincode, ...(me?.secondaryPincodes ?? [])].filter(Boolean);
    where.OR = [
      { locationPincode: { in: pincodes } },
      { user: { primaryPincode: { in: pincodes } } },
    ];
  }

  const reels = await prisma.content.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { publishedAt: 'desc' },
    include: { user: { select: { id: true, username: true, avatarUrl: true, isVerified: true, tier: true } }, media: true },
  });

  return { data: reels, page, limit };
});
```

- [ ] **Step 3: Run + commit.**

### Task 5.2: Mobile reel tab bar

- [ ] **Step 1: Failing test**

```typescript
// apps/mobile/__tests__/screens/reels-tabs.test.tsx
it('defaults to "For You" tab', async () => {
  (reelsService.getReels as jest.Mock).mockResolvedValue({ data: [] });
  const { findByText } = render(<ReelsScreen />);
  expect(await findByText(/for you/i)).toBeTruthy();
  expect(reelsService.getReels).toHaveBeenCalledWith('foryou', 1);
});

it('switches to "Following" when tab pressed', async () => {
  (reelsService.getReels as jest.Mock).mockResolvedValue({ data: [] });
  const { findByText, getByText } = render(<ReelsScreen />);
  await findByText(/for you/i);
  fireEvent.press(getByText(/following/i));
  await waitFor(() => {
    expect(reelsService.getReels).toHaveBeenLastCalledWith('following', 1);
  });
});
```

- [ ] **Step 2: Modify `apps/mobile/app/(tabs)/reels.tsx`**

Add a horizontal tab bar overlaying the top of the reel feed with three buttons: Following / For You / Local. State `tab` drives the service call.

```typescript
const [tab, setTab] = useState<'foryou' | 'following' | 'local'>('foryou');
// In useEffect:
useEffect(() => { reelsService.getReels(tab, 1).then(setReels); }, [tab]);

// JSX at top:
<View style={styles.tabs}>
  {(['following','foryou','local'] as const).map((t) => (
    <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab===t && styles.tabActive]}>
      <Text style={[styles.tabText, tab===t && styles.tabTextActive]}>
        {t === 'foryou' ? 'For You' : t === 'following' ? 'Following' : 'Local'}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

Run + commit.

---

# Feature 6 — Leaderboard podium + scope tabs

**Goal:**
1. Top-3 podium visual above the list.
2. Scope tabs: My Pincode / Kerala State / All India / Friends.

**Files:**
- Backend: extend `/leaderboard` to support `scope=friends` (existing schema has `pincode|state|national`).
- Mobile: `components/LeaderboardPodium.tsx`, `components/LeaderboardScopeTabs.tsx`, modify `app/leaderboard/index.tsx`.

### Task 6.1: Backend scope=friends

- [ ] **Step 1: Failing test**

```typescript
describe('GET /api/v1/leaderboard?scope=friends', () => {
  it('returns only users I follow', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-lb1', phone: '+911600000001', username: 'tlb1' });
    const f = await seedUser({ firebaseUid: 'dev-test-lb2', phone: '+911600000002', username: 'tlb2' });
    const o = await seedUser({ firebaseUid: 'dev-test-lb3', phone: '+911600000003', username: 'tlb3' });
    await prisma.follow.create({ data: { followerId: me.id, followingId: f.id } });

    // Seed leaderboard entries
    const periodStart = new Date('2026-04-13'); // a Monday
    await prisma.leaderboardEntry.create({
      data: { userId: f.id, pincode: '682016', scope: 'pincode', periodStart, periodEnd: new Date('2026-04-19'), pointsEarned: 500 },
    });
    await prisma.leaderboardEntry.create({
      data: { userId: o.id, pincode: '682016', scope: 'pincode', periodStart, periodEnd: new Date('2026-04-19'), pointsEarned: 1000 },
    });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/leaderboard?scope=friends',
      headers: { Authorization: devToken('dev-test-lb1') },
    });
    const leaders = res.json().leaders ?? res.json().data;
    expect(leaders.map((l: any) => l.userId)).toContain(f.id);
    expect(leaders.map((l: any) => l.userId)).not.toContain(o.id);
  });
});
```

- [ ] **Step 2: Extend validator + route**

In `validators.ts`:

```typescript
export const leaderboardQuerySchema = z.object({
  scope: z.enum(['pincode', 'state', 'national', 'friends']).default('pincode'),
  pincode: z.string().length(6).optional(),
});
```

In `routes/leaderboard.ts`, branch on `scope === 'friends'`:

```typescript
if (scope === 'friends') {
  const follows = await prisma.follow.findMany({
    where: { followerId: request.userId },
    select: { followingId: true },
  });
  const ids = follows.map((f) => f.followingId);
  // Return a ranked list of these users' weekly points from PointsLedger
  const weekStart = startOfCurrentWeek();
  const rows = await prisma.pointsLedger.groupBy({
    by: ['userId'],
    where: { userId: { in: ids }, createdAt: { gte: weekStart } },
    _sum: { points: true },
  });
  const sorted = rows
    .map((r) => ({ userId: r.userId, weeklyPoints: r._sum.points ?? 0 }))
    .sort((a, b) => b.weeklyPoints - a.weeklyPoints);
  // Include user data
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, avatarUrl: true, tier: true, streakDays: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const leaders = sorted.map((r, idx) => ({ ...userMap.get(r.userId)!, rank: idx + 1, weeklyPoints: r.weeklyPoints }));
  return { leaders };
}
```

- [ ] **Step 3: Run + commit.**

### Task 6.2: Mobile podium + scope tabs

- **LeaderboardPodium.tsx** — takes `top3: {rank, username, avatar, points}[]`. Renders 3 vertical bars with medals. Tests: renders medals, tallest bar is rank 1.
- **LeaderboardScopeTabs.tsx** — 4 buttons (Pincode/State/National/Friends). Controlled component with `onChange`. Tests: active tab styled differently, onChange fires with new scope.
- Modify `app/leaderboard/index.tsx` to include both.

Commit.

---

## P2 completion criteria

- [ ] All new `cd apps/api && npm test` tests pass
- [ ] All new `cd apps/mobile && npm test` tests pass
- [ ] Manual: visit `/business/:id` from a feed post tagging a business — full storefront renders
- [ ] Manual: tap envelope icon in home header → conversation list → tap a row → send a message → appears in list
- [ ] Manual: sponsorship dashboard shows pending/active sections; tap Accept on a pending proposal
- [ ] Manual: post a story → appears as ring for followers → tap ring → plays fullscreen → auto-advances
- [ ] Manual: switch reel tab between Following / For You / Local → different reels appear
- [ ] Manual: leaderboard shows podium of top 3; switching scope changes the list

## What could go wrong

- **Message polling battery drain** — 5s polling only while chat screen is focused. Use `useFocusEffect` from `expo-router` to start/stop. Don't poll globally.
- **Conversation unique constraint on reversed pairs** — we enforce `userAId < userBId` via `orderedPair()` in the service. Without this, two conversations can be created for the same pair.
- **Story views race** — `StoryView` unique constraint on `(storyId, viewerId)` + `upsert` handles it.
- **Sponsorship commission drift** — we store `commissionPct` on each proposal row so historical records stay accurate even if we later change the default.
- **Reel tab=local with no pincode set** — edge case for brand-new users; falls back to empty list. Consider defaulting to For You if local is empty.
- **Podium with fewer than 3 users** — gracefully render whatever count exists; don't crash.

**Why does this matter?** P2 unlocks the business side of the product (creators can earn commissions from brands) and the dense social layer (DMs, stories, deep community feel). Without these, Eru is a consumer-only loyalty app. With them, it's the two-sided marketplace from your original product vision.
