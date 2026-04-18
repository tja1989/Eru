# GapFix P1 — Open the Earning Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task follows strict TDD (see P0 TDD Protocol — rules are identical here).

**Goal:** Turn Eru from a social app into a reward platform. Users can spend points on real-world offers, see their tier progress, complete weekly quests, spin daily for bonus points, and collect badges.

**Architecture:** Six features, introducing six new database models (`Business`, `Offer`, `UserReward`, `Quest`, `UserQuestProgress`, `SpinResult`, `Badge`, `UserBadge`). Backend scaffolding for offers and rewards is the bulk of the work; mobile screens wrap the new endpoints. Quests and badges reuse the existing `PointsLedger` — we derive progress from it.

**Tech Stack:** Same as P0 (Fastify + Vitest + Prisma + React Native + Jest). **New:** Prisma migrations for the six new models; a daily cron job for spin reset; optional QR code library (`react-native-qrcode-svg`) for My Rewards.

---

## The loyalty-card analogy

Think of Eru as a **coffee shop chain's loyalty program**. Customers collect stamps (points). Today our app gives out stamps but has **no redemption counter** — you can see your stamp count, but there's nothing to redeem them for. That's the P1 gap.

P1 builds:

1. The **menu of redeemable rewards** (gift cards, local deals, recharges).
2. The **counter** where you walk up and say "I'll trade 500 stamps for this" (the redeem + QR flow).
3. The **progress tracker** on your card (tier progress, quests, streaks).
4. The **bonus wheel** every coffee shop has at the counter (daily spin).
5. The **achievement shelf** with trophies (badges).

**Key Insight:** Every feature here is about *closure* on the reward loop. A social app retains via social anxiety (FOMO, likes). A reward app retains via tangible upside. Without P1 the product has no retention lever beyond curiosity.

---

## Big-picture schema

```
┌─────────┐        ┌────────┐        ┌──────────┐
│ Business│◄──────►│ Offer  │◄──────►│UserReward│
└─────────┘ 1    * └────────┘ 1    * └──────────┘
                                       (claim code, QR, expiry)

┌──────┐        ┌──────────────────┐
│Quest │◄──────►│UserQuestProgress │
└──────┘ 1    * └──────────────────┘
                 (progress, completedAt)

┌─────────────┐
│SpinResult   │   one per user per day, records points won
└─────────────┘

┌──────┐        ┌──────────┐
│Badge │◄──────►│UserBadge │
└──────┘ 1    * └──────────┘
                 (unlockedAt)
```

---

## TDD Protocol

Identical to P0. One behavior per test. Watch each test fail before implementing. No production code without a failing test first. If the test passes immediately, you're testing existing behavior — fix the test.

See [P0 TDD Protocol](./GapFixP0.md#tdd-protocol) for the full rules.

---

## Prerequisites

- [ ] P0 Feature 0 (mobile test stack) must be complete. If `cd apps/mobile && npm test` fails, stop and complete P0 first.
- [ ] `DATABASE_URL` and `DIRECT_URL` in `.env.test` point to a disposable test database (or a schema you can `prisma migrate reset` safely).
- [ ] Schema dev migrations enabled (`prisma migrate dev` works).

---

## File structure

### New files

```
apps/api/
├── prisma/migrations/
│   └── YYYYMMDDHHMMSS_p1_rewards_quests_badges/migration.sql   (auto-generated)
├── src/
│   ├── routes/
│   │   ├── offers.ts                                           (NEW)
│   │   ├── rewards.ts                                          (NEW)
│   │   ├── quests.ts                                           (NEW)
│   │   ├── spin.ts                                             (NEW)
│   │   └── badges.ts                                           (NEW)
│   ├── services/
│   │   ├── rewardsService.ts                                   (NEW — claim logic, code gen)
│   │   ├── questsService.ts                                    (NEW — progress calc)
│   │   ├── spinService.ts                                      (NEW — random payout)
│   │   └── badgesService.ts                                    (NEW — unlock check)
│   └── scripts/
│       └── seed-rewards.ts                                     (NEW — sample offers/quests/badges)
└── tests/
    ├── routes/
    │   ├── offers.test.ts                                      (NEW)
    │   ├── rewards.test.ts                                     (NEW)
    │   ├── quests.test.ts                                      (NEW)
    │   ├── spin.test.ts                                        (NEW)
    │   └── badges.test.ts                                      (NEW)
    └── services/
        ├── rewardsService.test.ts                              (NEW)
        ├── questsService.test.ts                               (NEW)
        ├── spinService.test.ts                                 (NEW)
        └── badgesService.test.ts                               (NEW)

apps/mobile/
├── app/
│   ├── redeem/
│   │   └── index.tsx                                           (NEW)
│   ├── my-rewards/
│   │   └── index.tsx                                           (NEW)
│   ├── spin/
│   │   └── index.tsx                                           (NEW)
│   └── badges/
│       └── index.tsx                                           (NEW)
├── components/
│   ├── TierProgressCard.tsx                                    (NEW)
│   ├── WalletQuickActions.tsx                                  (NEW)
│   ├── OfferCard.tsx                                           (NEW)
│   ├── RewardCard.tsx                                          (NEW)
│   ├── QuestRow.tsx                                            (NEW)
│   ├── WeeklyQuestsCard.tsx                                    (NEW)
│   ├── SpinWheel.tsx                                           (NEW)
│   └── BadgeGrid.tsx                                           (NEW)
├── services/
│   ├── offersService.ts                                        (NEW)
│   ├── rewardsService.ts                                       (NEW)
│   ├── questsService.ts                                        (NEW)
│   ├── spinService.ts                                          (NEW)
│   └── badgesService.ts                                        (NEW)
└── __tests__/
    ├── services/
    │   ├── offersService.test.ts
    │   ├── rewardsService.test.ts
    │   ├── questsService.test.ts
    │   ├── spinService.test.ts
    │   └── badgesService.test.ts
    ├── components/
    │   ├── TierProgressCard.test.tsx
    │   ├── WalletQuickActions.test.tsx
    │   ├── OfferCard.test.tsx
    │   ├── RewardCard.test.tsx
    │   ├── QuestRow.test.tsx
    │   ├── WeeklyQuestsCard.test.tsx
    │   ├── SpinWheel.test.tsx
    │   └── BadgeGrid.test.tsx
    └── screens/
        ├── redeem.test.tsx
        ├── myRewards.test.tsx
        ├── spin.test.tsx
        └── badges.test.tsx
```

### Modified files

```
apps/api/prisma/schema.prisma            (+6 models, +2 enums)
apps/api/src/app.ts                      (register new routes)
apps/api/src/utils/validators.ts         (offer/quest/spin/badge schemas)
apps/api/src/scripts/seed.ts             (call seed-rewards)
apps/mobile/app/wallet/index.tsx         (add TierProgressCard, WalletQuickActions)
apps/mobile/app/leaderboard/index.tsx    (add WeeklyQuestsCard)
apps/mobile/services/api.ts              (no change; uses existing axios client)
apps/mobile/stores/pointsStore.ts        (refresh balance after redeem/spin)
```

---

## Task order

```
  ┌──────────────────────────┐
  │ F0: Prisma schema + migr │ ◄── blocks F1–F6
  └────────────┬─────────────┘
               │
   ┌───────────┼───────────┬───────────┬───────────┐
   ▼           ▼           ▼           ▼           ▼
┌──────┐   ┌────────┐  ┌────────┐  ┌──────┐   ┌──────┐
│ F1:  │   │ F2:    │  │ F3:    │  │ F4:  │   │ F5:  │
│Redeem│   │Rewards │  │Wallet  │  │Quests│   │ Spin │
└──────┘   └────────┘  │ extras │  └──────┘   └──────┘
                       └────────┘

                       ┌──────┐
                       │ F6:  │
                       │Badges│
                       └──────┘

  ┌──────────────┐     ┌──────────────────────────────┐
  │ F7: My       │     │ F8: Delete own post          │
  │ Content      │     │    + PointsLedger cascade    │
  │ stats summary│     │    (own schema migration)    │
  └──────────────┘     └──────────────────────────────┘
```

F1→F2 must be sequential (rewards depend on offers). F3–F7 independent after F0. F8 needs its own small schema migration (`p1_soft_delete_content`) but is otherwise independent; its mobile work depends on P0 F7 (PostActionSheet) being merged first. Parallelize aggressively.

---

# Feature 0 — Prisma schema + migration

**Goal:** Add `Business`, `Offer`, `UserReward`, `Quest`, `UserQuestProgress`, `SpinResult`, `Badge`, `UserBadge` models. Migrate the dev DB.

**Why first:** Every feature below depends on these tables existing. No TDD is possible against "a table I'll add later" — Prisma won't compile the client.

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<ts>_p1_rewards/migration.sql` (auto)
- Create: `apps/api/tests/services/schema.test.ts` (sanity: models are queryable)

### Task 0.1: Edit schema.prisma

- [ ] **Step 1: Append to `apps/api/prisma/schema.prisma`**

```prisma
// ========== P1 additions ==========

enum OfferType {
  local
  giftcard
  recharge
  donate
  premium
}

enum RewardStatus {
  active
  used
  expired
}

enum QuestPeriod {
  daily
  weekly
  seasonal
}

model Business {
  id              String    @id @default(uuid())
  name            String
  category        String
  description     String?
  avatarUrl       String?   @map("avatar_url")
  pincode         String    @db.VarChar(6)
  address         String?
  phone           String?
  openHours       Json?     @map("open_hours")
  isVerified      Boolean   @default(false) @map("is_verified")
  rating          Decimal   @default(0) @db.Decimal(2, 1)
  reviewCount     Int       @default(0) @map("review_count")
  followerCount   Int       @default(0) @map("follower_count")
  createdAt       DateTime  @default(now()) @map("created_at")

  offers Offer[]

  @@index([pincode])
  @@map("businesses")
}

model Offer {
  id                 String      @id @default(uuid())
  type               OfferType
  businessId         String?     @map("business_id")
  title              String
  description        String?
  imageUrl           String?     @map("image_url")
  pointsCost         Int         @map("points_cost")
  cashValue          Decimal     @map("cash_value") @db.Decimal(10, 2)
  stock              Int?
  perUserLimit       Int         @default(1) @map("per_user_limit")
  validFrom          DateTime    @map("valid_from")
  validUntil         DateTime    @map("valid_until")
  isActive           Boolean     @default(true) @map("is_active")
  metadata           Json?
  createdAt          DateTime    @default(now()) @map("created_at")

  business     Business?    @relation(fields: [businessId], references: [id])
  userRewards  UserReward[]

  @@index([type, isActive])
  @@index([businessId])
  @@map("offers")
}

model UserReward {
  id            String       @id @default(uuid())
  userId        String       @map("user_id")
  offerId       String       @map("offer_id")
  claimCode     String       @unique @map("claim_code")
  pointsSpent   Int          @map("points_spent")
  status        RewardStatus @default(active)
  expiresAt     DateTime     @map("expires_at")
  usedAt        DateTime?    @map("used_at")
  createdAt     DateTime     @default(now()) @map("created_at")

  user  User  @relation(fields: [userId], references: [id])
  offer Offer @relation(fields: [offerId], references: [id])

  @@index([userId, status])
  @@index([expiresAt])
  @@map("user_rewards")
}

model Quest {
  id              String      @id @default(uuid())
  title           String
  description     String?
  actionType      String      @map("action_type")
  targetCount     Int         @map("target_count")
  rewardPoints    Int         @map("reward_points")
  period          QuestPeriod
  isActive        Boolean     @default(true) @map("is_active")
  createdAt       DateTime    @default(now()) @map("created_at")

  progress UserQuestProgress[]

  @@map("quests")
}

model UserQuestProgress {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  questId      String    @map("quest_id")
  periodStart  DateTime  @map("period_start") @db.Date
  currentCount Int       @default(0) @map("current_count")
  completedAt  DateTime? @map("completed_at")
  claimedAt    DateTime? @map("claimed_at")

  user  User  @relation(fields: [userId], references: [id])
  quest Quest @relation(fields: [questId], references: [id])

  @@unique([userId, questId, periodStart])
  @@index([userId, completedAt])
  @@map("user_quest_progress")
}

model SpinResult {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  spinDate      DateTime @map("spin_date") @db.Date
  pointsAwarded Int      @map("points_awarded")
  createdAt     DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, spinDate])
  @@map("spin_results")
}

