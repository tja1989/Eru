# GapFix P3 — Polish & Completeness

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. TDD rules identical to P0 — see [P0 TDD Protocol](./GapFixP0.md#tdd-protocol).

**Goal:** Fill in the long tail of mockup features that aren't product-critical but make the app feel complete — proper onboarding education, dislike/save interactions, poll & thread creation, location tagging, profile highlights, richer settings, creator score display, and WhatsApp OTP.

**Architecture:** Mostly additive. A few new DB columns (e.g. `dislikeCount` on `Content`, `creatorScore` aggregate on `User`), small new endpoints, many small UI components. No new domain models. WhatsApp OTP adds a third-party integration (Gupshup or Twilio).

**Tech Stack:** Same as P0–P2. New: `expo-location` for location picker; `react-native-gesture-handler` Swipeable for highlights; Twilio or Gupshup SDK for WhatsApp.

---

## The home-renovation analogy

You've built the house (P0 kitchen + dining room), installed the plumbing and electrical (P1 rewards), added bedrooms and the garden (P2 social). P3 is **the details** — painting the trim, hanging curtains, labeling the light switches, installing the doorbell camera. None of it is load-bearing. All of it is what makes visitors say "you live *here*?" instead of "nice place."

Ship P3 only once P0+P1+P2 are green. Beginner trap: polishing before the core works. Don't.

---

## Feature inventory

| # | Feature | Backend work? | Mobile work | Priority within P3 |
|---|---------|---------------|-------------|-------|
| 1 | Welcome / Landing / Tutorial | No | 3 screens | P3a (acquisition polish) |
| 2 | Dislike button | +1 field on Content, +1 interaction type | Toggle on post/reel | P3a |
| 3 | Save/bookmark UI | Wire existing InteractionType=save endpoints | Icon + Saved tab | P3a |
| 4 | Poll creation UI | +1 model: PollOption | Form + voting UI | P3b |
| 5 | Thread creation | Use existing Content type=thread | Multi-part composer | P3b |
| 6 | Location tag | No (field exists) | Location picker | P3b |
| 7 | Profile Highlights | +1 model: Highlight | Highlights carousel | P3c |
| 8 | Profile Tagged tab | +1 column: `taggedUserIds` on Content | Tab + grid | P3c |
| 9 | Edit Profile screen | Reuse /users/me/settings PUT | Avatar upload + form | P3c |
| 10 | Settings extras | Schema has fields — UI missing | DOB picker, Gender radio, Secondary pincodes, Email digests, Linked accounts section, Delete account | P3c |
| 11 | Creator Score | +1 derived field | Display on profile + leaderboard | P3b |
| 12 | WhatsApp OTP | New auth provider | Toggle on login | P3a |

Sub-groupings:
- **P3a** — acquisition + basic interaction gaps (onboarding, dislike, save, WhatsApp)
- **P3b** — content creation richness (poll, thread, location, creator score display)
- **P3c** — profile + settings depth (highlights, tagged, edit profile, settings extras)

---

## Prerequisites

- [ ] P0 + P1 + P2 complete and green.
- [ ] Mobile test infra working.
- [ ] Twilio or Gupshup account for WhatsApp OTP (F12 only).

---

## TDD Protocol

Identical to P0. Don't skip.

---

# Feature 1 — Welcome / Landing / Tutorial

**Goal:** New users see a 4-step introduction before the OTP screen: value props, personalization (interests/language), tutorial of the 25 earning actions, welcome bonus reveal.

**Why P3:** These are high-polish onboarding screens. They improve conversion from install to activation but aren't required for the product to function. Many indie apps ship without them at MVP.

**Files:**
- Create: `apps/mobile/app/(auth)/welcome.tsx`
- Create: `apps/mobile/app/(auth)/personalize.tsx`
- Create: `apps/mobile/app/(auth)/tutorial.tsx`
- Create: 3 test files, one per screen
- Modify: `apps/mobile/app/_layout.tsx` — new users start at `/welcome`, returning users skip to `/login`
- Modify: `apps/mobile/stores/authStore.ts` — add `hasCompletedOnboarding` flag persisted in AsyncStorage

### Task 1.1: Welcome screen

- [ ] **Step 1: Failing test**

```typescript
// apps/mobile/__tests__/screens/welcome.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Welcome from '@/app/(auth)/welcome';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('<Welcome />', () => {
  it('renders the brand name and tagline', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/^Eru$/)).toBeTruthy();
    expect(getByText(/your attention has value/i)).toBeTruthy();
  });

  it('shows 3 value prop cards (Earn, Redeem, Create)', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/earn/i)).toBeTruthy();
    expect(getByText(/redeem/i)).toBeTruthy();
    expect(getByText(/create/i)).toBeTruthy();
  });

  it('"Get Started" navigates to /otp', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, replace: jest.fn() });
    const { getByText } = render(<Welcome />);
    fireEvent.press(getByText(/get started/i));
    expect(push).toHaveBeenCalledWith('/(auth)/login');
  });
});
```

- [ ] **Step 2: Implement `apps/mobile/app/(auth)/welcome.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const VALUE_PROPS = [
  { emoji: '🪙', title: 'Earn', body: 'Get points for every post you read, watch, or engage with.' },
  { emoji: '🎁', title: 'Redeem', body: 'Spend points on local offers, gift cards, recharges, and more.' },
  { emoji: '✍️', title: 'Create', body: 'Post content, tag businesses, earn commission on sponsored boosts.' },
];

export default function Welcome() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.brand}>Eru</Text>
      <Text style={styles.tag}>Your attention has value</Text>

      {VALUE_PROPS.map((v) => (
        <View key={v.title} style={styles.card}>
          <Text style={styles.emoji}>{v.emoji}</Text>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{v.title}</Text>
            <Text style={styles.cardBodyText}>{v.body}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.primary} onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.primaryText}>Get Started</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.secondaryText}>I already have an account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  brand: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 52, color: '#E8792B', textAlign: 'center' },
  tag: { color: '#737373', textAlign: 'center', marginBottom: 32 },
  card: { flexDirection: 'row', padding: 14, backgroundColor: '#FAFAFA', borderRadius: 12, marginBottom: 10 },
  emoji: { fontSize: 28, marginRight: 12 },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: '700', fontSize: 16, color: '#262626' },
  cardBodyText: { color: '#737373', marginTop: 2 },
  primary: { backgroundColor: '#E8792B', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryText: { color: '#0095F6', textAlign: 'center', marginTop: 12 },
});
```

- [ ] **Step 3: Run + commit.**

### Task 1.2: Personalize + Tutorial screens

Ship two more screens following the same TDD pattern:

**personalize.tsx:**
- Location auto-detect (expo-location) with pincode derivation
- Interest pills (16 options, tap to toggle, shows "+50 pts for 5 selected")
- Language pills

Tests:
```typescript
it('requires at least 3 interests to enable Continue', () => { ... });
it('shows "+50 pts" when exactly 5 selected', () => { ... });
```

**tutorial.tsx:**
- 5 collapsible earning-category cards
- Welcome bonus banner "+250 pts"
- "Start Earning 🚀" button → saves `hasCompletedOnboarding=true` and routes to /(tabs)

Commit each.

### Task 1.3: Onboarding gate in root layout

- [ ] Modify `apps/mobile/app/_layout.tsx`: on app boot, if `!hasCompletedOnboarding && !isAuthenticated`, redirect to `/(auth)/welcome`. Otherwise follow existing gate.

Commit.

---

# Feature 2 — Dislike button

**Goal:** Users can dislike a post/reel. Affects creator score. UI shows `👎` with tooltip "Not for me — helps us improve your feed and affects creator score."

**Schema:** `InteractionType` currently has `like | save | share`. Add `dislike`.

**Files:**
- Migration: add `dislike` to `InteractionType` enum + `dislikeCount` to `Content`.
- Backend: `POST /posts/:id/dislike`, `DELETE /posts/:id/undislike` in `content.ts`.
- Mobile: add dislike button to `PostCard.tsx` and reel overlay; wire to contentService.

### Task 2.1: Schema + migration

- [ ] **Step 1: Modify `schema.prisma`**

```prisma
enum InteractionType {
  like
  save
  share
  dislike    // NEW
}

model Content {
  // ... existing
  dislikeCount Int @default(0) @map("dislike_count")
}
```

- [ ] **Step 2: Migrate**

```bash
cd apps/api && npx prisma migrate dev --name p3_dislike
```

- [ ] **Step 3: Failing backend test**

```typescript
// apps/api/tests/routes/dislike.test.ts
describe('POST /api/v1/posts/:id/dislike', () => {
  beforeEach(cleanupTestData);

  it('creates a dislike interaction and increments dislikeCount', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-dis1', phone: '+912000000001', username: 'tdis1' });
    const content = await seedContent(u.id);

    const res = await getTestApp().inject({
      method: 'POST', url: `/api/v1/posts/${content.id}/dislike`,
      headers: { Authorization: devToken('dev-test-dis1') },
    });
    expect(res.statusCode).toBe(201);
    const after = await prisma.content.findUnique({ where: { id: content.id } });
    expect(after?.dislikeCount).toBe(1);
  });

  it('DELETE /posts/:id/undislike decrements', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-dis2', phone: '+912000000002', username: 'tdis2' });
    const content = await seedContent(u.id);
    await getTestApp().inject({
      method: 'POST', url: `/api/v1/posts/${content.id}/dislike`,
      headers: { Authorization: devToken('dev-test-dis2') },
    });
    const res = await getTestApp().inject({
      method: 'DELETE', url: `/api/v1/posts/${content.id}/undislike`,
      headers: { Authorization: devToken('dev-test-dis2') },
    });
    expect(res.statusCode).toBe(200);
    const after = await prisma.content.findUnique({ where: { id: content.id } });
    expect(after?.dislikeCount).toBe(0);
  });
});
```

- [ ] **Step 4: Implement in `routes/content.ts`**

Copy the like/unlike handlers, swap `type: 'like'` → `type: 'dislike'` and `likeCount` → `dislikeCount`.

- [ ] **Step 5: Run + commit.**

### Task 2.2: Mobile dislike button

- [ ] **Step 1: Extend contentService with dislike/undislike.**
- [ ] **Step 2: Add button in PostCard + reel overlay with touchable + accessibilityLabel "Not for me".**
- [ ] **Step 3: Test: tapping flips state optimistically, rollback on error.**

Commit.

---

# Feature 3 — Save / Bookmark

**Goal:** Save icon on posts + reels. Saved items appear in the Saved tab on profile. Backend already supports `InteractionType=save`; endpoint + wiring missing.

**Files:**
- Backend: add `POST /posts/:id/save`, `DELETE /posts/:id/unsave` to content.ts (clone of like pattern).
- Mobile: contentService `save`/`unsave`; save icon button; already-present Saved tab on profile now populates from backend.

### Task 3.1: Backend save endpoints

- [ ] Write failing test mirroring like:

```typescript
describe('POST /api/v1/posts/:id/save', () => {
  it('creates a save interaction', async () => { /* ... */ });
  it('does not duplicate', async () => { /* ... */ });
  it('DELETE /posts/:id/unsave removes', async () => { /* ... */ });
});
```

- [ ] Implement handlers in `routes/content.ts`. Commit.

### Task 3.2: Mobile save icon + Saved tab

- [ ] `contentService.save(id)` / `.unsave(id)` — tested.
- [ ] Bookmark icon button in `PostCard.tsx` and reel overlay — tested.
- [ ] Verify profile `Saved` tab loads correctly (`GET /users/:id/content?tab=saved`). Already exists in API — verify UI renders after save.

Commit.

---

# Feature 4 — Poll creation UI + voting

**Goal:** In Create, selecting Poll type shows a dynamic form: question + 2–4 options + 24-hour duration. On home feed, polls render with voteable bars.

**Schema:** Add `PollOption` model.

### Task 4.1: Schema

- [ ] Add to `schema.prisma`:

```prisma
model PollOption {
  id        String   @id @default(uuid())
  contentId String   @map("content_id")
  text      String
  sortOrder Int      @default(0) @map("sort_order")
  voteCount Int      @default(0) @map("vote_count")

  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  votes   PollVote[]

  @@index([contentId])
  @@map("poll_options")
}

model PollVote {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  pollOptionId String   @map("poll_option_id")
  createdAt    DateTime @default(now()) @map("created_at")

  user       User       @relation(fields: [userId], references: [id])
  pollOption PollOption @relation(fields: [pollOptionId], references: [id])

  @@unique([userId, pollOptionId])
  @@map("poll_votes")
}
```

Add relations to `User` (`pollVotes PollVote[]`) and `Content` (`pollOptions PollOption[]`).

- [ ] Migrate: `prisma migrate dev --name p3_polls`

### Task 4.2: Backend endpoints

- [ ] `POST /content/create` — when `type=poll`, accept `pollOptions: string[]` in body and create rows.
- [ ] `POST /polls/:contentId/vote` — body `{ pollOptionId }`. Creates `PollVote`, increments `voteCount` in a transaction; if user already voted, update instead.

Tests:

```typescript
it('creating a poll content persists its options', async () => { ... });
it('voting on a poll increments voteCount', async () => { ... });
it('a user can vote only once per poll; voting again reassigns the vote', async () => { ... });
```

Implement + commit.

### Task 4.3: Mobile Poll form + voting UI

- **PollForm.tsx** — question input + dynamic option rows (default 2; "+" up to 4; "−" down to 2). Tests: add/remove options, share disabled until question + 2+ options.
- **PollCard.tsx** — renders question + animated bars with percentage. Tapping an option calls `pollService.vote(optionId)`. Tests: renders bars, percentage reflects voteCount/totalVotes, tapping disables future votes.

Wire into existing `Create` screen (when `type=poll` selected) and `PostCard`.

Commit.

---

# Feature 5 — Thread creation UI

**Goal:** Multi-part text posts (like X/Twitter threads). Each "part" becomes a Content row with a `threadParentId`.

**Schema:** Add `threadParentId String?` + `threadPosition Int?` to `Content`.

### Task 5.1: Schema + migration

- [ ] Add the two columns to `Content` in schema.prisma and migrate (`p3_threads`).

### Task 5.2: Backend

- [ ] Extend `createContentSchema` to accept `threadParts: string[]` when `type=thread`. Create N content rows inside one transaction, linked via `threadParentId`.
- [ ] `GET /content/:id/thread` — returns all parts in order.

### Task 5.3: Mobile

- **ThreadComposer.tsx** — list of part editors; "+" adds a part; "−" removes. Tests: adds/removes parts, share disabled if any part is empty.
- **ThreadView.tsx** — renders all parts as connected bubbles. Test: renders N parts in correct order.

Commit.

---

# Feature 6 — Location tag in Create (with autocomplete)

**Goal:** In the create screen, the 📍 Location button opens a picker with:
- An autocomplete input — type "Koch" → see Ernakulam-area pincodes pop up with name + district + state.
- A "📍 Use my current location" button — calls `expo-location` to get GPS → reverse-geocodes to the nearest pincode via the same backend endpoint.
- Picking a result sets the post's `locationPincode` (column already exists on `Content`).

**Why this upgrade over the original "blind 6-digit entry":** Users don't memorise pincodes. Without autocomplete the feature is unusable.

**Approach:** Ship a **static pincode JSON dataset** (India Post publishes ~154K pincodes under the Open Data License). Query server-side by substring match on area/district/state. No third-party APIs, no billing, ~1 MB binary on the deployed backend. Upgrade to a real geocoding API later if scale demands.

**Files:**
- Create: `apps/api/src/data/pincodes.json` (via download script)
- Create: `apps/api/src/scripts/download-pincodes.ts`
- Create: `apps/api/src/routes/locations.ts`
- Create: `apps/api/src/services/locationsService.ts`
- Create: `apps/api/tests/services/locationsService.test.ts`
- Create: `apps/api/tests/routes/locations.test.ts`
- Modify: `apps/api/src/app.ts` (register locationRoutes)
- Modify: `apps/api/.gitignore` (optional: ignore the generated JSON if > 5 MB)
- Create: `apps/mobile/services/locationsService.ts`
- Create: `apps/mobile/__tests__/services/locationsService.test.ts`
- Create: `apps/mobile/components/LocationPicker.tsx`
- Create: `apps/mobile/__tests__/components/LocationPicker.test.tsx`
- Modify: `apps/mobile/app/(tabs)/create.tsx` (wire the 📍 button)

### Task 6.1: Backend — pincode dataset + autocomplete endpoint

- [ ] **Step 1: Download script**

Create `apps/api/src/scripts/download-pincodes.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// India Post publishes a CSV at https://data.gov.in/catalog/all-india-pincode-directory
// The exact URL changes occasionally; download manually and drop the CSV at src/data/raw-pincodes.csv,
// then run this script. It parses and writes a lean JSON for the locations service to index.

type RawRow = Record<string, string>;

async function main() {
  const raw = await fs.readFile(path.join(__dirname, '..', 'data', 'raw-pincodes.csv'), 'utf8');
  const [headerLine, ...lines] = raw.split('\n');
  const headers = headerLine.split(',').map((h) => h.trim());

  const records = lines
    .filter((l) => l.trim())
    .map((line) => {
      const cols = line.split(',');
      const row: RawRow = {};
      headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
      return row;
    })
    .map((r) => ({
      pincode: r['Pincode'],
      area: r['OfficeName'] ?? '',
      district: r['District'] ?? '',
      state: r['StateName'] ?? '',
    }))
    .filter((r) => r.pincode && /^\d{6}$/.test(r.pincode));

  const out = path.join(__dirname, '..', 'data', 'pincodes.json');
  await fs.writeFile(out, JSON.stringify(records));
  console.log(`Wrote ${records.length} pincodes to ${out}`);
}

main();
```

Add `"db:pincodes": "tsx src/scripts/download-pincodes.ts"` to `apps/api/package.json` scripts.

Manual step: download the India Post CSV (the human developer does this once), place at `apps/api/src/data/raw-pincodes.csv`, then `npm run db:pincodes`. Commit `pincodes.json` OR add to `.gitignore` and re-generate in CI — your call based on repo-size comfort.

- [ ] **Step 2: locationsService (failing test)**

Create `apps/api/tests/services/locationsService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { locationsService } from '../../src/services/locationsService.js';

describe('locationsService.search', () => {
  it('returns an empty array for a very short query', () => {
    expect(locationsService.search('k')).toEqual([]);
  });

  it('finds pincodes whose area contains the query string (case-insensitive)', () => {
    const results = locationsService.search('ernakulam');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => /ernakulam/i.test(`${r.area} ${r.district}`))).toBe(true);
  });

  it('caps results at 10', () => {
    const results = locationsService.search('Bangalore');
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('supports exact pincode lookup', () => {
    const results = locationsService.search('682016');
    expect(results.some((r) => r.pincode === '682016')).toBe(true);
  });
});

describe('locationsService.byPincode', () => {
  it('returns the matching record', () => {
    const row = locationsService.byPincode('682016');
    expect(row).not.toBeNull();
    expect(row?.pincode).toBe('682016');
  });

  it('returns null for unknown pincodes', () => {
    expect(locationsService.byPincode('000000')).toBeNull();
  });
});
```

- [ ] **Step 3: locationsService implementation**

Create `apps/api/src/services/locationsService.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Pincode = { pincode: string; area: string; district: string; state: string };

// Lazy-load on first access; ~1-2 MB in memory, acceptable for an India-only MVP.
let data: Pincode[] | null = null;
let byPincodeMap: Map<string, Pincode> | null = null;

function ensureLoaded() {
  if (data) return;
  const jsonPath = path.join(__dirname, '..', 'data', 'pincodes.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn('[locationsService] pincodes.json missing — run npm run db:pincodes');
    data = [];
    byPincodeMap = new Map();
    return;
  }
  data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Pincode[];
  byPincodeMap = new Map(data.map((r) => [r.pincode, r]));
}

export const locationsService = {
  search(query: string): Pincode[] {
    ensureLoaded();
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    // Exact pincode match first
    if (/^\d{6}$/.test(q)) {
      const exact = byPincodeMap!.get(q);
      return exact ? [exact] : [];
    }

    // Substring match on area + district, capped at 10
    const results: Pincode[] = [];
    for (const row of data) {
      if (
        row.area.toLowerCase().includes(q) ||
        row.district.toLowerCase().includes(q)
      ) {
        results.push(row);
        if (results.length === 10) break;
      }
    }
    return results;
  },

  byPincode(pincode: string): Pincode | null {
    ensureLoaded();
    return byPincodeMap?.get(pincode) ?? null;
  },
};
```

- [ ] **Step 4: Run service tests — expect PASS**

```bash
cd apps/api && npm test -- locationsService
```

- [ ] **Step 5: Route + test**

Create `apps/api/tests/routes/locations.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';

describe('GET /api/v1/locations', () => {
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns matches for a text query', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-loc1', phone: '+912400000001', username: 'tloc1' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/locations?q=ernakulam',
      headers: { Authorization: devToken('dev-test-loc1') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.results.length).toBeGreaterThan(0);
  });

  it('returns 400 for missing query', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-loc2', phone: '+912400000002', username: 'tloc2' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/locations',
      headers: { Authorization: devToken('dev-test-loc2') },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

Create `apps/api/src/routes/locations.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { locationsService } from '../services/locationsService.js';
import { Errors } from '../utils/errors.js';
import { z } from 'zod';

export async function locationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  const querySchema = z.object({ q: z.string().min(2).max(50) });

  app.get('/locations', async (request) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) throw Errors.badRequest('Missing or invalid query');
    const results = locationsService.search(parsed.data.q);
    return { results };
  });
}
```

Register in `apps/api/src/app.ts`:

```typescript
import { locationRoutes } from './routes/locations.js';
// ...
app.register(locationRoutes, { prefix: '/api/v1' });
```

Run + commit.

### Task 6.2: Mobile locationsService

- [ ] **Step 1: Failing test**

Create `apps/mobile/__tests__/services/locationsService.test.ts`:

```typescript
import { locationsService } from '@/services/locationsService';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('locationsService.search', () => {
  it('calls GET /locations with the query', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { results: [] } });
    await locationsService.search('koch');
    expect(api.get).toHaveBeenCalledWith('/locations', { params: { q: 'koch' } });
  });
});
```

- [ ] **Step 2: Implement `apps/mobile/services/locationsService.ts`**

```typescript
import { api } from '@/services/api';