model Badge {
  id              String   @id @default(uuid())
  code            String   @unique
  title           String
  description     String
  emoji           String
  unlockRule      Json     @map("unlock_rule")
  sortOrder       Int      @default(0) @map("sort_order")
  createdAt       DateTime @default(now()) @map("created_at")

  userBadges UserBadge[]

  @@map("badges")
}

model UserBadge {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  badgeId    String   @map("badge_id")
  unlockedAt DateTime @default(now()) @map("unlocked_at")

  user  User  @relation(fields: [userId], references: [id])
  badge Badge @relation(fields: [badgeId], references: [id])

  @@unique([userId, badgeId])
  @@map("user_badges")
}
```

- [ ] **Step 2: Add the new relations to the existing `User` model**

In the `User` block, add:

```prisma
  userRewards       UserReward[]
  questProgress     UserQuestProgress[]
  spinResults       SpinResult[]
  badges            UserBadge[]
```

- [ ] **Step 3: Create the migration**

```bash
cd apps/api && npx prisma migrate dev --name p1_rewards_quests_badges
```

Expected: new migration folder under `prisma/migrations/`; client is regenerated. If the CLI complains about dev DB state, run `npx prisma migrate reset` (which destroys data — only do this in dev).

- [ ] **Step 4: Write the sanity test**

Create `apps/api/tests/services/schema.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';