export type PincodeResult = { pincode: string; area: string; district: string; state: string };

export const locationsService = {
  async search(q: string) {
    const res = await api.get('/locations', { params: { q } });
    return res.data.results as PincodeResult[];
  },
};
```

Commit.

### Task 6.3: LocationPicker component

- [ ] **Step 1: Failing test**

Create `apps/mobile/__tests__/components/LocationPicker.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LocationPicker } from '@/components/LocationPicker';
import { locationsService } from '@/services/locationsService';

jest.mock('@/services/locationsService');
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 9.98, longitude: 76.28 } })),
  reverseGeocodeAsync: jest.fn(async () => [{ postalCode: '682016' }]),
}));

describe('<LocationPicker />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (locationsService.search as jest.Mock).mockResolvedValue([
      { pincode: '682016', area: 'Ernakulam Central', district: 'Ernakulam', state: 'Kerala' },
      { pincode: '682017', area: 'Kochi', district: 'Ernakulam', state: 'Kerala' },
    ]);
  });

  it('renders a search input', () => {
    const { getByPlaceholderText } = render(<LocationPicker onSelect={jest.fn()} />);
    expect(getByPlaceholderText(/search by area/i)).toBeTruthy();
  });

  it('shows results after typing 2+ characters', async () => {
    const { getByPlaceholderText, findByText } = render(<LocationPicker onSelect={jest.fn()} />);
    fireEvent.changeText(getByPlaceholderText(/search by area/i), 'ko');
    expect(await findByText(/ernakulam central/i)).toBeTruthy();
    expect(await findByText(/682016/)).toBeTruthy();
  });

  it('tapping a result calls onSelect with the pincode', async () => {
    const onSelect = jest.fn();
    const { getByPlaceholderText, findByText } = render(<LocationPicker onSelect={onSelect} />);
    fireEvent.changeText(getByPlaceholderText(/search by area/i), 'ko');
    const row = await findByText(/ernakulam central/i);
    fireEvent.press(row);
    expect(onSelect).toHaveBeenCalledWith('682016', expect.objectContaining({ area: 'Ernakulam Central' }));
  });

  it('"Use my current location" fetches GPS → pincode', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(<LocationPicker onSelect={onSelect} />);
    fireEvent.press(getByText(/use my current location/i));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('682016', expect.anything());
    });
  });

  it('shows an error if GPS permission is denied', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { getByText, findByText } = render(<LocationPicker onSelect={jest.fn()} />);
    fireEvent.press(getByText(/use my current location/i));
    expect(await findByText(/location permission/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Install `expo-location`**

```bash
cd apps/mobile && npm install expo-location@~18.0.0
```

- [ ] **Step 3: Implement `apps/mobile/components/LocationPicker.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { locationsService, PincodeResult } from '@/services/locationsService';

type Props = { onSelect: (pincode: string, meta?: PincodeResult) => void };

export function LocationPicker({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PincodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const rows = await locationsService.search(q);
        setResults(rows);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function useGps() {
    setGpsBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Location permission denied. Enable in Settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const [first] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (!first?.postalCode || !/^\d{6}$/.test(first.postalCode)) {
        setError('Could not detect your pincode. Please search instead.');
        return;
      }
      onSelect(first.postalCode);
    } catch {
      setError('Could not get your location. Please search instead.');
    } finally {
      setGpsBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by area, district, or 6-digit pincode"
        placeholderTextColor="#8E8E8E"
        style={styles.input}
      />

      <TouchableOpacity onPress={useGps} style={styles.gps} disabled={gpsBusy}>
        {gpsBusy ? <ActivityIndicator size="small" /> : <Text style={styles.gpsText}>📍 Use my current location</Text>}
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}

      <FlatList
        data={results}
        keyExtractor={(r) => r.pincode + r.area}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item.pincode, item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.area}</Text>
              <Text style={styles.rowSub}>{item.district}, {item.state}</Text>
            </View>
            <Text style={styles.rowPin}>{item.pincode}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 12, backgroundColor: '#fff' },
  input: {
    borderWidth: 1, borderColor: '#DBDBDB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#262626',
  },
  gps: { paddingVertical: 12, alignItems: 'center' },
  gpsText: { color: '#0095F6', fontWeight: '700' },
  error: { color: '#ED4956', paddingVertical: 8 },
  row: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#FAFAFA' },
  rowTitle: { fontWeight: '700', color: '#262626' },
  rowSub: { color: '#737373', fontSize: 12, marginTop: 2 },
  rowPin: { color: '#0095F6', fontWeight: '700' },
});
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Wire into Create screen**

Open `apps/mobile/app/(tabs)/create.tsx`. Find the 📍 Location button in the bottom toolbar. Currently it's a no-op. Replace with a modal:

```typescript
import { Modal, Pressable } from 'react-native';
import { LocationPicker } from '@/components/LocationPicker';
// ...
const [showLoc, setShowLoc] = useState(false);
const [selectedPincode, setSelectedPincode] = useState<string | null>(null);

// Button:
<TouchableOpacity onPress={() => setShowLoc(true)}>
  <Text>📍 {selectedPincode ?? 'Location'}</Text>
</TouchableOpacity>

// Modal:
<Modal visible={showLoc} animationType="slide" onRequestClose={() => setShowLoc(false)}>
  <LocationPicker onSelect={(pincode) => { setSelectedPincode(pincode); setShowLoc(false); }} />
</Modal>

// When creating content, pass selectedPincode as locationPincode to contentService.create.
```

- [ ] **Step 6: Manual smoke test**

- Open Create. Tap 📍 → picker opens. Type "Koch" → see results. Select one → chip shows pincode.
- Tap 📍 again → Use my current location → GPS prompt → after allow, pincode auto-populates.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/components/LocationPicker.tsx apps/mobile/services/locationsService.ts apps/mobile/app/\(tabs\)/create.tsx apps/mobile/package.json apps/mobile/__tests__
git commit -m "feat(mobile): LocationPicker with autocomplete + GPS in Create"
```

---

# Feature 7 — Profile Highlights carousel

**Goal:** A horizontally-scrolling row of custom "highlight reels" on the profile screen. User creates a highlight by picking a title, emoji, and existing content.

**Schema:**

```prisma
model Highlight {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  title     String
  emoji     String
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  user    User              @relation(fields: [userId], references: [id])
  items   HighlightItem[]

  @@index([userId, sortOrder])
  @@map("highlights")
}

model HighlightItem {
  id          String    @id @default(uuid())
  highlightId String    @map("highlight_id")
  contentId   String    @map("content_id")
  sortOrder   Int       @default(0) @map("sort_order")

  highlight Highlight @relation(fields: [highlightId], references: [id], onDelete: Cascade)
  content   Content   @relation(fields: [contentId], references: [id])

  @@map("highlight_items")
}
```

Add `highlights Highlight[]` relation on `User` and `highlightItems HighlightItem[]` on `Content`.

- [ ] Migrate (`p3_highlights`).

### Task 7.1: Backend

- [ ] Endpoints: `GET /users/:id/highlights`, `POST /highlights` (create), `PUT /highlights/:id` (edit), `DELETE /highlights/:id`, `POST /highlights/:id/items` (add content), `DELETE /highlights/:id/items/:itemId`.
- [ ] Tests one-per-endpoint.

### Task 7.2: Mobile

- **HighlightsRow.tsx** — circular thumbnails with emoji + title. Tap → opens viewer. Last cell is "+ New".
- **HighlightEditor.tsx** — modal to create/edit a highlight (title, emoji, multi-select from user's posts).
- **HighlightViewer.tsx** — story-style vertical swipeable player through the highlight's items.

Test each component, commit.

---

# Feature 8 — Profile Tagged tab

**Goal:** Posts that tag a user show up in that user's "Tagged" grid.

**Schema:** Add `taggedUserIds String[] @default([])` on `Content`.

### Task 8.1: Schema

- [ ] Add column + migrate (`p3_tagged`).

### Task 8.2: Backend

- [ ] Extend `createContentSchema` to accept `taggedUserIds: string[]`.
- [ ] Extend `/users/:id/content?tab=tagged` to filter `where: { taggedUserIds: { has: targetUserId } }`.
- [ ] Extend the `/users/:id/content` tab validator to include `'tagged'`.

Tests:

```typescript
it('tagged tab returns posts where the user is in taggedUserIds', async () => { ... });
```

### Task 8.3: Mobile

- Add a Tag Users button to the Create screen that opens a searchable user picker.
- Add `Tagged` tab chip on profile (already in the design — just add `'tagged'` to the tab switch).

Commit.

---

# Feature 9 — Edit Profile screen

**Goal:** The currently-dead "Edit Profile" button on the profile screen opens a full editor: avatar upload, display name, username (with availability check), bio.

**Files:**
- Backend: extend `/users/me/settings` validator to include avatar upload (uses existing `mediaService.upload` S3 presign). No new endpoint; just include `avatarUrl` in `updateSettingsSchema`.
- Mobile: `apps/mobile/app/edit-profile/index.tsx`.

### Task 9.1: Mobile only

- [ ] **Step 1: Failing test**

```typescript
it('updating name and pressing Save calls updateSettings', async () => { ... });
it('avatar tap opens image picker, then uploads', async () => { ... });
it('shows "saved" toast after success', async () => { ... });
```

- [ ] **Step 2: Implement form with avatar (tap → expo-image-picker → media upload → set avatarUrl).**
- [ ] **Step 3: Wire profile "Edit Profile" button to route to `/edit-profile`.**

Commit.

---

# Feature 10 — Settings extras

**Goal:** The settings screen has most fields but is missing: DOB, Gender, Secondary pincodes, Email digests, Linked accounts section, Delete account.

**No schema changes** — all fields already exist in `User`.

### Task 10.1: DOB picker

- [ ] Install `@react-native-community/datetimepicker`.
- [ ] Add DOB row to settings with date picker modal. Test: tapping opens picker, selecting date saves.

### Task 10.2: Gender radio

- [ ] 3-option radio (Male / Female / Other). Test: selection persists.

### Task 10.3: Secondary pincodes

- [ ] List with remove (✕) + "+ Add Pincode" input. Max 5 per `updateSettingsSchema`.

### Task 10.4: Email digest toggle

- [ ] Toggle bound to `notificationEmail` field.

### Task 10.5: Linked accounts section

- [ ] Static card listing Google / Phone / Instagram. Instagram is "Link →" placeholder (defer OAuth to post-MVP); phone and Google show verified status if present.

### Task 10.6: Delete account

- [ ] New endpoint: `DELETE /users/me` — soft-deletes user, anonymizes posts.
- [ ] Test:

```typescript
it('DELETE /users/me soft-deletes and returns 204', async () => { ... });
it("subsequent GET /users/me/settings returns 401 (user deleted)", async () => { ... });
```

- [ ] Mobile: confirm dialog + call + logout + redirect to welcome.

Commit each.

---

# Feature 11 — Creator Score

**Goal:** Every creator has a visible score 0-100. Formula (per mockup): `(likes + 0.3×comments + 5×trending - 0.5×dislikes - 5×reports) / max(1, total_posts)`.

**Schema:** Add `creatorScore Decimal @default(50) @db.Decimal(5, 2)` on `User`.

### Task 11.1: Schema + service

- [ ] Migrate (`p3_creator_score`).
- [ ] Failing service test:

```typescript
// creatorScoreService.test.ts
describe('creatorScoreService', () => {
  it('recalculate(userId) computes score using likes, comments, dislikes, trending', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs1', phone: '+912100000001', username: 'tcs1' });
    const c = await seedContent(u.id);
    await prisma.content.update({
      where: { id: c.id },
      data: { likeCount: 10, commentCount: 5, dislikeCount: 2, isTrending: true },
    });

    const score = await creatorScoreService.recalculate(u.id);
    // (10 + 0.3*5 + 5*1 - 0.5*2) / 1 = (10 + 1.5 + 5 - 1) / 1 = 15.5, clamped [0, 100]
    expect(score).toBeCloseTo(15.5, 1);
  });

  it('defaults to 50 for a user with no posts', async () => { ... });
  it('clamps result to [0, 100]', async () => { ... });
});
```

- [ ] Implement:

```typescript
export const creatorScoreService = {
  async recalculate(userId: string): Promise<number> {
    const agg = await prisma.content.aggregate({
      where: { userId, moderationStatus: 'published' },
      _sum: { likeCount: true, commentCount: true, dislikeCount: true },
      _count: { id: true },
    });
    const trendingCount = await prisma.content.count({
      where: { userId, moderationStatus: 'published', isTrending: true },
    });

    const posts = agg._count.id;
    if (posts === 0) return 50;

    const raw =
      ((agg._sum.likeCount ?? 0) +
        0.3 * (agg._sum.commentCount ?? 0) +
        5 * trendingCount -
        0.5 * (agg._sum.dislikeCount ?? 0)) /
      posts;

    const clamped = Math.max(0, Math.min(100, raw));
    await prisma.user.update({
      where: { id: userId },
      data: { creatorScore: clamped as any },
    });
    return clamped;
  },
};
```

- [ ] **Hook into daily cron** (add to existing `apps/api/src/jobs/` folder).
- [ ] Commit.

### Task 11.2: Display in mobile

- [ ] Create a reusable `<CreatorScoreCard />` component in `apps/mobile/components/CreatorScoreCard.tsx`. Accepts `score: number` (0–100) and optional `deltaThisWeek?: number`. Renders:
  - The score as a large number (e.g., "87") with `/100` suffix
  - A small circular progress ring at the selected score (use `react-native-svg`'s `Circle` with `strokeDashoffset` computed from score)
  - A delta chip if `deltaThisWeek` provided: green "⬆ +3 this week" or red "⬇ −2 this week" depending on sign
- [ ] Test cases for `<CreatorScoreCard />`:
  ```typescript
  it('renders the score value', () => {
    const { getByText } = render(<CreatorScoreCard score={87} />);
    expect(getByText('87')).toBeTruthy();
    expect(getByText('/100')).toBeTruthy();
  });
  it('shows green up-arrow delta for positive change', () => {
    const { getByText } = render(<CreatorScoreCard score={87} deltaThisWeek={3} />);
    expect(getByText(/⬆ \+3 this week/)).toBeTruthy();
  });
  it('shows red down-arrow delta for negative change', () => {
    const { getByText } = render(<CreatorScoreCard score={85} deltaThisWeek={-2} />);
    expect(getByText(/⬇ −2 this week/)).toBeTruthy();
  });
  it('hides the delta chip when deltaThisWeek is absent or zero', () => {
    const { queryByText } = render(<CreatorScoreCard score={87} />);
    expect(queryByText(/this week/)).toBeNull();
  });
  ```
- [ ] **Render it in THREE places** — this closes the mockup's "creator score appears on the My Content dashboard, profile, and leaderboard" pattern:
  1. **Profile screen** (`app/(tabs)/profile.tsx`): inline below the bio, above the Edit Profile / Create buttons. Pass `score={user.creatorScore}`.
  2. **My Content screen** (`app/my-content/index.tsx`): inline below `<CreatorEarningsCard />` (from P2 F3) and above the filter pills. Pass `score={user.creatorScore}` and `deltaThisWeek={...}` if available.
  3. **Leaderboard rows** (`app/leaderboard/index.tsx`): as a secondary metric next to weekly points on each row. Use a compact variant — just the number, no ring.
- [ ] Compute `deltaThisWeek`: for MVP, read a snapshot from AsyncStorage at login (key `creatorScore.snapshotAtWeekStart`). Delta = `currentScore - snapshot`. Persist a fresh snapshot every Monday 00:00 local. This avoids a server snapshot table for now. Document the approach in a comment so we remember to swap in a real snapshot table when DAU grows.

Test + commit in three commits (component, then profile wire-in, then my-content + leaderboard).

---

# Feature 12 — WhatsApp OTP

**Goal:** On login, user can choose between SMS and WhatsApp for the OTP.

**Provider:** Gupshup (popular in India) or Twilio. Both expose "send template message to this phone number" APIs.

**Flow:**
1. Mobile: user enters phone + toggles WhatsApp → backend hit with `channel=whatsapp`.
2. Backend: generates 6-digit code, stores it in Redis with 5-min TTL, calls provider API.
3. User receives WhatsApp message with code.
4. Mobile: user enters code → backend verifies via Redis → on success, creates a Firebase custom token for the phone number → returns it.
5. Mobile exchanges custom token for Firebase ID token via `signInWithCustomToken`.

**Files:**
- Backend: `src/services/whatsappOtpService.ts`, `src/routes/whatsapp-otp.ts`, env vars for provider.
- Mobile: modify login screen to support channel toggle; modify OTP screen to call the new backend verify.

### Task 12.1: Backend whatsappOtpService

- [ ] **Step 1: Failing test (uses Redis mock)**

```typescript
describe('whatsappOtpService', () => {
  it('sendOtp(phone) generates a 6-digit code and stores it keyed by phone', async () => { ... });
  it('verifyOtp(phone, code) returns true if matches, false otherwise', async () => { ... });
  it('verifyOtp fails after TTL elapses', async () => { ... });
});
```

- [ ] **Step 2: Implement.** Use `@upstash/redis` already in deps:

```typescript
import { Redis } from '@upstash/redis';
import { randomInt } from 'node:crypto';
import axios from 'axios';

const redis = Redis.fromEnv();
const OTP_TTL_SECONDS = 5 * 60;

export const whatsappOtpService = {
  async sendOtp(phone: string) {
    const code = String(randomInt(100000, 1000000));
    await redis.set(`otp:${phone}`, code, { ex: OTP_TTL_SECONDS });

    await axios.post('https://api.gupshup.io/sm/api/v1/msg', new URLSearchParams({
      channel: 'whatsapp',
      source: process.env.GUPSHUP_SOURCE!,
      destination: phone,
      message: JSON.stringify({
        type: 'text',
        text: `Your Eru verification code: ${code}. Valid for 5 minutes.`,
      }),
      'src.name': 'eru',
    }), {
      headers: { apikey: process.env.GUPSHUP_API_KEY! },
    });

    return { channel: 'whatsapp' as const };
  },

  async verifyOtp(phone: string, code: string) {
    const stored = await redis.get(`otp:${phone}`);
    if (stored === code) {
      await redis.del(`otp:${phone}`);
      return true;
    }
    return false;
  },
};
```

- [ ] **Step 3: Route + firebase custom token**

```typescript
// src/routes/whatsapp-otp.ts
app.post('/auth/whatsapp/send', async (request) => {
  const { phone } = request.body as { phone: string };
  await whatsappOtpService.sendOtp(phone);
  return { success: true };
});

app.post('/auth/whatsapp/verify', async (request, reply) => {
  const { phone, code } = request.body as { phone: string; code: string };
  const ok = await whatsappOtpService.verifyOtp(phone, code);
  if (!ok) throw Errors.unauthorized('Invalid code');

  // Get or create firebase user for this phone
  const admin = await import('firebase-admin');
  const fbUser = await admin.auth().getUserByPhoneNumber(phone).catch(() => null);
  const uid = fbUser?.uid ?? (await admin.auth().createUser({ phoneNumber: phone })).uid;
  const customToken = await admin.auth().createCustomToken(uid);

  return reply.send({ customToken });
});
```

Test + commit.

### Task 12.2: Mobile WhatsApp channel toggle

- [ ] Modify login screen: "Send via WhatsApp" toggle above Continue button.
- [ ] When toggle on, call `/auth/whatsapp/send` instead of Firebase Phone Auth. After OTP entered, call `/auth/whatsapp/verify` → receive custom token → `signInWithCustomToken(auth, customToken)` → get ID token → existing auth flow.
- [ ] Tests:
  ```typescript
  it('when WhatsApp toggle is on, pressing Continue calls /auth/whatsapp/send', () => { ... });
  it('OTP verify with WhatsApp channel calls /auth/whatsapp/verify', () => { ... });
  ```

Commit.

---

## P3 completion criteria

- [ ] All new `cd apps/api && npm test` tests pass
- [ ] All new `cd apps/mobile && npm test` tests pass
- [ ] Manual: fresh install → welcome → personalize → tutorial → login → OTP → feed
- [ ] Manual: dislike a post, refresh, still shows disliked; `dislikeCount` incremented
- [ ] Manual: save a post → appears in profile Saved tab
- [ ] Manual: create a poll with 3 options → vote → bars animate → cannot vote again
- [ ] Manual: create a thread with 3 parts → detail view shows connected bubbles
- [ ] Manual: tag a user in a post → visit their profile Tagged tab → post appears
- [ ] Manual: Edit Profile → change avatar + bio → Save → changes persist after app restart
- [ ] Manual: Settings → set DOB + Gender + add 2 secondary pincodes + toggle email digest → reopen settings → persisted
- [ ] Manual: Settings → Delete Account → confirm → logged out + redirected to welcome
- [ ] Manual: Profile shows Creator Score; score changes after gaining likes
- [ ] Manual: login → toggle WhatsApp → receive WhatsApp message with code → verify → log in

## What could go wrong

- **PollVote double-count** — `@@unique([userId, pollOptionId])` prevents the same user voting the same option twice. But they could vote *different* options. Solution: also check `pollOption.contentId` and delete previous votes for the same poll.
- **Thread cascading deletes** — if a user deletes the parent thread post, children orphan. Schema's `onDelete: Cascade` should prevent this — verify with a test.
- **Dislike spam** — users could toggle dislike repeatedly to grief a creator. Rate-limit the endpoint (5/hour?) via the existing `rateLimitByUser` middleware.
- **Creator score recalculation cost** — running this across all users daily is expensive at scale. Queue per-user jobs on content events rather than a full sweep.
- **WhatsApp template rejection** — Gupshup requires pre-approved templates for template messages. The plain text fallback works for session messages. Check your provider's limits.
- **DOB picker on Android** — behaves differently than iOS (opens a dialog vs. an inline picker). Test both.
- **Soft-deleted users show up in feed** — `DELETE /users/me` must also anonymize the user's existing content (set `userId` to a system "deleted user" account) to avoid broken references.
- **Highlights ordering** — drag-to-reorder is a common request but painful to implement. Defer to post-P3.

---

## Skipped-for-post-P3

A few things in the mockup that didn't make it into P3 (nice-to-haves, not launch blockers):

1. **Daily spin animation polish** — current P1 spin works functionally; smooth wheel animation can wait.
2. **Story replies** — "reply to this story" chat threads; complex cross-feature interaction.
3. **Live streaming reels** — the mockup shows a "LIVE" indicator; true live streaming requires a media server (Agora, Mux). Defer entirely.
4. **Review writing UI** — the schema has `rating` on `Business`, but there's no review-writing flow. Consider a post-P3 review model.
5. **Referral flow** — "refer a friend for +100 pts" — backend already supports `refer_friend` action type; needs a share sheet + deep link handler.
6. **App localization** — we store `appLanguage` but haven't added i18n. Use `expo-localization` + `react-intl` when ready.
7. **Dark mode** — no design in the mockup; defer.
8. **Accessibility** — should be done throughout (VoiceOver labels, dynamic type). Consider a dedicated a11y sweep after P3.

---

**Why does this matter?** P3 is where your app stops being "a good MVP" and becomes "a product that could scale." Beginner insight: the 80/20 rule applies strongly here. P0+P1+P2 are the 20% of features that deliver 80% of the value. P3 is the 80% of features that deliver the last 20%. **Do not ship P3 before you've validated P0+P1+P2 with real users.** If no one is using the app after P2, polishing it with P3 won't save you — it'll just burn runway.

---

## Suggested post-P3 priorities

Once P3 ships, the next question is: what do *users* ask for? You'll know by:
- Which screens they open most (add PostHog/Amplitude analytics)
- Where they drop off in the funnel (welcome → OTP → onboarding → first-post)
- What they complain about in support channels

Let observed behavior drive priorities after launch. The plans here cover the mockup's vision; what users actually want may differ.