describe('P1 schema sanity', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('can count all new tables without error', async () => {
    await expect(prisma.business.count()).resolves.toBeTypeOf('number');
    await expect(prisma.offer.count()).resolves.toBeTypeOf('number');
    await expect(prisma.userReward.count()).resolves.toBeTypeOf('number');
    await expect(prisma.quest.count()).resolves.toBeTypeOf('number');
    await expect(prisma.userQuestProgress.count()).resolves.toBeTypeOf('number');
    await expect(prisma.spinResult.count()).resolves.toBeTypeOf('number');
    await expect(prisma.badge.count()).resolves.toBeTypeOf('number');
    await expect(prisma.userBadge.count()).resolves.toBeTypeOf('number');
  });
});
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd apps/api && npm test -- schema
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/*p1_rewards_quests_badges* apps/api/tests/services/schema.test.ts
git commit -m "feat(api): schema migration for P1 (rewards, quests, badges)"
```

### Task 0.2: Seed sample data

- [ ] **Step 1: Create `apps/api/src/scripts/seed-rewards.ts`**

```typescript
import { prisma } from '../utils/prisma.js';

async function main() {
  // Sample businesses
  const biz1 = await prisma.business.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Kashi Bakes',
      category: 'Artisan Bakery',
      pincode: '682016',
      address: 'MG Road, Ernakulam',
      phone: '+919843215678',
      rating: 4.7 as any,
      reviewCount: 287,
      isVerified: true,
    },
  });

  // Sample offers
  await prisma.offer.upsert({
    where: { id: '22222222-2222-2222-2222-222222222221' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222221',
      type: 'local',
      businessId: biz1.id,
      title: '20% off all cakes',
      description: 'Valid Fri–Sun',
      pointsCost: 200,
      cashValue: 50 as any,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2027-01-01'),
    },
  });

  await prisma.offer.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      type: 'giftcard',
      title: 'Amazon ₹100',
      pointsCost: 1000,
      cashValue: 100 as any,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2027-01-01'),
    },
  });

  // Sample quests (weekly)
  await prisma.quest.upsert({
    where: { id: '33333333-3333-3333-3333-333333333331' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333331',
      title: 'Read 5 articles',
      actionType: 'read_article',
      targetCount: 5,
      rewardPoints: 25,
      period: 'weekly',
    },
  });
  await prisma.quest.upsert({
    where: { id: '33333333-3333-3333-3333-333333333332' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333332',
      title: 'Share 3 posts',
      actionType: 'share',
      targetCount: 3,
      rewardPoints: 30,
      period: 'weekly',
    },
  });

  // Sample badges
  await prisma.badge.upsert({
    where: { code: 'first_purchase' },
    update: {},
    create: {
      code: 'first_purchase',
      title: 'First Purchase',
      description: 'Claim your first reward',
      emoji: '🛍️',
      unlockRule: { type: 'rewards_claimed', threshold: 1 },
    },
  });
  await prisma.badge.upsert({
    where: { code: 'streak_7' },
    update: {},
    create: {
      code: 'streak_7',
      title: '7-Day Streak',
      description: 'Check in 7 days in a row',
      emoji: '🔥',
      unlockRule: { type: 'streak_days', threshold: 7 },
    },
  });

  console.log('Seeded rewards, quests, and badges.');
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add to `apps/api/package.json` scripts**

```json
"db:seed-rewards": "tsx src/scripts/seed-rewards.ts"
```

- [ ] **Step 3: Run**

```bash
cd apps/api && npm run db:seed-rewards
```

Expected: `Seeded rewards, quests, and badges.`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/scripts/seed-rewards.ts apps/api/package.json
git commit -m "chore(api): seed script for sample offers/quests/badges"
```

---

# Feature 1 — Redeem / Rewards Store (list offers + claim)

**Goal:** Users can browse offers by category and claim one using points. On claim, we deduct points, generate a unique claim code, create a `UserReward`, and return the code.

**Files:**
- Create: `apps/api/src/routes/offers.ts`
- Create: `apps/api/src/routes/rewards.ts`
- Create: `apps/api/src/services/rewardsService.ts`
- Create: `apps/api/tests/services/rewardsService.test.ts`
- Create: `apps/api/tests/routes/offers.test.ts`
- Create: `apps/api/tests/routes/rewards.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/utils/validators.ts`
- Create: `apps/mobile/app/redeem/index.tsx`
- Create: `apps/mobile/components/OfferCard.tsx`
- Create: `apps/mobile/services/offersService.ts`
- Create: `apps/mobile/services/rewardsService.ts`
- Create: `apps/mobile/__tests__/components/OfferCard.test.tsx`
- Create: `apps/mobile/__tests__/screens/redeem.test.tsx`
- Create: `apps/mobile/__tests__/services/offersService.test.ts`
- Create: `apps/mobile/__tests__/services/rewardsService.test.ts`

### Task 1.1: rewardsService.claimOffer business logic

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/services/rewardsService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { rewardsService } from '../../src/services/rewardsService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

async function seedOffer(overrides: Partial<{
  pointsCost: number;
  stock: number | null;
  perUserLimit: number;
  isActive: boolean;
  validUntil: Date;
}> = {}) {
  return prisma.offer.create({
    data: {
      type: 'giftcard',
      title: 'Test gift',
      pointsCost: overrides.pointsCost ?? 100,
      cashValue: 10 as any,
      stock: overrides.stock ?? null,
      perUserLimit: overrides.perUserLimit ?? 1,
      isActive: overrides.isActive ?? true,
      validFrom: new Date('2020-01-01'),
      validUntil: overrides.validUntil ?? new Date('2030-01-01'),
    },
  });
}

describe('rewardsService.claimOffer', () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it('deducts points from the user and creates a UserReward', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward1',
      phone: '+919300000001',
      username: 'treward1',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ pointsCost: 100 });

    const reward = await rewardsService.claimOffer(user.id, offer.id);

    expect(reward.claimCode).toMatch(/^ERU-/);
    expect(reward.pointsSpent).toBe(100);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.currentBalance).toBe(400);
  });

  it('rejects with INSUFFICIENT_POINTS when balance too low', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward2',
      phone: '+919300000002',
      username: 'treward2',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 50 } });
    const offer = await seedOffer({ pointsCost: 100 });

    await expect(rewardsService.claimOffer(user.id, offer.id)).rejects.toThrow(
      /insufficient points/i,
    );
  });

  it('rejects when offer is inactive', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward3',
      phone: '+919300000003',
      username: 'treward3',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ isActive: false });

    await expect(rewardsService.claimOffer(user.id, offer.id)).rejects.toThrow(/not available/i);
  });

  it('rejects when perUserLimit reached', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward4',
      phone: '+919300000004',
      username: 'treward4',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ pointsCost: 100, perUserLimit: 1 });

    await rewardsService.claimOffer(user.id, offer.id);
    await expect(rewardsService.claimOffer(user.id, offer.id)).rejects.toThrow(/limit/i);
  });

  it('decrements stock when stock is set', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward5',
      phone: '+919300000005',
      username: 'treward5',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 1000 } });
    const offer = await seedOffer({ pointsCost: 100, stock: 5, perUserLimit: 10 });

    await rewardsService.claimOffer(user.id, offer.id);
    const after = await prisma.offer.findUnique({ where: { id: offer.id } });
    expect(after?.stock).toBe(4);
  });

  it('generates unique claim codes', async () => {
    const user1 = await seedUser({
      firebaseUid: 'dev-test-reward6a',
      phone: '+919300000006',
      username: 'treward6a',
    });
    const user2 = await seedUser({
      firebaseUid: 'dev-test-reward6b',
      phone: '+919300000007',
      username: 'treward6b',
    });
    await prisma.user.update({ where: { id: user1.id }, data: { currentBalance: 500 } });
    await prisma.user.update({ where: { id: user2.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ perUserLimit: 10 });

    const r1 = await rewardsService.claimOffer(user1.id, offer.id);
    const r2 = await rewardsService.claimOffer(user2.id, offer.id);
    expect(r1.claimCode).not.toBe(r2.claimCode);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (service not defined)**

- [ ] **Step 3: Implement `apps/api/src/services/rewardsService.ts`**

```typescript
import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';
import { randomBytes } from 'node:crypto';

function generateClaimCode(prefix = 'ERU') {
  const rand = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

export const rewardsService = {
  async claimOffer(userId: string, offerId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({ where: { id: offerId } });
      if (!offer) throw Errors.notFound('Offer');
      if (!offer.isActive) throw Errors.badRequest('Offer is not available');
      if (offer.validUntil < new Date()) throw Errors.badRequest('Offer has expired');
      if (offer.stock !== null && offer.stock <= 0) throw Errors.badRequest('Offer is out of stock');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw Errors.notFound('User');
      if (user.currentBalance < offer.pointsCost) {
        throw Errors.badRequest('Insufficient points');
      }

      const existingCount = await tx.userReward.count({
        where: { userId, offerId, status: { not: 'expired' } },
      });
      if (existingCount >= offer.perUserLimit) {
        throw Errors.badRequest(`You have reached the claim limit (${offer.perUserLimit}) for this offer`);
      }

      // Deduct points
      await tx.user.update({
        where: { id: userId },
        data: { currentBalance: { decrement: offer.pointsCost } },
      });

      // Decrement stock if tracked
      if (offer.stock !== null) {
        await tx.offer.update({
          where: { id: offerId },
          data: { stock: { decrement: 1 } },
        });
      }

      // Create the reward
      const reward = await tx.userReward.create({
        data: {
          userId,
          offerId,
          claimCode: generateClaimCode(),
          pointsSpent: offer.pointsCost,
          status: 'active',
          expiresAt: offer.validUntil,
        },
        include: { offer: true },
      });

      return reward;
    });
  },

  async listUserRewards(userId: string, status?: 'active' | 'used' | 'expired') {
    return prisma.userReward.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { offer: { include: { business: true } } },
    });
  },

  async markUsed(userId: string, rewardId: string) {
    const reward = await prisma.userReward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.userId !== userId) throw Errors.notFound('Reward');
    if (reward.status !== 'active') throw Errors.badRequest('Reward is not active');
    return prisma.userReward.update({
      where: { id: rewardId },
      data: { status: 'used', usedAt: new Date() },
    });
  },
};
```

- [ ] **Step 4: Run — expect PASS (all 6)**

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- rewardsService
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/rewardsService.ts apps/api/tests/services/rewardsService.test.ts
git commit -m "feat(api): rewardsService.claimOffer with transactional balance deduction"
```

### Task 1.2: GET /offers + POST /offers/:id/claim routes

- [ ] **Step 1: Add validators**

Append to `apps/api/src/utils/validators.ts`:

```typescript
export const offersQuerySchema = z.object({
  type: z.enum(['local', 'giftcard', 'recharge', 'donate', 'premium', 'all']).default('all'),
  pincode: z.string().length(6).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

- [ ] **Step 2: Write the failing route test**

Create `apps/api/tests/routes/offers.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedOffer(overrides = {}) {
  return prisma.offer.create({
    data: {
      type: 'local',
      title: 'Sample offer',
      pointsCost: 200,
      cashValue: 50 as any,
      validFrom: new Date('2020-01-01'),
      validUntil: new Date('2030-01-01'),
      isActive: true,
      ...overrides,
    },
  });
}

describe('GET /api/v1/offers', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns all active offers grouped by type', async () => {
    await seedOffer({ type: 'local', title: 'Local A' });
    await seedOffer({ type: 'giftcard', title: 'Amazon' });
    const user = await seedUser({ firebaseUid: 'dev-test-off1', phone: '+919400000001', username: 'toff1' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/offers',
      headers: { Authorization: devToken('dev-test-off1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.offers.length).toBe(2);
  });

  it('filters by type query param', async () => {
    await seedOffer({ type: 'local', title: 'Local A' });
    await seedOffer({ type: 'giftcard', title: 'Amazon' });
    const user = await seedUser({ firebaseUid: 'dev-test-off2', phone: '+919400000002', username: 'toff2' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/offers?type=giftcard',
      headers: { Authorization: devToken('dev-test-off2') },
    });

    expect(res.json().offers).toHaveLength(1);
    expect(res.json().offers[0].type).toBe('giftcard');
  });

  it('excludes inactive offers', async () => {
    await seedOffer({ type: 'local', title: 'Active' });
    await seedOffer({ type: 'local', title: 'Inactive', isActive: false });
    const user = await seedUser({ firebaseUid: 'dev-test-off3', phone: '+919400000003', username: 'toff3' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/offers',
      headers: { Authorization: devToken('dev-test-off3') },
    });

    const titles = res.json().offers.map((o: any) => o.title);
    expect(titles).toContain('Active');
    expect(titles).not.toContain('Inactive');
  });
});

describe('POST /api/v1/offers/:id/claim', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
  });

  it('claims the offer and returns the reward with claimCode', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-clm1', phone: '+919400000011', username: 'tclm1' });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ pointsCost: 100 });

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/offers/${offer.id}/claim`,
      headers: { Authorization: devToken('dev-test-clm1') },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().reward.claimCode).toMatch(/^ERU-/);
  });

  it('returns 400 when balance too low', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-clm2', phone: '+919400000012', username: 'tclm2' });
    const offer = await seedOffer({ pointsCost: 999999 });
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/offers/${offer.id}/claim`,
      headers: { Authorization: devToken('dev-test-clm2') },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 3: Run — expect FAIL (route doesn't exist)**

- [ ] **Step 4: Implement `apps/api/src/routes/offers.ts`**

```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { offersQuerySchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { rewardsService } from '../services/rewardsService.js';

export async function offerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/offers', async (request) => {
    const parsed = offersQuerySchema.safeParse(request.query as Record<string, string>);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

    const { type, pincode, page, limit } = parsed.data;
    const where: any = { isActive: true, validUntil: { gte: new Date() } };
    if (type !== 'all') where.type = type;
    if (pincode) where.OR = [{ business: { pincode } }, { businessId: null }];

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { business: true },
      }),
      prisma.offer.count({ where }),
    ]);

    return { offers, page, limit, total };
  });

  app.post('/offers/:id/claim', async (request, reply) => {
    const { id } = request.params as { id: string };
    const reward = await rewardsService.claimOffer(request.userId, id);
    return reply.status(201).send({ reward });
  });
}
```

- [ ] **Step 5: Register in `apps/api/src/app.ts`**

```typescript
import { offerRoutes } from './routes/offers.js';
// ...
app.register(offerRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 6: Run — expect PASS (all 5 route tests)**

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/offers.ts apps/api/src/app.ts apps/api/src/utils/validators.ts apps/api/tests/routes/offers.test.ts
git commit -m "feat(api): offers list + claim routes"
```

### Task 1.3: Mobile offersService

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/services/offersService.test.ts`:

```typescript
import { offersService } from '@/services/offersService';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('offersService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('list() calls GET /offers with type filter', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { offers: [], page: 1, limit: 20, total: 0 },
    });
    await offersService.list('giftcard');
    expect(api.get).toHaveBeenCalledWith('/offers', { params: { type: 'giftcard' } });
  });

  it('claim(id) POSTs to /offers/:id/claim', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { reward: { id: 'r1', claimCode: 'ERU-ABCD' } },
    });
    const reward = await offersService.claim('offer-1');
    expect(api.post).toHaveBeenCalledWith('/offers/offer-1/claim');
    expect(reward.claimCode).toBe('ERU-ABCD');
  });
});
```

- [ ] **Step 2: Implement `apps/mobile/services/offersService.ts`**

```typescript
import { api } from '@/services/api';

export type Offer = {
  id: string;
  type: 'local' | 'giftcard' | 'recharge' | 'donate' | 'premium';
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  cashValue: number;
  validUntil: string;
  business?: { id: string; name: string; pincode: string } | null;
};

export const offersService = {
  async list(type: Offer['type'] | 'all' = 'all') {
    const res = await api.get('/offers', { params: { type } });
    return res.data.offers as Offer[];
  },
  async claim(offerId: string) {
    const res = await api.post(`/offers/${offerId}/claim`);
    return res.data.reward;
  },
};
```

- [ ] **Step 3: Run — expect PASS. Commit.**

```bash
git add apps/mobile/services/offersService.ts apps/mobile/__tests__/services/offersService.test.ts
git commit -m "feat(mobile): offersService list/claim"
```

### Task 1.4: OfferCard component

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/OfferCard.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OfferCard } from '@/components/OfferCard';

describe('<OfferCard />', () => {
  const offer = {
    id: 'o1',
    type: 'local' as const,
    title: '20% off cakes',
    description: 'Valid Fri-Sun',
    pointsCost: 200,
    cashValue: 50,
    imageUrl: null,
    validUntil: '2027-01-01T00:00:00Z',
    business: { id: 'b1', name: 'Kashi Bakes', pincode: '682016' },
  };

  it('renders title, points cost and business name', () => {
    const { getByText } = render(<OfferCard offer={offer} onClaim={jest.fn()} />);
    expect(getByText('20% off cakes')).toBeTruthy();
    expect(getByText(/200/)).toBeTruthy();
    expect(getByText('Kashi Bakes')).toBeTruthy();
  });

  it('calls onClaim with the offer id when Claim tapped', () => {
    const onClaim = jest.fn();
    const { getByText } = render(<OfferCard offer={offer} onClaim={onClaim} />);
    fireEvent.press(getByText(/claim/i));
    expect(onClaim).toHaveBeenCalledWith('o1');
  });

  it('shows "Claimed ✓" after prop flips', () => {
    const { getByText, rerender } = render(<OfferCard offer={offer} claimed={false} onClaim={jest.fn()} />);
    expect(getByText(/claim/i)).toBeTruthy();
    rerender(<OfferCard offer={offer} claimed={true} onClaim={jest.fn()} />);
    expect(getByText(/claimed/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement `apps/mobile/components/OfferCard.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Offer } from '@/services/offersService';

type Props = { offer: Offer; onClaim: (id: string) => void; claimed?: boolean };

export function OfferCard({ offer, onClaim, claimed = false }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.cost}>🪙 {offer.pointsCost}</Text>
      </View>
      {offer.business && (
        <Text style={styles.sub}>{offer.business.name} · {offer.business.pincode}</Text>
      )}
      {offer.description && <Text style={styles.desc}>{offer.description}</Text>}
      <TouchableOpacity
        disabled={claimed}
        onPress={() => onClaim(offer.id)}
        style={[styles.btn, claimed && styles.btnClaimed]}
      >
        <Text style={styles.btnText}>{claimed ? 'Claimed ✓' : 'Claim'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#262626', flex: 1 },
  cost: { fontWeight: '700', color: '#10B981' },
  sub: { color: '#737373', marginTop: 4, fontSize: 12 },
  desc: { color: '#262626', marginTop: 8 },
  btn: {
    marginTop: 12,
    backgroundColor: '#E8792B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnClaimed: { backgroundColor: '#DBDBDB' },
  btnText: { color: '#fff', fontWeight: '700' },
});
```

- [ ] **Step 3: Run — expect PASS. Commit.**

```bash
git add apps/mobile/components/OfferCard.tsx apps/mobile/__tests__/components/OfferCard.test.tsx
git commit -m "feat(mobile): OfferCard component"
```

### Task 1.5: Redeem screen

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/screens/redeem.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RedeemScreen from '@/app/redeem/index';
import { offersService } from '@/services/offersService';

jest.mock('@/services/offersService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: {
    getState: () => ({ balance: 500, refreshSummary: jest.fn() }),
  },
}));

describe('<RedeemScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (offersService.list as jest.Mock).mockResolvedValue([
      { id: 'o1', type: 'local', title: 'Local A', pointsCost: 100, cashValue: 20, validUntil: 'z', business: null, description: null, imageUrl: null },
      { id: 'o2', type: 'giftcard', title: 'Amazon', pointsCost: 1000, cashValue: 100, validUntil: 'z', business: null, description: null, imageUrl: null },
    ]);
  });

  it('renders category tabs', async () => {
    const { findByText } = render(<RedeemScreen />);
    expect(await findByText(/all/i)).toBeTruthy();
    expect(await findByText(/local/i)).toBeTruthy();
    expect(await findByText(/gift cards/i)).toBeTruthy();
  });

  it('shows offers from the service', async () => {
    const { findByText } = render(<RedeemScreen />);
    expect(await findByText('Local A')).toBeTruthy();
    expect(await findByText('Amazon')).toBeTruthy();
  });

  it('filters by category when tab pressed', async () => {
    const { findByText, getByText } = render(<RedeemScreen />);
    await findByText('Amazon');
    fireEvent.press(getByText(/gift cards/i));
    await waitFor(() => {
      expect(offersService.list).toHaveBeenLastCalledWith('giftcard');
    });
  });

  it('calls claim when Claim is tapped and shows the claim code', async () => {
    (offersService.claim as jest.Mock).mockResolvedValue({
      id: 'r1', claimCode: 'ERU-AB12', pointsSpent: 100, expiresAt: 'z', offer: { title: 'Local A' },
    });
    const { findByText, getAllByText } = render(<RedeemScreen />);
    await findByText('Local A');
    fireEvent.press(getAllByText(/claim/i)[0]);
    expect(await findByText(/ERU-AB12/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement `apps/mobile/app/redeem/index.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { offersService, Offer } from '@/services/offersService';
import { OfferCard } from '@/components/OfferCard';
import { usePointsStore } from '@/stores/pointsStore';

const CATEGORIES: { key: Offer['type'] | 'all'; label: string }[] = [
  { key: 'all', label: '🔥 All' },
  { key: 'local', label: '🏪 Local' },
  { key: 'giftcard', label: '🎁 Gift Cards' },
  { key: 'recharge', label: '📱 Recharge' },
  { key: 'donate', label: '💝 Donate' },
  { key: 'premium', label: '⭐ Premium' },
];

export default function RedeemScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Offer['type'] | 'all'>('all');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    offersService.list(category).then((data) => {
      if (!alive) return;
      setOffers(data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [category]);

  async function handleClaim(offerId: string) {
    try {
      const reward = await offersService.claim(offerId);
      setClaimed((prev) => ({ ...prev, [offerId]: reward.claimCode }));
      await usePointsStore.getState().refreshSummary();
      Alert.alert('Claimed!', `Your code: ${reward.claimCode}`);
    } catch (e: any) {
      Alert.alert('Could not claim', e?.response?.data?.error ?? 'Try again');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Redeem</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            onPress={() => setCategory(c.key)}
            style={[styles.tab, category === c.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, category === c.key && styles.tabTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : offers.length === 0 ? (
          <Text style={styles.empty}>No offers available</Text>
        ) : (
          offers.map((offer) => (
            <View key={offer.id}>
              <OfferCard offer={offer} onClaim={handleClaim} claimed={!!claimed[offer.id]} />
              {claimed[offer.id] && (
                <Text style={styles.code}>Code: {claimed[offer.id]}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  back: { fontSize: 24, color: '#262626' },
  title: { fontSize: 18, fontWeight: '700', color: '#262626' },
  tabs: { padding: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DBDBDB' },
  tabActive: { backgroundColor: '#262626', borderColor: '#262626' },
  tabText: { color: '#262626', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { padding: 14 },
  empty: { textAlign: 'center', marginTop: 40, color: '#8E8E8E' },
  code: { color: '#10B981', fontWeight: '700', marginTop: -6, marginBottom: 10 },
});
```

- [ ] **Step 3: Run — expect PASS. Commit.**

```bash
git add apps/mobile/app/redeem/index.tsx apps/mobile/__tests__/screens/redeem.test.tsx
git commit -m "feat(mobile): Redeem store screen"
```

---

# Feature 2 — My Rewards (list + QR code)

**Goal:** Users see their claimed rewards, filtered by status (Active / Watchlist / Used / Expired), with QR codes for in-store redemption.

**Files:**
- Create: `apps/api/src/routes/rewards.ts`
- Create: `apps/api/tests/routes/rewards.test.ts`
- Create: `apps/mobile/app/my-rewards/index.tsx`
- Create: `apps/mobile/components/RewardCard.tsx`
- Create: `apps/mobile/services/rewardsService.ts`
- Create: `apps/mobile/__tests__/services/rewardsService.test.ts`
- Create: `apps/mobile/__tests__/components/RewardCard.test.tsx`
- Create: `apps/mobile/__tests__/screens/myRewards.test.tsx`
- Modify: `apps/api/src/app.ts` (register rewards route)

### Task 2.1: API /rewards endpoints

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/routes/rewards.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/rewards', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.userReward.deleteMany({});
    await prisma.offer.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns the users rewards', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-mr1', phone: '+919500000001', username: 'tmr1' });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 1000 } });
    const offer = await prisma.offer.create({
      data: {
        type: 'giftcard',
        title: 'Amazon',
        pointsCost: 100,
        cashValue: 10 as any,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
      },
    });
    await prisma.userReward.create({
      data: {
        userId: user.id,
        offerId: offer.id,
        claimCode: 'ERU-TEST',
        pointsSpent: 100,
        expiresAt: new Date('2030-01-01'),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/rewards',
      headers: { Authorization: devToken('dev-test-mr1') },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().rewards).toHaveLength(1);
    expect(res.json().rewards[0].claimCode).toBe('ERU-TEST');
  });

  it('filters by status', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-mr2', phone: '+919500000002', username: 'tmr2' });
    const offer = await prisma.offer.create({
      data: {
        type: 'giftcard',
        title: 'X',
        pointsCost: 10,
        cashValue: 1 as any,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
      },
    });
    await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'A', pointsSpent: 10, status: 'active', expiresAt: new Date('2030-01-01') },
    });
    await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'B', pointsSpent: 10, status: 'used', usedAt: new Date(), expiresAt: new Date('2030-01-01') },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/rewards?status=active',
      headers: { Authorization: devToken('dev-test-mr2') },
    });
    expect(res.json().rewards).toHaveLength(1);
    expect(res.json().rewards[0].claimCode).toBe('A');
  });
});

describe('PUT /api/v1/rewards/:id/use', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.userReward.deleteMany({});
    await prisma.offer.deleteMany({});
  });

  it('marks an active reward as used', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-use', phone: '+919500000009', username: 'tuse' });
    const offer = await prisma.offer.create({
      data: { type: 'local', title: 'Y', pointsCost: 10, cashValue: 1 as any, validFrom: new Date('2020-01-01'), validUntil: new Date('2030-01-01') },
    });
    const reward = await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'Z', pointsSpent: 10, status: 'active', expiresAt: new Date('2030-01-01') },
    });

    const res = await getTestApp().inject({
      method: 'PUT',
      url: `/api/v1/rewards/${reward.id}/use`,
      headers: { Authorization: devToken('dev-test-use') },
    });
    expect(res.statusCode).toBe(200);
    const after = await prisma.userReward.findUnique({ where: { id: reward.id } });
    expect(after?.status).toBe('used');
  });
});
```

- [ ] **Step 2: Implement `apps/api/src/routes/rewards.ts`**

```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';
import { rewardsService } from '../services/rewardsService.js';
import { z } from 'zod';

export async function rewardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  const statusSchema = z.object({
    status: z.enum(['active', 'used', 'expired']).optional(),
  });

  app.get('/rewards', async (request) => {
    const parsed = statusSchema.safeParse(request.query);
    if (!parsed.success) throw Errors.badRequest('Invalid status');
    const rewards = await rewardsService.listUserRewards(request.userId, parsed.data.status);
    return { rewards };
  });

  app.put('/rewards/:id/use', async (request) => {
    const { id } = request.params as { id: string };
    const reward = await rewardsService.markUsed(request.userId, id);
    return { reward };
  });
}
```

- [ ] **Step 3: Register + test + commit**

```typescript
// apps/api/src/app.ts
import { rewardRoutes } from './routes/rewards.js';
app.register(rewardRoutes, { prefix: '/api/v1' });
```

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- rewards
git add apps/api/src/routes/rewards.ts apps/api/src/app.ts apps/api/tests/routes/rewards.test.ts
git commit -m "feat(api): /rewards list + mark-used"
```

### Task 2.2: Mobile rewardsService + RewardCard + screen

Following the same TDD pattern established above (tests first, minimal code, commit), ship these three pieces:

- [ ] **rewardsService.ts** — `list(status?)`, `markUsed(id)` mirroring the API.
- [ ] **RewardCard.tsx** — renders title, expiry countdown, status badge, QR code (install `react-native-qrcode-svg`), "Use at store" button.
- [ ] **my-rewards/index.tsx** — filter tabs (Active / Used / Expired), maps rewards to cards.

Test templates follow the same shape as Feature 1 — one test per behavior, mock `@/services/rewardsService`, assert on role/text.

**Dependency:**

```bash
cd apps/mobile && npm install react-native-qrcode-svg react-native-svg
```

**Key QR rendering:**

```typescript
import QRCode from 'react-native-qrcode-svg';
<QRCode value={reward.claimCode} size={160} />
```

Commit each of the three in sequence. Sample test stubs:

```typescript
// RewardCard.test.tsx
it('renders the claim code as a QR code', () => {
  const { getByTestId } = render(<RewardCard reward={sampleReward} onUse={jest.fn()} />);
  expect(getByTestId('reward-qr')).toBeTruthy();
});

it('shows "ACTIVE" badge for active rewards', () => {
  const { getByText } = render(<RewardCard reward={{ ...sampleReward, status: 'active' }} onUse={jest.fn()} />);
  expect(getByText(/active/i)).toBeTruthy();
});

it('calls onUse(id) when "Use at store" pressed', () => {
  const onUse = jest.fn();
  const { getByText } = render(<RewardCard reward={sampleReward} onUse={onUse} />);
  fireEvent.press(getByText(/use at store/i));
  expect(onUse).toHaveBeenCalledWith(sampleReward.id);
});
```

```bash
git commit -m "feat(mobile): my-rewards screen with QR redemption"
```

---

# Feature 3 — Wallet extras (tier progress + quick actions + expiry)

**Goal:** Wallet screen shows tier progress bar, 5 quick-action buttons (Shop/Local/Gift/Recharge/Donate), and a points-expiry warning.

**Why:** Currently the wallet is a dead-end — you see your balance but have no CTAs. Adding tier progress (gamifies earning) + quick-actions (routes to Redeem) closes the loop.

**Files:**
- Create: `apps/mobile/components/TierProgressCard.tsx` + test
- Create: `apps/mobile/components/WalletQuickActions.tsx` + test
- Modify: `apps/mobile/app/wallet/index.tsx`
- Modify: API `/wallet` endpoint to return `lifetimePoints`, `nextTierAt`, `expiringPoints`, `expiringDays`

### Task 3.1: Extend /wallet endpoint

- [ ] **Step 1: Write failing API test**

Create `apps/api/tests/routes/wallet-tier.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/wallet — tier + expiry', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns tier progress (currentTier, nextTier, pointsToNext)', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wt1', phone: '+919600000001', username: 'twt1' });
    await prisma.user.update({
      where: { id: user.id },
      data: { lifetimePoints: 8000, currentBalance: 2000, tier: 'engager' },
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { Authorization: devToken('dev-test-wt1') },
    });
    const body = res.json();
    expect(body.wallet.currentTier).toBe('engager');
    expect(body.wallet.nextTier).toBe('influencer');
    expect(body.wallet.pointsToNext).toBe(2000);
  });

  it('returns expiringPoints and expiringDays when ledger entries expire soon', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wt2', phone: '+919600000002', username: 'twt2' });
    await prisma.pointsLedger.create({
      data: {
        userId: user.id,
        actionType: 'like',
        points: 100,
        multiplierApplied: 1.0 as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/wallet',
      headers: { Authorization: devToken('dev-test-wt2') },
    });
    const body = res.json();
    expect(body.wallet.expiringPoints).toBe(100);
    expect(body.wallet.expiringDays).toBeLessThanOrEqual(8);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Extend `apps/api/src/routes/wallet.ts`**

Open the existing `wallet.ts` and update the `/wallet` handler to include the tier + expiry fields. Use `@eru/shared`'s `getTierForPoints` and `getMultiplier` helpers. Add:

```typescript
import { getTierForPoints } from '@eru/shared';

// Inside /wallet handler, after fetching user:
const lifetimePoints = user.lifetimePoints;
const currentTier = getTierForPoints(lifetimePoints);
const tierThresholds: Record<string, number> = {
  explorer: 2000,
  engager: 10000,
  influencer: 50000,
  champion: Number.POSITIVE_INFINITY,
};
const nextTier =
  currentTier === 'explorer' ? 'engager' :
  currentTier === 'engager' ? 'influencer' :
  currentTier === 'influencer' ? 'champion' : null;
const nextThreshold = nextTier ? tierThresholds[currentTier] : null;
const pointsToNext = nextThreshold !== null ? Math.max(0, nextThreshold - lifetimePoints) : 0;

// Expiring points (within next 15 days)
const soon = new Date();
soon.setDate(soon.getDate() + 15);
const expiringAgg = await prisma.pointsLedger.aggregate({
  where: {
    userId: request.userId,
    expired: false,
    redeemedAt: null,
    expiresAt: { lte: soon },
  },
  _sum: { points: true },
  _min: { expiresAt: true },
});
const expiringPoints = expiringAgg._sum.points ?? 0;
const expiringDays = expiringAgg._min.expiresAt
  ? Math.max(0, Math.ceil((expiringAgg._min.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
  : null;

return {
  wallet: {
    balance: user.currentBalance,
    rupeeValue: user.currentBalance * 0.01,
    lifetimePoints,
    currentTier,
    nextTier,
    pointsToNext,
    expiringPoints,
    expiringDays,
    // ... existing fields
  },
};
```

- [ ] **Step 4: Run — expect PASS. Commit.**

### Task 3.2: TierProgressCard component

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/TierProgressCard.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { TierProgressCard } from '@/components/TierProgressCard';

describe('<TierProgressCard />', () => {
  it('shows current tier and multiplier', () => {
    const { getByText } = render(
      <TierProgressCard currentTier="influencer" nextTier="champion" pointsToNext={4820} lifetimePoints={45180} />,
    );
    expect(getByText(/influencer/i)).toBeTruthy();
    expect(getByText(/1.5x/i)).toBeTruthy();
  });

  it('shows points to next tier', () => {
    const { getByText } = render(
      <TierProgressCard currentTier="influencer" nextTier="champion" pointsToNext={4820} lifetimePoints={45180} />,
    );
    expect(getByText(/4,820/)).toBeTruthy();
    expect(getByText(/champion/i)).toBeTruthy();
  });

  it('renders progress bar fill proportional to progress', () => {
    const { getByTestId } = render(
      <TierProgressCard currentTier="engager" nextTier="influencer" pointsToNext={2000} lifetimePoints={8000} />,
    );
    const fill = getByTestId('progress-fill');
    // 8000 / 10000 = 80%
    expect(fill.props.style).toEqual(expect.objectContaining({ width: '80%' }));
  });

  it('hides progress bar if at max tier', () => {
    const { queryByTestId } = render(
      <TierProgressCard currentTier="champion" nextTier={null} pointsToNext={0} lifetimePoints={80000} />,
    );
    expect(queryByTestId('progress-fill')).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `apps/mobile/components/TierProgressCard.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TIER_META: Record<string, { label: string; emoji: string; multiplier: string; threshold: number }> = {
  explorer:   { label: 'Explorer', emoji: '🌱', multiplier: '1.0x', threshold: 2000 },
  engager:    { label: 'Engager', emoji: '⚡', multiplier: '1.2x', threshold: 10000 },
  influencer: { label: 'Influencer', emoji: '🌟', multiplier: '1.5x', threshold: 50000 },
  champion:   { label: 'Champion', emoji: '👑', multiplier: '2.0x', threshold: 0 },
};

type Props = {
  currentTier: string;
  nextTier: string | null;
  pointsToNext: number;
  lifetimePoints: number;
};

export function TierProgressCard({ currentTier, nextTier, pointsToNext, lifetimePoints }: Props) {
  const current = TIER_META[currentTier];
  const threshold = current.threshold;
  const progressPct = nextTier && threshold > 0
    ? Math.min(100, Math.round((lifetimePoints / threshold) * 100))
    : 100;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <View>
          <Text style={styles.tierLabel}>{current.label} Tier</Text>
          <Text style={styles.multi}>{current.multiplier} multiplier</Text>
        </View>
      </View>

      {nextTier && (
        <>
          <View style={styles.barWrap}>
            <View testID="progress-fill" style={[styles.barFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {lifetimePoints.toLocaleString()} / {threshold.toLocaleString()}
          </Text>
          <Text style={styles.hint}>
            {pointsToNext.toLocaleString()} pts away from {TIER_META[nextTier].label} ({TIER_META[nextTier].multiplier}) 🚀
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 32, marginRight: 12 },
  tierLabel: { fontWeight: '700', fontSize: 16, color: '#262626' },
  multi: { color: '#737373', fontSize: 13 },
  barWrap: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#1A3C6E', borderRadius: 4 },
  progressText: { marginTop: 6, fontSize: 12, color: '#737373' },
  hint: { marginTop: 4, fontSize: 12, color: '#10B981' },
});
```

- [ ] **Step 3: Run + commit.**

### Task 3.3: WalletQuickActions component

- [ ] **Step 1: Failing test**

```typescript
// WalletQuickActions.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WalletQuickActions } from '@/components/WalletQuickActions';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('<WalletQuickActions />', () => {
  it('renders 5 action buttons', () => {
    const { getAllByTestId } = render(<WalletQuickActions />);
    expect(getAllByTestId(/wallet-action-/)).toHaveLength(5);
  });

  it('each button has its label', () => {
    const { getByText } = render(<WalletQuickActions />);
    ['Shop', 'Local', 'Gift Cards', 'Recharge', 'Donate'].forEach((label) => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('tapping Gift Cards navigates to /redeem?type=giftcard', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push });
    const { getByText } = render(<WalletQuickActions />);
    fireEvent.press(getByText('Gift Cards'));
    expect(push).toHaveBeenCalledWith({ pathname: '/redeem', params: { type: 'giftcard' } });
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// components/WalletQuickActions.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const ACTIONS = [
  { key: 'all', emoji: '🛒', label: 'Shop' },
  { key: 'local', emoji: '🏪', label: 'Local' },
  { key: 'giftcard', emoji: '🎁', label: 'Gift Cards' },
  { key: 'recharge', emoji: '📱', label: 'Recharge' },
  { key: 'donate', emoji: '💝', label: 'Donate' },
];

export function WalletQuickActions() {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <TouchableOpacity
          key={a.key}
          testID={`wallet-action-${a.key}`}
          onPress={() => router.push({ pathname: '/redeem', params: { type: a.key } })}
          style={styles.btn}
        >
          <Text style={styles.emoji}>{a.emoji}</Text>
          <Text style={styles.label}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginVertical: 8 },
  btn: { alignItems: 'center', flex: 1 },
  emoji: { fontSize: 22 },
  label: { fontSize: 11, marginTop: 4, color: '#262626' },
});
```

- [ ] **Step 3: Wire into `apps/mobile/app/wallet/index.tsx`**

Import both components. Render `<TierProgressCard>` below the balance card and `<WalletQuickActions>` inside the balance card.

- [ ] **Step 4: Commit.**

---

# Feature 4 — Weekly Quests

**Goal:** Show 5-task quest card on the leaderboard screen. Each quest has title, progress bar, reward points. Completing all 5 awards a bonus.

**Architecture:** Quest rows stored in `Quest` (seeded). Progress derived from `PointsLedger` grouped by `actionType` within the week. A `UserQuestProgress` row is created/updated as actions are logged.

**Files:**
- Create: `apps/api/src/services/questsService.ts` + test
- Create: `apps/api/src/routes/quests.ts` + test
- Hook `questsService.recordAction` from `pointsEngine.earn` so progress updates on every earn
- Create: `apps/mobile/services/questsService.ts`
- Create: `apps/mobile/components/QuestRow.tsx`, `WeeklyQuestsCard.tsx` + tests
- Modify: `apps/mobile/app/leaderboard/index.tsx` to include the card

### Task 4.1: questsService.getWeeklyProgress

- [ ] **Step 1: Failing test**

Create `apps/api/tests/services/questsService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { questsService } from '../../src/services/questsService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

function startOfWeek(d = new Date()) {
  const copy = new Date(d);
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - day);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

describe('questsService.getWeeklyProgress', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.quest.deleteMany({});
    await prisma.userQuestProgress.deleteMany({});
  });
  afterAll(cleanupTestData);

  it('returns all active weekly quests with current progress=0 if none', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-q1', phone: '+919700000001', username: 'tq1' });
    await prisma.quest.create({
      data: { id: 'qa', title: 'Read 5', actionType: 'read_article', targetCount: 5, rewardPoints: 25, period: 'weekly' },
    });

    const result = await questsService.getWeeklyProgress(user.id);
    expect(result).toHaveLength(1);
    expect(result[0].currentCount).toBe(0);
    expect(result[0].completedAt).toBeNull();
  });

  it('counts matching action types in PointsLedger within the current week', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-q2', phone: '+919700000002', username: 'tq2' });
    await prisma.quest.create({
      data: { id: 'qb', title: 'Read 5', actionType: 'read_article', targetCount: 5, rewardPoints: 25, period: 'weekly' },
    });
    for (let i = 0; i < 3; i++) {
      await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          actionType: 'read_article',
          points: 4,
          multiplierApplied: 1.0 as any,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const result = await questsService.getWeeklyProgress(user.id);
    expect(result[0].currentCount).toBe(3);
  });

  it('marks as completed when currentCount >= targetCount', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-q3', phone: '+919700000003', username: 'tq3' });
    await prisma.quest.create({
      data: { id: 'qc', title: 'Share 3', actionType: 'share', targetCount: 3, rewardPoints: 30, period: 'weekly' },
    });
    for (let i = 0; i < 3; i++) {
      await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          actionType: 'share',
          points: 2,
          multiplierApplied: 1.0 as any,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      });
    }
    const result = await questsService.getWeeklyProgress(user.id);
    expect(result[0].currentCount).toBe(3);
    expect(result[0].completed).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `apps/api/src/services/questsService.ts`**

```typescript
import { prisma } from '../utils/prisma.js';

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export const questsService = {
  async getWeeklyProgress(userId: string) {
    const quests = await prisma.quest.findMany({
      where: { isActive: true, period: 'weekly' },
      orderBy: { createdAt: 'asc' },
    });
    const periodStart = startOfCurrentWeek();

    const counts = await Promise.all(
      quests.map(async (q) => {
        const count = await prisma.pointsLedger.count({
          where: {
            userId,
            actionType: q.actionType,
            createdAt: { gte: periodStart },
          },
        });
        return {
          id: q.id,
          title: q.title,
          description: q.description,
          actionType: q.actionType,
          targetCount: q.targetCount,
          rewardPoints: q.rewardPoints,
          currentCount: Math.min(count, q.targetCount),
          completed: count >= q.targetCount,
        };
      }),
    );

    return counts;
  },
};
```

- [ ] **Step 3: Run — expect PASS. Commit.**

### Task 4.2: GET /quests/weekly

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/routes/quests.test.ts
describe('GET /api/v1/quests/weekly', () => {
  beforeEach(cleanupTestData);
  it('returns the user\'s weekly quest progress', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-qr1', phone: '+919800000001', username: 'tqr1' });
    await prisma.quest.create({
      data: { id: 'qz', title: 'Q', actionType: 'like', targetCount: 5, rewardPoints: 25, period: 'weekly' },
    });
    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/quests/weekly',
      headers: { Authorization: devToken('dev-test-qr1') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().quests).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/routes/quests.ts
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { questsService } from '../services/questsService.js';

export async function questsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/quests/weekly', async (request) => {
    const quests = await questsService.getWeeklyProgress(request.userId);
    return { quests };
  });
}
```

Register in `app.ts`, run test, commit.

### Task 4.3: Mobile questsService, QuestRow, WeeklyQuestsCard

- [ ] **questsService.ts** mirrors the API: `getWeekly()` → `api.get('/quests/weekly')`.
- [ ] **QuestRow.tsx** renders one quest with title, progress "{current}/{target}", reward, progress bar colored green if completed.
- [ ] **WeeklyQuestsCard.tsx** wraps multiple rows under a "🎯 Weekly Quests" header with count "3/5 Complete" and bonus text.

Sample test for QuestRow:

```typescript
it('renders filled progress bar when complete', () => {
  const { getByTestId } = render(
    <QuestRow quest={{ id: 'q1', title: 'x', currentCount: 5, targetCount: 5, rewardPoints: 25, completed: true, actionType: 'read_article', description: null }} />,
  );
  const fill = getByTestId('progress-fill');
  expect(fill.props.style).toEqual(expect.objectContaining({ width: '100%', backgroundColor: '#10B981' }));
});

it('shows "{n}/{target}" for incomplete', () => {
  const { getByText } = render(
    <QuestRow quest={{ id: 'q1', title: 'Watch reels', currentCount: 3, targetCount: 10, rewardPoints: 25, completed: false, actionType: 'reel_watch', description: null }} />,
  );
  expect(getByText('3/10')).toBeTruthy();
});
```

Commit each. Then integrate `<WeeklyQuestsCard />` into `apps/mobile/app/leaderboard/index.tsx`:

```typescript
import { WeeklyQuestsCard } from '@/components/WeeklyQuestsCard';
// ... inside JSX, below the leaderboard list:
<WeeklyQuestsCard />
```

Commit final wiring.

---

# Feature 5 — Daily Spin

**Goal:** Once per calendar day, user taps "Spin" and wins 1–50 pts. Result is persisted; user cannot spin again until tomorrow.

**Backend:** `POST /spin` — returns `{ pointsAwarded }` or 409 if already spun today.

**Files:**
- Create: `apps/api/src/services/spinService.ts` + test
- Create: `apps/api/src/routes/spin.ts` + test
- Create: `apps/mobile/app/spin/index.tsx`, `components/SpinWheel.tsx` + tests
- Create: `apps/mobile/services/spinService.ts`

### Task 5.1: spinService.spin

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/services/spinService.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { spinService } from '../../src/services/spinService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

describe('spinService.spin', () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it('awards between 1 and 50 points on first spin of day', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-sp1', phone: '+919900000001', username: 'tsp1' });
    const result = await spinService.spin(user.id);
    expect(result.pointsAwarded).toBeGreaterThanOrEqual(1);
    expect(result.pointsAwarded).toBeLessThanOrEqual(50);
  });

  it('persists the result and adds to user balance', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-sp2', phone: '+919900000002', username: 'tsp2' });
    const before = await prisma.user.findUnique({ where: { id: user.id } });
    const result = await spinService.spin(user.id);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.currentBalance - before!.currentBalance).toBe(result.pointsAwarded);
  });

  it('rejects a second spin on the same day', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-sp3', phone: '+919900000003', username: 'tsp3' });
    await spinService.spin(user.id);
    await expect(spinService.spin(user.id)).rejects.toThrow(/already spun/i);
  });

  it('canSpin() returns false after spinning', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-sp4', phone: '+919900000004', username: 'tsp4' });
    expect(await spinService.canSpin(user.id)).toBe(true);
    await spinService.spin(user.id);
    expect(await spinService.canSpin(user.id)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/services/spinService.ts
import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';

function todayDate() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const spinService = {
  async canSpin(userId: string): Promise<boolean> {
    const existing = await prisma.spinResult.findUnique({
      where: { userId_spinDate: { userId, spinDate: todayDate() } },
    });
    return !existing;
  },

  async spin(userId: string) {
    const today = todayDate();
    const exists = await prisma.spinResult.findUnique({
      where: { userId_spinDate: { userId, spinDate: today } },
    });
    if (exists) throw Errors.conflict('You have already spun today');

    const pointsAwarded = Math.floor(Math.random() * 50) + 1;

    await prisma.$transaction([
      prisma.spinResult.create({
        data: { userId, spinDate: today, pointsAwarded },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { currentBalance: { increment: pointsAwarded } },
      }),
      prisma.pointsLedger.create({
        data: {
          userId,
          actionType: 'daily_spin',
          points: pointsAwarded,
          multiplierApplied: 1.0 as any,
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return { pointsAwarded };
  },
};
```

- [ ] **Step 3: Run + commit.**

### Task 5.2: POST /spin route

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/routes/spin.test.ts
describe('POST /api/v1/spin', () => {
  beforeEach(cleanupTestData);
  it('returns pointsAwarded on first spin', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-sr1', phone: '+919900000099', username: 'tsr1' });
    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/spin',
      headers: { Authorization: devToken('dev-test-sr1') },
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().pointsAwarded).toBe('number');
  });
  it('returns 409 on second spin of day', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-sr2', phone: '+919900000098', username: 'tsr2' });
    await getTestApp().inject({
      method: 'POST', url: '/api/v1/spin',
      headers: { Authorization: devToken('dev-test-sr2') },
    });
    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/spin',
      headers: { Authorization: devToken('dev-test-sr2') },
    });
    expect(res.statusCode).toBe(409);
  });
  it('GET /spin/status tells you whether you can spin', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-sr3', phone: '+919900000097', username: 'tsr3' });
    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/spin/status',
      headers: { Authorization: devToken('dev-test-sr3') },
    });
    expect(res.json().canSpin).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/routes/spin.ts
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { spinService } from '../services/spinService.js';

export async function spinRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.post('/spin', async (request) => {
    return spinService.spin(request.userId);
  });
  app.get('/spin/status', async (request) => {
    const canSpin = await spinService.canSpin(request.userId);
    return { canSpin };
  });
}
```

Register, test, commit.

### Task 5.3: Mobile SpinWheel + screen

- [ ] **SpinWheel.tsx** — visually renders a wheel with numbers. Has a `spinning` prop. On tap, calls `onSpin()`. Tests: renders, disabled while spinning, calls callback.
- [ ] **spin/index.tsx** — uses `spinService.status()` to decide whether to show the wheel or a "Come back tomorrow" state. On tap, calls `spinService.spin()`, animates to the result, shows a points toast.

Sample test:

```typescript
it('shows "Come back tomorrow" when canSpin is false', async () => {
  (spinService.status as jest.Mock).mockResolvedValue({ canSpin: false });
  const { findByText } = render(<SpinScreen />);
  expect(await findByText(/come back tomorrow/i)).toBeTruthy();
});

it('calls spinService.spin and shows result on tap', async () => {
  (spinService.status as jest.Mock).mockResolvedValue({ canSpin: true });
  (spinService.spin as jest.Mock).mockResolvedValue({ pointsAwarded: 27 });
  const { getByText, findByText } = render(<SpinScreen />);
  fireEvent.press(getByText(/spin now/i));
  expect(await findByText(/27/)).toBeTruthy();
});
```

Commit in 3 steps: wheel, service, screen.

---

# Feature 6 — Badges

**Goal:** 12 badge definitions (see seed). Users unlock badges automatically when they hit thresholds (first purchase, 10 reviews, 7-day streak, etc.). A Badges screen shows a grid of all 12 with locked/unlocked state.

**Architecture:** Unlock logic runs:
- On `pointsEngine.earn` (e.g., streak badges after streak update)
- On `rewardsService.claimOffer` (for first-purchase badge)
- Via a cron that backfills (daily job)

**Files:**
- Create: `apps/api/src/services/badgesService.ts` + test
- Create: `apps/api/src/routes/badges.ts` + test
- Create: `apps/mobile/app/badges/index.tsx`
- Create: `apps/mobile/components/BadgeGrid.tsx` + test
- Create: `apps/mobile/services/badgesService.ts`

### Task 6.1: badgesService.checkAndUnlock

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/services/badgesService.test.ts
describe('badgesService.checkAndUnlock', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.badge.deleteMany({});
    await prisma.userBadge.deleteMany({});
  });

  it('unlocks streak_7 when user streak reaches 7', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bd1', phone: '+911010000001', username: 'tbd1' });
    await prisma.badge.create({
      data: {
        code: 'streak_7', title: '7', description: '', emoji: '🔥',
        unlockRule: { type: 'streak_days', threshold: 7 },
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { streakDays: 7 } });

    await badgesService.checkAndUnlock(user.id);

    const ub = await prisma.userBadge.findFirst({
      where: { userId: user.id, badge: { code: 'streak_7' } },
    });
    expect(ub).not.toBeNull();
  });

  it('does not double-unlock', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bd2', phone: '+911010000002', username: 'tbd2' });
    const badge = await prisma.badge.create({
      data: {
        code: 'streak_7', title: '7', description: '', emoji: '🔥',
        unlockRule: { type: 'streak_days', threshold: 7 },
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { streakDays: 10 } });

    await badgesService.checkAndUnlock(user.id);
    await badgesService.checkAndUnlock(user.id);

    const count = await prisma.userBadge.count({ where: { userId: user.id, badgeId: badge.id } });
    expect(count).toBe(1);
  });

  it('unlocks first_purchase after a reward is claimed', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bd3', phone: '+911010000003', username: 'tbd3' });
    await prisma.badge.create({
      data: {
        code: 'first_purchase', title: '1st', description: '', emoji: '🛍️',
        unlockRule: { type: 'rewards_claimed', threshold: 1 },
      },
    });
    const offer = await prisma.offer.create({
      data: {
        type: 'local', title: 'X', pointsCost: 10, cashValue: 1 as any,
        validFrom: new Date('2020-01-01'), validUntil: new Date('2030-01-01'),
      },
    });
    await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'A', pointsSpent: 10, expiresAt: new Date('2030-01-01') },
    });

    await badgesService.checkAndUnlock(user.id);

    const ub = await prisma.userBadge.findFirst({
      where: { userId: user.id, badge: { code: 'first_purchase' } },
    });
    expect(ub).not.toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/services/badgesService.ts
import { prisma } from '../utils/prisma.js';

type UnlockRule =
  | { type: 'streak_days'; threshold: number }
  | { type: 'rewards_claimed'; threshold: number }
  | { type: 'posts_published'; threshold: number }
  | { type: 'reviews_written'; threshold: number };

async function meetsRule(userId: string, rule: UnlockRule): Promise<boolean> {
  if (rule.type === 'streak_days') {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { streakDays: true } });
    return (u?.streakDays ?? 0) >= rule.threshold;
  }
  if (rule.type === 'rewards_claimed') {
    const count = await prisma.userReward.count({ where: { userId } });
    return count >= rule.threshold;
  }
  if (rule.type === 'posts_published') {
    const count = await prisma.content.count({
      where: { userId, moderationStatus: 'published' },
    });
    return count >= rule.threshold;
  }
  if (rule.type === 'reviews_written') {
    const count = await prisma.pointsLedger.count({
      where: { userId, actionType: 'review' as any },
    });
    return count >= rule.threshold;
  }
  return false;
}

export const badgesService = {
  async checkAndUnlock(userId: string) {
    const all = await prisma.badge.findMany();
    const owned = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const ownedIds = new Set(owned.map((b) => b.badgeId));

    for (const badge of all) {
      if (ownedIds.has(badge.id)) continue;
      const rule = badge.unlockRule as UnlockRule;
      if (await meetsRule(userId, rule)) {
        await prisma.userBadge.create({
          data: { userId, badgeId: badge.id },
        });
      }
    }
  },

  async listWithStatus(userId: string) {
    const badges = await prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } });
    const owned = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, unlockedAt: true },
    });
    const map = new Map(owned.map((b) => [b.badgeId, b.unlockedAt]));

    return badges.map((b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      description: b.description,
      emoji: b.emoji,
      unlockedAt: map.get(b.id) ?? null,
    }));
  },
};
```

- [ ] **Step 3: Hook `badgesService.checkAndUnlock(userId)` into**:
  - `pointsEngine.earn` (after streak update) — fire and forget
  - `rewardsService.claimOffer` (after transaction commits) — fire and forget

```typescript
// In pointsEngine.ts, after updating streak:
badgesService.checkAndUnlock(userId).catch(() => {});

// In rewardsService.ts claimOffer, after the transaction:
badgesService.checkAndUnlock(userId).catch(() => {});
```

- [ ] **Step 4: Run + commit.**

### Task 6.2: GET /badges route

- [ ] **Step 1: Failing test**

```typescript
// apps/api/tests/routes/badges.test.ts
describe('GET /api/v1/badges', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.userBadge.deleteMany({});
    await prisma.badge.deleteMany({});
  });

  it('returns all badges with locked/unlocked status for the user', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-brd1', phone: '+911010000011', username: 'tbrd1' });
    await prisma.badge.create({
      data: { code: 'a', title: 'A', description: '', emoji: '🎯', unlockRule: { type: 'streak_days', threshold: 7 } },
    });
    await prisma.badge.create({
      data: { code: 'b', title: 'B', description: '', emoji: '⭐', unlockRule: { type: 'streak_days', threshold: 30 } },
    });
    await prisma.user.update({ where: { id: user.id }, data: { streakDays: 8 } });

    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/badges',
      headers: { Authorization: devToken('dev-test-brd1') },
    });

    const badges = res.json().badges;
    expect(badges).toHaveLength(2);
    const a = badges.find((b: any) => b.code === 'a');
    const b = badges.find((b: any) => b.code === 'b');
    expect(a.unlockedAt).toBeNull();
    expect(b.unlockedAt).toBeNull();

    // Trigger unlock
    await getTestApp().inject({
      method: 'POST', url: '/api/v1/badges/check',
      headers: { Authorization: devToken('dev-test-brd1') },
    });
    const res2 = await getTestApp().inject({
      method: 'GET', url: '/api/v1/badges',
      headers: { Authorization: devToken('dev-test-brd1') },
    });
    const badges2 = res2.json().badges;
    const a2 = badges2.find((x: any) => x.code === 'a');
    expect(a2.unlockedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/api/src/routes/badges.ts
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { badgesService } from '../services/badgesService.js';

export async function badgesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.get('/badges', async (request) => {
    const badges = await badgesService.listWithStatus(request.userId);
    return { badges };
  });
  app.post('/badges/check', async (request) => {
    await badgesService.checkAndUnlock(request.userId);
    return { success: true };
  });
}
```

Register, test, commit.

### Task 6.3: Mobile BadgeGrid + screen

- [ ] **BadgeGrid.tsx** — renders badges as a 4-column grid. Unlocked badges show in full color; locked badges at 25% opacity.

```typescript
it('renders unlocked badge in full color', () => {
  const { getByTestId } = render(<BadgeGrid badges={[{ id: 'b1', code: 'a', title: 'A', description: '', emoji: '🔥', unlockedAt: '2026-04-18' }]} />);
  const badge = getByTestId('badge-a');
  expect(badge.props.style).not.toEqual(expect.objectContaining({ opacity: 0.25 }));
});

it('renders locked badge at reduced opacity', () => {
  const { getByTestId } = render(<BadgeGrid badges={[{ id: 'b1', code: 'a', title: 'A', description: '', emoji: '🔥', unlockedAt: null }]} />);
  const badge = getByTestId('badge-a');
  expect(badge.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0.25 })]));
});
```

- [ ] **badges/index.tsx** — calls `badgesService.list()` on mount, renders `<BadgeGrid>` + a "X/Y unlocked" counter.

Commit.

---

# Feature 7 — My Content stats summary

**Goal:** Replace the implicit filter-pill counts on `/my-content` with an explicit 4-card stats bar showing Published / In Review / Declined / Total Likes. This closes the gap between the current `/my-content` screen and the mockup's Moderation Dashboard header.

**Why P1 (not P0):** The screen already renders usable content lists. This is a visibility improvement — it surfaces aggregate data that creators want at a glance. Not launch-blocking but strongly requested by the mockup.

**Why not merged into P0 F2:** This pulls aggregate data (totalLikes summed across all a user's published posts) that needs a new endpoint. P0 is about closing social interaction loops; this is about creator analytics. Different mental frame.

**Files:**
- Test: `apps/api/tests/routes/users-content-summary.test.ts`
- Modify: `apps/api/src/routes/users.ts` (+1 endpoint)
- Create: `apps/mobile/components/MyContentStatsBar.tsx`
- Test: `apps/mobile/__tests__/components/MyContentStatsBar.test.tsx`
- Modify: `apps/mobile/services/userService.ts` (+`getMyContentSummary`)
- Test: append to `apps/mobile/__tests__/services/userService.test.ts`
- Modify: `apps/mobile/app/my-content/index.tsx` (render the bar)

### Task 7.1: Backend aggregation endpoint

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/routes/users-content-summary.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/users/me/content-summary', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns counts grouped by moderation status and summed likes', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs1', phone: '+912200000001', username: 'tcs1' });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'published', publishedAt: new Date(), likeCount: 5 } });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'published', publishedAt: new Date(), likeCount: 7 } });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'pending', likeCount: 0 } });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'declined', likeCount: 0 } });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/users/me/content-summary',
      headers: { Authorization: devToken('dev-test-cs1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary.published).toBe(2);
    expect(body.summary.pending).toBe(1);
    expect(body.summary.declined).toBe(1);
    expect(body.summary.totalLikes).toBe(12);
  });

  it('returns zeros for a user with no content', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs2', phone: '+912200000002', username: 'tcs2' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/users/me/content-summary',
      headers: { Authorization: devToken('dev-test-cs2') },
    });
    expect(res.json().summary).toEqual({ published: 0, pending: 0, declined: 0, totalLikes: 0 });
  });

  it('ignores other users\' content', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-cs3', phone: '+912200000003', username: 'tcs3' });
    const other = await seedUser({ firebaseUid: 'dev-test-cs4', phone: '+912200000004', username: 'tcs4' });
    await prisma.content.create({ data: { userId: other.id, type: 'post', moderationStatus: 'published', publishedAt: new Date(), likeCount: 99 } });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/users/me/content-summary',
      headers: { Authorization: devToken('dev-test-cs3') },
    });
    expect(res.json().summary.totalLikes).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** — append to `apps/api/src/routes/users.ts` (registered as `/users/me/content-summary` BEFORE the `/users/:id/...` routes so "me" isn't captured as an id):

```typescript
app.get('/users/me/content-summary', async (request) => {
  const userId = request.userId;

  const [grouped, likesAgg] = await Promise.all([
    prisma.content.groupBy({
      by: ['moderationStatus'],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.content.aggregate({
      where: { userId, moderationStatus: 'published' },
      _sum: { likeCount: true },
    }),
  ]);

  const statusMap: Record<string, number> = { published: 0, pending: 0, declined: 0 };
  for (const row of grouped) {
    statusMap[row.moderationStatus] = row._count._all;
  }

  return {
    summary: {
      published: statusMap.published,
      pending: statusMap.pending,
      declined: statusMap.declined,
      totalLikes: likesAgg._sum.likeCount ?? 0,
    },
  };
});
```

- [ ] **Step 4: Run — expect PASS. Commit.**

```bash
git add apps/api/src/routes/users.ts apps/api/tests/routes/users-content-summary.test.ts
git commit -m "feat(api): GET /users/me/content-summary"
```

### Task 7.2: Mobile `userService.getMyContentSummary`

- [ ] **Step 1: Failing test** — append to `apps/mobile/__tests__/services/userService.test.ts`:

```typescript
describe('userService.getMyContentSummary', () => {
  beforeEach(() => jest.clearAllMocks());
  it('calls GET /users/me/content-summary and returns the summary object', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { summary: { published: 5, pending: 1, declined: 0, totalLikes: 42 } },
    });
    const result = await userService.getMyContentSummary();
    expect(api.get).toHaveBeenCalledWith('/users/me/content-summary');
    expect(result.totalLikes).toBe(42);
  });
});
```

- [ ] **Step 2: Implement** — append to `apps/mobile/services/userService.ts`:

```typescript
async getMyContentSummary() {
  const res = await api.get('/users/me/content-summary');
  return res.data.summary as { published: number; pending: number; declined: number; totalLikes: number };
},
```

Run + commit.

### Task 7.3: MyContentStatsBar component

- [ ] **Step 1: Failing test**

Create `apps/mobile/__tests__/components/MyContentStatsBar.test.tsx`:

```typescript
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MyContentStatsBar } from '@/components/MyContentStatsBar';
import { userService } from '@/services/userService';

jest.mock('@/services/userService');

describe('<MyContentStatsBar />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getMyContentSummary as jest.Mock).mockResolvedValue({
      published: 23,
      pending: 2,
      declined: 1,
      totalLikes: 8420,
    });
  });

  it('renders all four metric values after fetch', async () => {
    const { findByText } = render(<MyContentStatsBar />);
    expect(await findByText('23')).toBeTruthy();
    expect(await findByText('2')).toBeTruthy();
    expect(await findByText('1')).toBeTruthy();
    expect(await findByText(/8[,.]?420/)).toBeTruthy();
  });

  it('renders zero placeholders before fetch resolves', () => {
    (userService.getMyContentSummary as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getAllByText } = render(<MyContentStatsBar />);
    expect(getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('shows labels Published / In Review / Declined / Total Likes', async () => {
    const { findByText } = render(<MyContentStatsBar />);
    expect(await findByText(/^Published$/i)).toBeTruthy();
    expect(await findByText(/^In Review$/i)).toBeTruthy();
    expect(await findByText(/^Declined$/i)).toBeTruthy();
    expect(await findByText(/^Total Likes$/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement** `apps/mobile/components/MyContentStatsBar.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { userService } from '@/services/userService';

type Summary = { published: number; pending: number; declined: number; totalLikes: number };

export function MyContentStatsBar() {
  const [s, setS] = useState<Summary>({ published: 0, pending: 0, declined: 0, totalLikes: 0 });

  useEffect(() => {
    userService.getMyContentSummary().then(setS).catch(() => {});
  }, []);

  return (
    <View style={styles.row}>
      <Stat label="Published" value={s.published} color="#10B981" />
      <Stat label="In Review" value={s.pending} color="#D97706" />
      <Stat label="Declined" value={s.declined} color="#ED4956" />
      <Stat label="Total Likes" value={s.totalLikes} color="#7C3AED" />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, padding: 12 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, color: '#737373', marginTop: 2 },
});
```

- [ ] **Step 3: Run + commit.**

### Task 7.4: Render on /my-content

- [ ] Open `apps/mobile/app/my-content/index.tsx` and add at the top of the returned content, above the filter pills:

```typescript
import { MyContentStatsBar } from '@/components/MyContentStatsBar';
// ...
<MyContentStatsBar />
```

Commit with:

```bash
git add apps/mobile/app/my-content/index.tsx
git commit -m "feat(mobile): render MyContentStatsBar on /my-content"
```

---

# Feature 8 — Delete own post + PointsLedger cascade fix

**Goal:** Users can delete their own posts. Deleting sets `deletedAt` (soft-delete); the content disappears from feeds, search, and profile grids but the PointsLedger history is preserved. This plugs a real data-integrity hole: today there is no DELETE endpoint for content, and `PointsLedger.content` has no `onDelete: Cascade`, so if we ever add hard-delete the ledger would orphan.

**Why P1:** Standard user expectation + prevents a potential point-manipulation exploit (create post → earn points → delete post → repeat). Data integrity matters once rewards are real (P1).

**Why soft-delete, not hard:** Two reasons.
1. Points-manipulation defense — we want to keep the ledger entries even after the post is gone, so re-creating the same content doesn't trigger `create_content` bonuses again.
2. Moderation trail — support can investigate abuse reports even if the author deleted.

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (+`deletedAt` on Content + `onDelete: Cascade` on PointsLedger.content)
- Migration: `<ts>_p1_soft_delete_content/` (auto)
- Modify: `apps/api/src/routes/content.ts` (+DELETE handler)
- Modify: `apps/api/src/routes/feed.ts`, `explore.ts`, `reels.ts`, `users.ts` (filter `deletedAt: null`)
- Test: `apps/api/tests/routes/content-delete.test.ts`
- Modify: `apps/mobile/services/contentService.ts` (+`delete`)
- Test: append to `apps/mobile/__tests__/services/contentService.test.ts`
- Modify: `apps/mobile/components/PostCard.tsx` (wire `onDelete` from `PostActionSheet` to call the service and hide the card)

### Task 8.1: Schema changes

- [ ] **Step 1: Edit `apps/api/prisma/schema.prisma`**

Find the `Content` model. Add:

```prisma
  deletedAt        DateTime?        @map("deleted_at")
```

Add index for efficient feed filtering:

```prisma
  @@index([deletedAt])
```

Find the `PointsLedger` model. Change its `content` relation to cascade:

```prisma
  content Content? @relation(fields: [contentId], references: [id], onDelete: Cascade)
```

- [ ] **Step 2: Migrate**

```bash
cd apps/api && npx prisma migrate dev --name p1_soft_delete_content
```

- [ ] **Step 3: Commit schema**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/*p1_soft_delete_content*
git commit -m "feat(api): soft-delete on Content + cascade on PointsLedger"
```

### Task 8.2: DELETE /content/:id endpoint

- [ ] **Step 1: Failing test**

Create `apps/api/tests/routes/content-delete.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('DELETE /api/v1/content/:id', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('soft-deletes the author\'s own content', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del1', phone: '+912300000001', username: 'tdel1' });
    const c = await seedContent(u.id);

    const res = await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del1') },
    });

    expect(res.statusCode).toBe(200);
    const after = await prisma.content.findUnique({ where: { id: c.id } });
    expect(after).not.toBeNull();
    expect(after?.deletedAt).not.toBeNull();
  });

  it('returns 403 when trying to delete someone else\'s content', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-del2a', phone: '+912300000002', username: 'tdel2a' });
    const other = await seedUser({ firebaseUid: 'dev-test-del2b', phone: '+912300000003', username: 'tdel2b' });
    const c = await seedContent(author.id);

    const res = await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del2b') },
    });

    expect(res.statusCode).toBe(403);
    const after = await prisma.content.findUnique({ where: { id: c.id } });
    expect(after?.deletedAt).toBeNull();
  });

  it('returns 404 for content that does not exist', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del3', phone: '+912300000004', username: 'tdel3' });
    const res = await getTestApp().inject({
      method: 'DELETE',
      url: '/api/v1/content/00000000-0000-0000-0000-000000000000',
      headers: { Authorization: devToken('dev-test-del3') },
    });
    expect(res.statusCode).toBe(404);
  });

  it('preserves PointsLedger entries after soft-delete', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del4', phone: '+912300000005', username: 'tdel4' });
    const c = await seedContent(u.id);
    await prisma.pointsLedger.create({
      data: {
        userId: u.id,
        actionType: 'create_content',
        contentId: c.id,
        points: 30,
        multiplierApplied: 1.0 as any,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
    });

    await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del4') },
    });

    const ledgerCount = await prisma.pointsLedger.count({ where: { contentId: c.id } });
    expect(ledgerCount).toBe(1);
  });

  it('deleted content does not appear in the feed', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del5', phone: '+912300000006', username: 'tdel5' });
    const c = await seedContent(u.id);
    await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del5') },
    });
    const feed = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed',
      headers: { Authorization: devToken('dev-test-del5') },
    });
    const ids = (feed.json().data ?? []).map((p: any) => p.id);
    expect(ids).not.toContain(c.id);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** — append to `apps/api/src/routes/content.ts`:

```typescript
app.delete('/content/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) throw Errors.notFound('Content');
  if (content.userId !== request.userId) throw Errors.forbidden();
  if (content.deletedAt) return reply.status(200).send({ success: true });

  await prisma.content.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return reply.status(200).send({ success: true });
});
```

- [ ] **Step 4: Update `GET /content/:id` to return 404 for soft-deleted content (non-author view)**

In the existing handler at `apps/api/src/routes/content.ts` (the `app.get('/content/:id', ...)` block), after loading `content`, add right after the moderation-status check:

```typescript
if (content.deletedAt && content.userId !== currentUserId) {
  throw Errors.notFound('Content');
}
```

- [ ] **Step 5: Filter `deletedAt: null` in feed/explore/reels/user-content routes**

In each of `apps/api/src/routes/feed.ts`, `explore.ts`, `reels.ts`, and the `/users/:id/content` handler in `users.ts`, every Prisma `where:` clause that currently filters `moderationStatus: 'published'` needs to also filter `deletedAt: null`. Example:

```typescript
where: { moderationStatus: 'published', deletedAt: null, ... }
```

Apply to each query individually. Run the full test suite to catch any that slip through.

- [ ] **Step 6: Run — expect PASS (all 5 deletion tests)**

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- content-delete
# And the full suite to catch feed regressions:
cd apps/api && ALLOW_DEV_TOKENS=true npm test
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes apps/api/tests/routes/content-delete.test.ts
git commit -m "feat(api): soft-delete content with forbidden/not-found guards"
```

### Task 8.3: Mobile delete wiring

- [ ] **Step 1: Failing test** — append to `apps/mobile/__tests__/services/contentService.test.ts`:

```typescript
describe('contentService.delete', () => {
  beforeEach(() => jest.clearAllMocks());
  it('calls DELETE /content/:id', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
    await contentService.delete('post-1');
    expect(api.delete).toHaveBeenCalledWith('/content/post-1');
  });
});
```

- [ ] **Step 2: Implement** — append to `apps/mobile/services/contentService.ts`:

```typescript
async delete(contentId: string) {
  await api.delete(`/content/${contentId}`);
},
```

Run + commit.

- [ ] **Step 3: Wire into PostCard via the PostActionSheet's onDelete callback**

Open `apps/mobile/components/PostCard.tsx` (the one modified in P0 F7). Replace the `onDelete` placeholder with a real handler:

```typescript
import { Alert } from 'react-native';
import { contentService } from '@/services/contentService';

// Inside the component:
async function handleDelete() {
  Alert.alert(
    'Delete this post?',
    'This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await contentService.delete(post.id);
            onDeleted?.(post.id);
          } catch {
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ],
  );
}

// Pass handleDelete to PostActionSheet's onDelete prop
<PostActionSheet ... onDelete={handleDelete} />
```

Add an optional `onDeleted?: (id: string) => void` prop to PostCard so feed/explore/profile screens can remove the card from their lists when a delete succeeds. Wire it on the home feed: when onDeleted fires, remove from the local posts array.

- [ ] **Step 4: Manual smoke test**

Launch app. Open your own post. Tap `•••` → Delete → Confirm. Post disappears. Pull to refresh: confirmed gone. Check wallet: the points earned from creating the post are still in the ledger (verify via DB or wallet history).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/PostCard.tsx apps/mobile/services/contentService.ts apps/mobile/__tests__/services/contentService.test.ts
git commit -m "feat(mobile): wire delete own post via PostActionSheet"
```

---

## P1 completion criteria

- [ ] `cd apps/api && ALLOW_DEV_TOKENS=true npm test` — all tests pass
- [ ] `cd apps/mobile && npm test` — all tests pass
- [ ] Manual: visit `/wallet` — balance, tier progress, quick-action buttons all render
- [ ] Manual: tap Gift Cards → navigate to Redeem, filter applied
- [ ] Manual: claim an offer → alert shows claim code → My Rewards shows new reward with QR
- [ ] Manual: `/quests/weekly` returns at least one quest; leaderboard screen renders card
- [ ] Manual: `/spin` on fresh day → wheel animates → points added → second spin returns 409
- [ ] Manual: `/badges` shows a mix of locked/unlocked badges; hitting a threshold unlocks one
- [ ] Manual: visit `/my-content` — four stat cards render at top with correct counts
- [ ] Manual: own post → `•••` → Delete → confirm → post vanishes; PointsLedger history still shows the creation bonus
- [ ] Manual: try to delete someone else's post (by hitting the endpoint with Postman using a different token) → 403

## What could go wrong

- **Claiming offers in parallel double-spends** — fixed by the `$transaction` wrapping the balance decrement.
- **Spin races across servers** — the `@@unique([userId, spinDate])` on `SpinResult` means the second spin's INSERT fails with a constraint violation; the code catches that as a 409.
- **Quests don't update after an action** — the endpoint derives progress from `PointsLedger` every call. Slow at scale (>100K ledger rows per user) but fine for MVP; add a materialized counter later.
- **Points expire after P1 ships but before expiry cron runs** — today there's no cron that flips `expired=true`. Write one as part of P1 cleanup or accept the drift for MVP.
- **QR library on Android** — `react-native-svg` needs a rebuild; `expo prebuild` not required for Expo SDK 54 but verify on Android device before shipping.
- **Stats bar flashes "0s" on every mount** — move the fetch into a store (Zustand) or `react-query` with caching if this annoys users; acceptable for MVP.
- **Soft-deleted posts still show in a user's own profile grid** — that's intentional while author views their own content, but make sure third-party profile requests include the `deletedAt: null` filter. Any feed route that forgets the filter will leak the post.
- **Cascade delete fires accidentally** — `PointsLedger.content` cascading means if you ever HARD-delete content (bypass the endpoint in a script), ledger entries go with it. Soft-delete guards against this in app code, but a careless `prisma.content.delete()` call in a script could still nuke ledger rows. Add a code-review rule: search for `content.delete(` in PRs.

**Why does this matter?** P0 made the app feel like an app. P1 makes it feel like *your* app — the one where earning points actually leads somewhere. The loyalty program is the product. If this loop isn't closed, nothing else you build matters.
