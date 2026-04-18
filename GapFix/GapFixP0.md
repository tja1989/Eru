# GapFix P0 — Close the Social Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task follows strict TDD (RED → verify → GREEN → verify → commit). See [TDD Protocol](#tdd-protocol) below.

**Goal:** Make the app feel like a complete social network — users can comment, see notifications, authenticate safely, follow each other, and share posts to friends.

**Architecture:** Five independent features, added in order of user-facing pain. Backend endpoints mostly already exist (comments, follow, notifications); the work is mostly mobile-side UI + a new OTP flow. We install a full mobile test stack first because none exists today — that foundation enables every plan after this one.

**Tech Stack:**
- API: Fastify + Vitest + `app.inject()` + Prisma + PostgreSQL + Zod + Firebase Admin
- Mobile: Expo Router + React Native + Axios + Zustand + AsyncStorage + **(new)** Jest + `@testing-library/react-native` + `jest-expo`
- Auth: Firebase Phone Auth (SMS OTP) — WhatsApp deferred to P3

---

## The restaurant analogy

Think of the app as a **restaurant you've built**. The kitchen works — food comes out (feed renders posts, reels play). But walk through the front-of-house and you hit dead-ends:

- Guests can **read** the comment cards on the table but have **no pen** to write their own (comment create is broken).
- A **bell at the door** rings but no one sees who's ringing (notifications dead).
- Anyone can **walk in claiming to be you** — the host just takes your word (no OTP).
- You spot a regular you like and want to "save their table for future visits" — no way (follow dead).
- You taste something incredible and want to **text a friend** to come try — no way (share dead).

P0 closes these five basic guest expectations. Without them, the restaurant feels half-finished.

---

## Big-picture flow

```
  MOBILE APP (Expo)                          API (Fastify)
  ─────────────────                          ─────────────

  ┌──────────────┐                          ┌──────────────┐
  │ CommentInput │  POST /posts/:id/comments│              │
  │  (NEW)       │ ───────────────────────► │ content.ts   │
  └──────────────┘                          │  (EXISTS)    │
                                            └──────────────┘
  ┌──────────────┐                          ┌──────────────┐
  │ Notifications│  GET /notifications      │              │
  │ Screen (NEW) │ ───────────────────────► │notifications │
  └──────────────┘                          │.ts (EXISTS)  │
                                            └──────────────┘
  ┌──────────────┐       Firebase Phone     ┌──────────────┐
  │ OTP Flow     │  SDK      POST /auth/    │              │
  │ (NEW)        │ ──────►   register       │ auth.ts      │
  └──────────────┘           (EXISTS)       └──────────────┘

  ┌──────────────┐                          ┌──────────────┐
  │ Follow Btn   │  POST /users/:id/follow  │              │
  │ (NEW)        │ ───────────────────────► │ users.ts     │
  └──────────────┘                          │  (EXISTS)    │
                                            └──────────────┘
  ┌──────────────┐       (React Native      ─ no backend ─
  │ Share Action │        Share API)        (uses native
  │ (NEW)        │ ──────►  native share    share sheet)
  └──────────────┘          sheet
```

**Key Insight:** Four of the five P0 gaps are **mobile-only**. The API is ahead of the mobile app. Your bottleneck is not backend complexity — it's wiring frontend UI to existing endpoints.

---

## TDD Protocol

Every task in this plan follows the **Iron Law** from the superpowers TDD skill:

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

The canonical cycle for each feature:

1. **RED** — write one small failing test that describes the desired behavior.
2. **Verify RED** — run the test, confirm it fails for the *expected reason* (not a typo).
3. **GREEN** — write the minimum production code to pass.
4. **Verify GREEN** — run the test + all other tests; all pass, output is clean.
5. **REFACTOR** — clean up without adding behavior; tests stay green.
6. **COMMIT** — one logical change per commit.

**Violating the letter of the rule is violating the spirit.** If you catch yourself thinking "I'll write tests after," stop. That thought is the bug.

### Special rules for this repo

- **API tests** use `app.inject()` (Fastify) — never `supertest`, never `fetch`. Mirror `apps/api/tests/routes/health.test.ts`.
- **API tests hit the real DB.** Do not mock Prisma. Seed a user with `firebaseUid: 'dev-<test-name>'` and authenticate with `Authorization: Bearer dev-<test-name>` (requires `ALLOW_DEV_TOKENS=true` in `.env.test`).
- **Mobile tests** use Jest with `jest-expo` preset + `@testing-library/react-native`. Tests live in `apps/mobile/__tests__/` mirroring the `app/`, `components/`, `services/`, `stores/` structure.
- **Mock axios at the service layer** in mobile tests — not `global.fetch`. Mock `services/api.ts` via `jest.mock('@/services/api')`.
- **Snapshot tests are banned.** They reward false confidence. Assert on specific roles/text.
- **One behavior per test.** If the test name has "and" in it, split it.

---

## File structure (what changes, what's created)

### New files

```
apps/mobile/
├── jest.config.js                                     (NEW)
├── jest.setup.ts                                      (NEW)
├── babel.config.js                                    (NEW)
├── __tests__/
│   ├── services/
│   │   ├── contentService.test.ts                     (NEW)
│   │   ├── notificationService.test.ts                (NEW)
│   │   ├── userService.test.ts                        (NEW)
│   │   └── authService.test.ts                        (NEW)
│   ├── stores/
│   │   └── notificationStore.test.ts                  (NEW)
│   ├── components/
│   │   ├── CommentInput.test.tsx                      (NEW)
│   │   ├── FollowButton.test.tsx                      (NEW)
│   │   └── ShareButton.test.tsx                       (NEW)
│   └── screens/
│       ├── notifications.test.tsx                     (NEW)
│       └── otp.test.tsx                               (NEW)
├── components/
│   ├── CommentInput.tsx                               (NEW)
│   ├── FollowButton.tsx                               (NEW)
│   └── ShareButton.tsx                                (NEW)
├── app/
│   ├── (auth)/
│   │   └── otp.tsx                                    (NEW)
│   └── notifications/
│       └── index.tsx                                  (NEW)

apps/api/tests/routes/
├── auth.test.ts                                       (NEW)
├── users-follow.test.ts                               (NEW)
├── content-comments.test.ts                           (NEW)
└── notifications.test.ts                              (NEW)

apps/api/tests/helpers/
└── db.ts                                              (NEW — seed/teardown helpers)
```

### Modified files

```
apps/mobile/package.json                               (add jest deps + test script)
apps/mobile/app/post/[id].tsx                          (add CommentInput at bottom)
apps/mobile/app/(tabs)/index.tsx                       (wire bell icon to /notifications)
apps/mobile/app/(auth)/login.tsx                       (route to /(auth)/otp after phone entry)
apps/mobile/app/(tabs)/profile.tsx                     (add FollowButton when viewing others)
apps/mobile/app/(tabs)/reels.tsx                       (add FollowButton over creator info)
apps/mobile/components/PostCard.tsx                    (swap share placeholder for ShareButton)
apps/mobile/services/contentService.ts                 (add createComment fn)
apps/mobile/services/notificationService.ts            (ensure get/markRead match backend)
apps/mobile/services/userService.ts                    (add follow/unfollow fns)
apps/mobile/services/authService.ts                    (add requestOtp, verifyOtp)
apps/mobile/stores/notificationStore.ts                (add unread count + polling)
```

---

## Task order and dependency graph

```
  ┌──────────────────────────────┐
  │ Feature 0: Mobile test infra │   ◄── blocks everything below
  └──────────────┬───────────────┘
                 │
  ┌──────────────┴──────────────┐
  │                             │
  ▼                             ▼
┌─────────────┐            ┌─────────────┐
│ F1: Comment │            │ F2: Notif   │    ◄── independent, can parallelize
│ create      │            │ screen      │
└─────────────┘            └─────────────┘
                 │
                 ▼
┌─────────────┐            ┌─────────────┐
│ F3: OTP     │            │ F4: Follow  │    ◄── also independent
└─────────────┘            └─────────────┘
                 │
                 ▼
              ┌─────────────┐
              │ F5: Share   │    ◄── smallest; can slot anywhere after F0
              └─────────────┘
                 │
                 ▼
              ┌───────────────────────┐
              │ F7: Ellipsis menu     │    ◄── launch-blocking (Report)
              │    + Report           │
              └───────────────────────┘
```

Features 1–5 and 7 are independent after Feature 0. If you have parallel agents, dispatch F1, F2, F4, F5, F7 concurrently after F0 ships. F3 (OTP) touches auth store + routing; do it alone to avoid conflicts. F7 is flagged launch-blocking: the app cannot be submitted to iOS/Android stores without a content-reporting flow per UGC policy.

---

# Feature 0 — Mobile test infrastructure

**Goal:** Install Jest + Testing Library + Expo preset so every future P0–P3 feature can follow TDD.

**Why first:** The TDD Iron Law says "no production code without a failing test." The mobile app can't write a failing test today because Jest isn't installed. Ship this before any feature.

**What would break without it:** Every subsequent task in P0–P3 is unachievable via TDD. You'd be forced to either write code-first (violating the rule) or skip mobile coverage entirely.

**Files:**
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/jest.setup.ts`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/__tests__/services/sanity.test.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/tsconfig.json`

### Task 0.1: Install Jest + Testing Library + Expo preset

- [ ] **Step 1: Add test dependencies to mobile workspace**

Run from repo root:

```bash
cd apps/mobile && npm install --save-dev \
  jest@^29.7.0 \
  jest-expo@~54.0.0 \
  @testing-library/react-native@^12.6.0 \
  @testing-library/jest-native@^5.4.3 \
  @types/jest@^29.5.12 \
  babel-jest@^29.7.0 \
  react-test-renderer@19.1.0
```

Expected output: `added N packages`. No errors about peer deps — if `react-test-renderer` mismatches `react@19.1.0`, pin it explicitly.

- [ ] **Step 2: Add the `test` script to `apps/mobile/package.json`**

Locate the `"scripts"` block and add a `"test"` line:

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

- [ ] **Step 3: Create `apps/mobile/babel.config.js`**

Expo-router + Jest needs a babel config at the app root (Expo normally infers this, but Jest runs outside the Expo CLI):

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [],
  };
};
```

- [ ] **Step 4: Create `apps/mobile/jest.config.js`**

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-modules-core|expo-router|@react-navigation/.*|@unimodules/.*|sentry-expo|native-base|react-native-svg))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'services/**/*.ts',
    'stores/**/*.ts',
    'hooks/**/*.ts',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
```

**Line-by-line:**
- `preset: 'jest-expo'` — tells Jest how to transform JSX/TS + mock Expo modules.
- `setupFilesAfterEach` — our custom matchers + cleanup hooks run after every test.
- `testMatch` — only files under `__tests__/` ending in `.test.ts(x)` count.
- `transformIgnorePatterns` — by default Jest skips `node_modules`, but Expo ships ESM we must transpile.
- `moduleNameMapper` — lets us write `@/services/api` instead of relative paths in tests, matching source code.

- [ ] **Step 5: Create `apps/mobile/jest.setup.ts`**

```typescript
import '@testing-library/jest-native/extend-expect';

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: { apiUrl: 'http://test.local/api/v1' },
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  Stack: { Screen: () => null },
}));

// Silence the "useNativeDriver" warning in RN Animated under jsdom
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

**Why each mock:**
- `jest-native/extend-expect` — adds matchers like `toBeVisible()`, `toHaveTextContent()`.
- `expo-constants` — our `services/api.ts` reads `apiUrl` from `Constants.expoConfig.extra`. The mock gives tests a stable URL.
- `async-storage-mock` — ships with the package; makes reads/writes synchronous in-memory.
- `expo-router` — tests shouldn't drive navigation side effects; we stub the hooks.
- `NativeAnimatedHelper` — silences a known RN warning in jsdom.

- [ ] **Step 6: Ensure `tsconfig.json` includes `jest` types**

Edit `apps/mobile/tsconfig.json`. Add `"jest"` to `compilerOptions.types`:

```json
{
  "compilerOptions": {
    "types": ["jest"]
  }
}
```

- [ ] **Step 7: Write the failing sanity test**

Create `apps/mobile/__tests__/services/sanity.test.ts`:

```typescript
describe('jest setup', () => {
  it('math works', () => {
    expect(1 + 1).toBe(2);
  });

  it('loads async storage mock without error', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('k', 'v');
    const value = await AsyncStorage.getItem('k');
    expect(value).toBe('v');
  });
});
```

- [ ] **Step 8: Run the test — expect GREEN immediately**

```bash
cd apps/mobile && npm test -- --testPathPattern=sanity
```

Expected:
```
PASS __tests__/services/sanity.test.ts
  jest setup
    ✓ math works
    ✓ loads async storage mock without error

Tests: 2 passed
```

If any mock in `jest.setup.ts` errors, fix it here — do not proceed until sanity passes clean.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/package.json apps/mobile/jest.config.js apps/mobile/jest.setup.ts apps/mobile/babel.config.js apps/mobile/tsconfig.json apps/mobile/__tests__/
git commit -m "chore: install mobile test stack (jest + RTL + jest-expo)"
```

---

# Feature 1 — Comment create UI

**Goal:** Authenticated users can type a comment and post it on any post. UI matches mockup's sticky input with avatar, placeholder hint, and post button.

**What the user sees:** On `/post/[id]`, a sticky comment bar at the bottom with their avatar + text input (`Add a comment... (+3 pts for 10+ words)`) + Post button. Typing enables the button. Tapping Post calls the API, optimistically inserts the comment, and clears the input.

**Backend status:** `POST /posts/:id/comments` endpoint already exists in `apps/api/src/routes/content.ts:251`. **No backend work needed** — we only add tests for coverage.

**Why this first:** It's the smallest, most user-visible gap. Currently users can read comments but not write them — a glaring dead-end. Fixing it restores the most basic social contract: feedback.

**What would break without it:** Users scroll a post, want to respond, discover they can't. That's a product-killing moment of "this app isn't real."

**Files:**
- Test: `apps/api/tests/routes/content-comments.test.ts` (NEW — covers existing endpoint)
- Test: `apps/mobile/__tests__/services/contentService.test.ts` (NEW)
- Test: `apps/mobile/__tests__/components/CommentInput.test.tsx` (NEW)
- Create: `apps/mobile/components/CommentInput.tsx`
- Modify: `apps/mobile/services/contentService.ts`
- Modify: `apps/mobile/app/post/[id].tsx`

### Task 1.1: Backend coverage for comment creation

- [ ] **Step 1: Create the DB helper if it doesn't exist**

Create `apps/api/tests/helpers/db.ts`:

```typescript
import { prisma } from '../../src/utils/prisma.js';

const TEST_PREFIX = 'test-';

export async function seedUser(opts: {
  firebaseUid: string;
  phone: string;
  username: string;
  name?: string;
}) {
  return prisma.user.create({
    data: {
      firebaseUid: opts.firebaseUid,
      phone: opts.phone,
      username: opts.username,
      name: opts.name ?? 'Test User',
      primaryPincode: '000000',
    },
  });
}

export async function seedContent(userId: string, overrides: Partial<{
  text: string;
  type: 'post' | 'reel' | 'poll' | 'thread';
  moderationStatus: 'pending' | 'published' | 'declined';
}> = {}) {
  return prisma.content.create({
    data: {
      userId,
      type: overrides.type ?? 'post',
      text: overrides.text ?? 'A post',
      moderationStatus: overrides.moderationStatus ?? 'published',
      publishedAt: overrides.moderationStatus === 'pending' ? null : new Date(),
    },
  });
}

export async function cleanupTestData() {
  await prisma.comment.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.interaction.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.follow.deleteMany({ where: { OR: [
    { follower: { firebaseUid: { startsWith: 'dev-test-' } } },
    { following: { firebaseUid: { startsWith: 'dev-test-' } } },
  ] } });
  await prisma.notification.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.moderationQueue.deleteMany({ where: { content: { user: { firebaseUid: { startsWith: 'dev-test-' } } } } });
  await prisma.content.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
  await prisma.user.deleteMany({ where: { firebaseUid: { startsWith: 'dev-test-' } } });
}

export function devToken(firebaseUid: string) {
  return `Bearer ${firebaseUid}`;
}
```

**Why this helper:** All tests share the same seeding pattern. Centralizing it means one place to fix when schema evolves. The `dev-test-` prefix is how we identify rows to clean between test runs without nuking prod data.

- [ ] **Step 2: Write the failing test**

Create `apps/api/tests/routes/content-comments.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';

describe('POST /api/v1/posts/:id/comments', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('creates a comment and returns 201 with the comment + user', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter',
      phone: '+919000000001',
      username: 'tcommenter',
    });
    const post = await seedContent(user.id, { text: 'A post to comment on' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter') },
      payload: { text: 'This is my first comment, hooray' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.comment.text).toBe('This is my first comment, hooray');
    expect(body.comment.user.username).toBe('tcommenter');
    expect(body.comment.parentId).toBeNull();
  });

  it('increments the parent content commentCount', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter2',
      phone: '+919000000002',
      username: 'tcommenter2',
    });
    const post = await seedContent(user.id);

    await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter2') },
      payload: { text: 'Incrementing the counter' },
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/content/${post.id}`,
      headers: { Authorization: devToken('dev-test-commenter2') },
    });
    expect(detail.json().content.commentCount).toBe(1);
  });

  it('rejects empty text with 400', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter3',
      phone: '+919000000003',
      username: 'tcommenter3',
    });
    const post = await seedContent(user.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter3') },
      payload: { text: '' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter4',
      phone: '+919000000004',
      username: 'tcommenter4',
    });
    const post = await seedContent(user.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      payload: { text: 'hi' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('creates threaded replies when parentId is provided', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter5',
      phone: '+919000000005',
      username: 'tcommenter5',
    });
    const post = await seedContent(user.id);

    const parentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter5') },
      payload: { text: 'Parent comment' },
    });
    const parentId = parentRes.json().comment.id;

    const replyRes = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter5') },
      payload: { text: 'Reply to parent', parentId },
    });

    expect(replyRes.statusCode).toBe(201);
    expect(replyRes.json().comment.parentId).toBe(parentId);
  });
});
```

- [ ] **Step 3: Run test — expect all to PASS (endpoint already exists)**

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- content-comments
```

Expected: 5 tests passing. If any fail, investigate — the endpoint may behave differently than documented.

**If a test fails:** This is important data. The endpoint doesn't do what we thought. STOP and report to the human partner before "fixing" — the fix may be a product decision.

- [ ] **Step 4: Commit**

```bash
git add apps/api/tests/helpers/db.ts apps/api/tests/routes/content-comments.test.ts
git commit -m "test: cover comment creation endpoint"
```

### Task 1.2: Mobile service for createComment

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/services/contentService.test.ts`:

```typescript
import { contentService } from '@/services/contentService';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('contentService.createComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs to /posts/:id/comments with text', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { comment: { id: 'c1', text: 'hello', user: { username: 'me' } } },
    });

    const result = await contentService.createComment('post-id-1', 'hello');

    expect(api.post).toHaveBeenCalledWith('/posts/post-id-1/comments', { text: 'hello' });
    expect(result.id).toBe('c1');
    expect(result.text).toBe('hello');
  });

  it('passes parentId when replying', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { comment: { id: 'r1', text: 'reply', parentId: 'c1', user: { username: 'me' } } },
    });

    await contentService.createComment('post-id-1', 'reply', 'c1');

    expect(api.post).toHaveBeenCalledWith('/posts/post-id-1/comments', {
      text: 'reply',
      parentId: 'c1',
    });
  });

  it('throws if text is empty', async () => {
    await expect(contentService.createComment('post-id-1', '')).rejects.toThrow(
      'Comment cannot be empty',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL (createComment not defined)**

```bash
cd apps/mobile && npm test -- contentService
```

Expected: `contentService.createComment is not a function` or similar.

- [ ] **Step 3: Implement in `apps/mobile/services/contentService.ts`**

Add this method to the `contentService` export (keeping existing methods):

```typescript
async createComment(contentId: string, text: string, parentId?: string) {
  if (!text.trim()) {
    throw new Error('Comment cannot be empty');
  }
  const payload: { text: string; parentId?: string } = { text };
  if (parentId) payload.parentId = parentId;
  const res = await api.post(`/posts/${contentId}/comments`, payload);
  return res.data.comment;
},
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd apps/mobile && npm test -- contentService
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/services/contentService.ts apps/mobile/__tests__/services/contentService.test.ts
git commit -m "feat(mobile): add contentService.createComment"
```

### Task 1.3: CommentInput component

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/CommentInput.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CommentInput } from '@/components/CommentInput';
import { contentService } from '@/services/contentService';

jest.mock('@/services/contentService');
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', avatarUrl: null, username: 'me' } }),
}));

describe('<CommentInput />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a text input and disabled post button when empty', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    expect(getByPlaceholderText(/add a comment/i)).toBeTruthy();
    expect(getByTestId('comment-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('enables the post button once text is entered', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    fireEvent.changeText(getByPlaceholderText(/add a comment/i), 'hi');
    expect(getByTestId('comment-submit').props.accessibilityState?.disabled).toBe(false);
  });

  it('calls contentService.createComment and onPosted on submit', async () => {
    (contentService.createComment as jest.Mock).mockResolvedValue({
      id: 'c-new',
      text: 'hello world',
      user: { username: 'me' },
    });
    const onPosted = jest.fn();
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={onPosted} />,
    );
    fireEvent.changeText(getByPlaceholderText(/add a comment/i), 'hello world');
    fireEvent.press(getByTestId('comment-submit'));

    await waitFor(() => {
      expect(contentService.createComment).toHaveBeenCalledWith('c1', 'hello world', undefined);
      expect(onPosted).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-new' }));
    });
  });

  it('clears the input after successful submit', async () => {
    (contentService.createComment as jest.Mock).mockResolvedValue({ id: 'x', text: 'x', user: {} });
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    const input = getByPlaceholderText(/add a comment/i);
    fireEvent.changeText(input, 'hello');
    fireEvent.press(getByTestId('comment-submit'));

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('shows an inline error when createComment rejects', async () => {
    (contentService.createComment as jest.Mock).mockRejectedValue(new Error('network boom'));
    const { getByPlaceholderText, getByTestId, findByText } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    fireEvent.changeText(getByPlaceholderText(/add a comment/i), 'hi');
    fireEvent.press(getByTestId('comment-submit'));

    expect(await findByText(/couldn't post/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/mobile && npm test -- CommentInput
```

Expected: `Cannot find module '@/components/CommentInput'`.

- [ ] **Step 3: Implement `apps/mobile/components/CommentInput.tsx`**

```typescript
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { contentService } from '@/services/contentService';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/Avatar';

type Props = {
  contentId: string;
  parentId?: string;
  onPosted: (comment: { id: string; text: string; user: { username: string } }) => void;
};

export function CommentInput({ contentId, parentId, onPosted }: Props) {
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const disabled = trimmed.length === 0 || submitting;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const comment = await contentService.createComment(contentId, trimmed, parentId);
      onPosted(comment);
      setText('');
    } catch (e) {
      setError("Couldn't post — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Avatar uri={user?.avatarUrl} size={32} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment... (+3 pts for 10+ words)"
          placeholderTextColor="#8E8E8E"
          style={styles.input}
          multiline
          editable={!submitting}
        />
        <TouchableOpacity
          testID="comment-submit"
          onPress={handleSubmit}
          disabled={disabled}
          accessibilityState={{ disabled }}
          style={[styles.submit, disabled && styles.submitDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    padding: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#262626',
    maxHeight: 100,
  },
  submit: {
    backgroundColor: '#0095F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  error: { color: '#ED4956', fontSize: 12, marginBottom: 6 },
});
```

- [ ] **Step 4: Run — expect PASS (all 5)**

```bash
cd apps/mobile && npm test -- CommentInput
```

If `Avatar` lookup fails, confirm the import path matches `components/Avatar.tsx`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/CommentInput.tsx apps/mobile/__tests__/components/CommentInput.test.tsx
git commit -m "feat(mobile): add CommentInput component"
```

### Task 1.4: Wire CommentInput into post detail

- [ ] **Step 1: Read the current post detail screen**

```bash
cat apps/mobile/app/post/\[id\].tsx
```

Find the JSX section after the comments list and before the closing root view.

- [ ] **Step 2: Write an integration test**

Create `apps/mobile/__tests__/screens/postDetail.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PostDetail from '@/app/post/[id]';
import { contentService } from '@/services/contentService';

jest.mock('@/services/contentService');
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', username: 'me', avatarUrl: null } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'post-1' }),
}));

describe('<PostDetail />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contentService.getById as jest.Mock).mockResolvedValue({
      id: 'post-1',
      userId: 'u2',
      type: 'post',
      text: 'Hello world',
      media: [],
      user: { id: 'u2', username: 'author', name: 'Author', avatarUrl: null, tier: 'explorer' },
      likeCount: 0,
      commentCount: 0,
      hashtags: [],
    });
    (contentService.getComments as jest.Mock).mockResolvedValue({
      comments: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  it('renders a CommentInput at the bottom', async () => {
    const { findByPlaceholderText } = render(<PostDetail />);
    expect(await findByPlaceholderText(/add a comment/i)).toBeTruthy();
  });

  it('prepends a new comment to the list after posting', async () => {
    (contentService.createComment as jest.Mock).mockResolvedValue({
      id: 'c-new',
      text: 'First comment!',
      user: { id: 'u1', username: 'me', avatarUrl: null },
      createdAt: new Date().toISOString(),
    });
    const { findByPlaceholderText, getByTestId, findByText } = render(<PostDetail />);
    const input = await findByPlaceholderText(/add a comment/i);
    fireEvent.changeText(input, 'First comment!');
    fireEvent.press(getByTestId('comment-submit'));
    expect(await findByText('First comment!')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Input won't be found because the component isn't wired yet.

```bash
cd apps/mobile && npm test -- postDetail
```

- [ ] **Step 4: Modify `apps/mobile/app/post/[id].tsx`**

Add the import at the top:

```typescript
import { CommentInput } from '@/components/CommentInput';
```

Find the component's returned JSX. At the bottom of the scroll view (or below the list, above the root view close), add:

```typescript
<CommentInput
  contentId={id}
  onPosted={(comment) => {
    setComments((prev) => [{ ...comment, replies: [] }, ...prev]);
    setCommentCount((n) => n + 1);
  }}
/>
```

Also ensure the screen uses `KeyboardAvoidingView` so the input isn't covered by the keyboard:

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

// Wrap the root of the component
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  style={{ flex: 1 }}
>
  {/* existing content */}
</KeyboardAvoidingView>
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd apps/mobile && npm test -- postDetail
```

- [ ] **Step 6: Manual smoke test**

```bash
cd apps/mobile && npm start
```

Open the app (Expo Go on a device or simulator). Navigate Home → tap a post → scroll down. Type in the comment bar; the Post button should enable. Press Post; the comment should appear at the top of the list and the input should clear.

**Verification checklist before claiming done:**
- [ ] Keyboard does not cover the input on iOS
- [ ] Input disables during submit (spinner visible)
- [ ] Error message appears if network is offline (turn off wifi; try posting)
- [ ] Backend `commentCount` on the post increments (check via pulling-to-refresh or reloading the screen)

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/post/\[id\].tsx apps/mobile/__tests__/screens/postDetail.test.tsx
git commit -m "feat(mobile): wire CommentInput into post detail screen"
```

---

# Feature 2 — Notifications screen

**Goal:** Tapping the bell icon in the home header opens a full-screen notifications inbox with categorized filter tabs, unread indicators, and mark-all-read.

**Backend status:** `GET /notifications` + `PUT /notifications/read` already exist in `apps/api/src/routes/notifications.ts`. **No backend work** beyond test coverage.

**Why this matters:** Right now the bell icon is a dead button. The user earns +X pts for every action but has no log of *why* or *when*. The engagement loop silently breaks — points feel unearned.

**What would break without it:** A user earns 250 points in a week, opens the app on day 8, has no memory of why their balance looks the way it does. They distrust the points system.

**Files:**
- Test: `apps/api/tests/routes/notifications.test.ts`
- Test: `apps/mobile/__tests__/services/notificationService.test.ts`
- Test: `apps/mobile/__tests__/stores/notificationStore.test.ts`
- Test: `apps/mobile/__tests__/screens/notifications.test.tsx`
- Create: `apps/mobile/app/notifications/index.tsx`
- Modify: `apps/mobile/services/notificationService.ts`
- Modify: `apps/mobile/stores/notificationStore.ts`
- Modify: `apps/mobile/app/(tabs)/index.tsx` (wire bell icon)

### Task 2.1: Backend test coverage for notifications

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/routes/notifications.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedNotification(userId: string, overrides: Partial<{
  type: string;
  title: string;
  body: string;
  isRead: boolean;
}> = {}) {
  return prisma.notification.create({
    data: {
      userId,
      type: overrides.type ?? 'points_earned',
      title: overrides.title ?? 'Points!',
      body: overrides.body ?? 'You earned points.',
      isRead: overrides.isRead ?? false,
    },
  });
}

describe('GET /api/v1/notifications', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns the users notifications newest first', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notif1',
      phone: '+919100000001',
      username: 'tnotif1',
    });
    await seedNotification(user.id, { title: 'old', body: 'old' });
    // Sleep 10ms so createdAt differs
    await new Promise((r) => setTimeout(r, 10));
    await seedNotification(user.id, { title: 'new', body: 'new' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { Authorization: devToken('dev-test-notif1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.notifications[0].title).toBe('new');
  });

  it('returns an unread count', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notif2',
      phone: '+919100000002',
      username: 'tnotif2',
    });
    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: true });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { Authorization: devToken('dev-test-notif2') },
    });

    expect(res.json().unreadCount).toBe(2);
  });

  it("does not return another user's notifications", async () => {
    const app = getTestApp();
    const user1 = await seedUser({
      firebaseUid: 'dev-test-notif3',
      phone: '+919100000003',
      username: 'tnotif3',
    });
    const user2 = await seedUser({
      firebaseUid: 'dev-test-notif4',
      phone: '+919100000004',
      username: 'tnotif4',
    });
    await seedNotification(user2.id, { title: 'user2 only' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { Authorization: devToken('dev-test-notif3') },
    });
    expect(res.json().notifications).toHaveLength(0);
  });

  it('paginates', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notif5',
      phone: '+919100000005',
      username: 'tnotif5',
    });
    for (let i = 0; i < 25; i++) await seedNotification(user.id);

    const page1 = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications?page=1&limit=20',
      headers: { Authorization: devToken('dev-test-notif5') },
    });
    const page2 = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications?page=2&limit=20',
      headers: { Authorization: devToken('dev-test-notif5') },
    });

    expect(page1.json().notifications).toHaveLength(20);
    expect(page2.json().notifications).toHaveLength(5);
  });
});

describe('PUT /api/v1/notifications/read', () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it('marks the given ids as read', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notifread',
      phone: '+919100000099',
      username: 'tnotifread',
    });
    const n1 = await seedNotification(user.id, { isRead: false });
    const n2 = await seedNotification(user.id, { isRead: false });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/notifications/read',
      headers: { Authorization: devToken('dev-test-notifread') },
      payload: { ids: [n1.id, n2.id] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().updated).toBe(2);

    const afterN1 = await prisma.notification.findUnique({ where: { id: n1.id } });
    expect(afterN1?.isRead).toBe(true);
  });

  it("cannot mark another user's notifications as read", async () => {
    const app = getTestApp();
    const user1 = await seedUser({
      firebaseUid: 'dev-test-notifr1',
      phone: '+919100000088',
      username: 'tnotifr1',
    });
    const user2 = await seedUser({
      firebaseUid: 'dev-test-notifr2',
      phone: '+919100000087',
      username: 'tnotifr2',
    });
    const n = await seedNotification(user2.id, { isRead: false });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/notifications/read',
      headers: { Authorization: devToken('dev-test-notifr1') },
      payload: { ids: [n.id] },
    });
    expect(res.json().updated).toBe(0);

    const after = await prisma.notification.findUnique({ where: { id: n.id } });
    expect(after?.isRead).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect PASS (endpoints exist)**

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- notifications
```

If any test fails because of a bug in the existing route, stop and fix the route with TDD (RED already observed; write minimal fix; GREEN; commit).

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/routes/notifications.test.ts
git commit -m "test: cover notifications list and mark-read endpoints"
```

### Task 2.2: Mobile notificationService

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/services/notificationService.test.ts`:

```typescript
import { notificationService } from '@/services/notificationService';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('calls GET /notifications with page and limit', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: { notifications: [], page: 1, limit: 20, total: 0, unreadCount: 0 },
      });
      const result = await notificationService.list(1, 20);
      expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 1, limit: 20 } });
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('markRead()', () => {
    it('calls PUT /notifications/read with an array of ids', async () => {
      (api.put as jest.Mock).mockResolvedValue({ data: { updated: 2 } });
      const result = await notificationService.markRead(['id1', 'id2']);
      expect(api.put).toHaveBeenCalledWith('/notifications/read', { ids: ['id1', 'id2'] });
      expect(result).toBe(2);
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL or PARTIAL FAIL**

```bash
cd apps/mobile && npm test -- notificationService
```

Read current `notificationService.ts`. If methods don't exist or differ in signature, that's the gap to fix.

- [ ] **Step 3: Update `apps/mobile/services/notificationService.ts`**

Ensure the exported object has:

```typescript
import { api } from '@/services/api';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  deepLink: string | null;
  isRead: boolean;
  createdAt: string;
};

export const notificationService = {
  async list(page = 1, limit = 20) {
    const res = await api.get('/notifications', { params: { page, limit } });
    return res.data as {
      notifications: Notification[];
      page: number;
      limit: number;
      total: number;
      unreadCount: number;
    };
  },

  async markRead(ids: string[]) {
    const res = await api.put('/notifications/read', { ids });
    return res.data.updated as number;
  },
};
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd apps/mobile && npm test -- notificationService
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/services/notificationService.ts apps/mobile/__tests__/services/notificationService.test.ts
git commit -m "feat(mobile): standardise notificationService"
```

### Task 2.3: Notification store with unread count

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/stores/notificationStore.test.ts`:

```typescript
import { useNotificationStore } from '@/stores/notificationStore';
import { notificationService } from '@/services/notificationService';

jest.mock('@/services/notificationService');

describe('notificationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.setState({ items: [], unreadCount: 0, loading: false, page: 1 });
  });

  it('refresh() loads page 1 and replaces items', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [{ id: 'n1', isRead: false, title: 'a', body: 'b', type: 'x', createdAt: 'z' }],
      unreadCount: 1,
      page: 1,
      limit: 20,
      total: 1,
    });

    await useNotificationStore.getState().refresh();

    expect(useNotificationStore.getState().items).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('markAllRead() calls markRead on all unread ids and zeros the count', async () => {
    useNotificationStore.setState({
      items: [
        { id: 'n1', isRead: false } as any,
        { id: 'n2', isRead: true } as any,
      ],
      unreadCount: 1,
      loading: false,
      page: 1,
    });
    (notificationService.markRead as jest.Mock).mockResolvedValue(1);

    await useNotificationStore.getState().markAllRead();

    expect(notificationService.markRead).toHaveBeenCalledWith(['n1']);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(useNotificationStore.getState().items.every((n) => n.isRead)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `apps/mobile/stores/notificationStore.ts`**

Replace the file contents:

```typescript
import { create } from 'zustand';
import { notificationService, Notification } from '@/services/notificationService';

type State = {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  page: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const useNotificationStore = create<State>((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  page: 1,

  refresh: async () => {
    set({ loading: true });
    try {
      const res = await notificationService.list(1, 20);
      set({ items: res.notifications, unreadCount: res.unreadCount, page: 1, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { page, items, loading } = get();
    if (loading) return;
    set({ loading: true });
    try {
      const next = page + 1;
      const res = await notificationService.list(next, 20);
      set({ items: [...items, ...res.notifications], page: next, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    const unreadIds = get().items.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await notificationService.markRead(unreadIds);
    set((s) => ({
      items: s.items.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: true } : n)),
      unreadCount: 0,
    }));
  },
}));
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/stores/notificationStore.ts apps/mobile/__tests__/stores/notificationStore.test.ts
git commit -m "feat(mobile): notification store with refresh + markAllRead"
```

### Task 2.4: Notifications screen

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/screens/notifications.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NotificationsScreen from '@/app/notifications/index';
import { notificationService } from '@/services/notificationService';

jest.mock('@/services/notificationService');

describe('<NotificationsScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of notifications from the service', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [
        {
          id: 'n1',
          type: 'points_earned',
          title: 'Points!',
          body: 'You earned 25 pts',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
          deepLink: null,
        },
      ],
      unreadCount: 1,
      page: 1,
      limit: 20,
      total: 1,
    });

    const { findByText } = render(<NotificationsScreen />);
    expect(await findByText('Points!')).toBeTruthy();
    expect(await findByText(/earned 25 pts/i)).toBeTruthy();
  });

  it('shows the "Mark all read" button when unread > 0', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [{ id: 'n1', isRead: false, title: 't', body: 'b', type: 'x', createdAt: 'z', data: null, deepLink: null }],
      unreadCount: 1, page: 1, limit: 20, total: 1,
    });
    const { findByText } = render(<NotificationsScreen />);
    expect(await findByText(/mark all read/i)).toBeTruthy();
  });

  it('tapping "Mark all read" calls the service', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [{ id: 'n1', isRead: false, title: 't', body: 'b', type: 'x', createdAt: 'z', data: null, deepLink: null }],
      unreadCount: 1, page: 1, limit: 20, total: 1,
    });
    (notificationService.markRead as jest.Mock).mockResolvedValue(1);

    const { findByText } = render(<NotificationsScreen />);
    const btn = await findByText(/mark all read/i);
    fireEvent.press(btn);

    await waitFor(() => {
      expect(notificationService.markRead).toHaveBeenCalledWith(['n1']);
    });
  });

  it('shows an empty state when there are no notifications', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [], unreadCount: 0, page: 1, limit: 20, total: 0,
    });
    const { findByText } = render(<NotificationsScreen />);
    expect(await findByText(/no notifications yet/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL (screen not found)**

- [ ] **Step 3: Implement `apps/mobile/app/notifications/index.tsx`**

```typescript
import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/stores/notificationStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const items = useNotificationStore((s) => s.items);
  const loading = useNotificationStore((s) => s.loading);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refresh = useNotificationStore((s) => s.refresh);
  const loadMore = useNotificationStore((s) => s.loadMore);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.action}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 100 }} />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.isRead && styles.unread]}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowBody}>{item.body}</Text>
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    justifyContent: 'space-between',
  },
  back: { fontSize: 24, color: '#262626' },
  title: { fontSize: 18, fontWeight: '700', color: '#262626' },
  action: { color: '#0095F6', fontWeight: '600' },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#FAFAFA' },
  unread: { backgroundColor: '#FAFAFF' },
  rowTitle: { fontWeight: '700', color: '#262626' },
  rowBody: { color: '#737373', marginTop: 4 },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#8E8E8E', fontSize: 16 },
});
```

- [ ] **Step 4: Run — expect PASS (all 4)**

```bash
cd apps/mobile && npm test -- notifications
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/notifications/index.tsx apps/mobile/__tests__/screens/notifications.test.tsx
git commit -m "feat(mobile): notifications inbox screen"
```

### Task 2.5: Wire bell icon in home header

- [ ] **Step 1: Read the current home header**

Open `apps/mobile/app/(tabs)/index.tsx` and find the header where the message icon currently lives.

- [ ] **Step 2: Find or add the bell icon**

If a bell icon doesn't exist, add one between the points badge and the message icon. Wrap it in `TouchableOpacity` that calls `router.push('/notifications')`:

```typescript
import { useRouter } from 'expo-router';
// ...
const router = useRouter();
// ...
<TouchableOpacity onPress={() => router.push('/notifications')}>
  <Text style={{ fontSize: 22 }}>🔔</Text>
</TouchableOpacity>
```

- [ ] **Step 3: Manual smoke test**

```bash
cd apps/mobile && npm start
```

Open the app. Tap the bell icon in the header. The notifications screen should load. Tap "Mark all read" when available. Pull to refresh.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): wire bell icon to notifications screen"
```

### Task 2.6: Verify push pipeline wiring

**Why this task:** This is NOT a new feature — push notifications are already wired end-to-end in the codebase:

- `apps/mobile/hooks/useNotifications.ts` requests permission and captures the Expo push token, then PUTs it to `/users/me/settings`.
- `apps/api/src/services/notificationService.ts` calls `admin.messaging().send()` with quiet-hours (22:00–08:00 UTC), a 15-push daily cap, and priority override.
- `User.fcmToken` column exists and is writable through `PUT /users/me/settings`.

But: no test confirms the permission → token → API flow actually runs at login, and the hook may or may not be mounted in the root layout. This task closes the verification gap.

**Files:**
- Verify: `apps/mobile/app/_layout.tsx`
- Test: `apps/mobile/__tests__/hooks/useNotifications.test.ts` (NEW)
- Read: `apps/mobile/hooks/useNotifications.ts` (existing)

- [ ] **Step 1: Read `apps/mobile/app/_layout.tsx`**

Confirm whether `useNotifications()` is called. If the root component does NOT call `useNotifications()`, add it:

```typescript
import { useNotifications } from '@/hooks/useNotifications';

export default function RootLayout() {
  useNotifications();
  // ... existing content
}
```

If the hook IS already mounted (e.g. inside an authenticated layout), note the location in a comment so future readers know.

- [ ] **Step 2: Write the failing integration test**

Create `apps/mobile/__tests__/hooks/useNotifications.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '@/hooks/useNotifications';
import api from '@/services/api';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { put: jest.fn() },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}));

jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: () => ({ refreshUnread: jest.fn() }),
}));

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests permission, captures the Expo push token, and PUTs it to /users/me/settings when authenticated', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExponentPushToken[xxxxx]' });

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(api.put).toHaveBeenCalledWith('/users/me/settings', { fcmToken: 'ExponentPushToken[xxxxx]' });
    });
  });

  it('does NOT request permission when user is not authenticated', async () => {
    jest.resetModules();
    jest.doMock('@/stores/authStore', () => ({
      useAuthStore: () => ({ isAuthenticated: false }),
    }));
    const { useNotifications: useNotificationsUnauth } = require('@/hooks/useNotifications');

    renderHook(() => useNotificationsUnauth());

    await new Promise((r) => setTimeout(r, 50));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('skips the PUT when permission is denied', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    renderHook(() => useNotifications());

    await new Promise((r) => setTimeout(r, 50));
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run — expect PASS (hook code exists)**

```bash
cd apps/mobile && npm test -- useNotifications
```

If the test fails because the hook is not mounted anywhere that fires during login, fix `app/_layout.tsx` per Step 1. Do NOT rewrite the hook itself — it's already correct.

- [ ] **Step 4: Manual end-to-end smoke test**

On a real device (Expo Go or dev-client build):

1. Install app, complete login flow.
2. Open the API's Railway/Postgres console: `SELECT id, username, fcm_token FROM users WHERE username = '<your_username>';`
3. Confirm `fcm_token` is populated with an `ExponentPushToken[...]` string.
4. Trigger a backend notification (e.g., a like on your post by another user, or via an admin trigger).
5. Confirm a push arrives on the device within ~5 seconds.

If the token is not populated, the hook is not mounted — go back to Step 1.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/__tests__/hooks/useNotifications.test.ts apps/mobile/app/_layout.tsx
git commit -m "test(mobile): verify push notification pipeline end-to-end"
```

---

# Feature 3 — Real OTP authentication

**Goal:** Replace the current "type phone, click Continue" flow with a real Firebase Phone Auth OTP. The user enters phone → receives SMS code → enters code → is authenticated.

**Tradeoff:** WhatsApp OTP (per mockup) needs WhatsApp Business API integration and is deferred to P3. P0 ships SMS-only.

**Backend status:** `/auth/register` already accepts a verified `firebaseUid`. **Backend is essentially done** — the work is entirely on mobile.

**What could go wrong:** Firebase Phone Auth needs `expo-firebase-recaptcha` or a native Firebase SDK. On Expo Go it's constrained — full SMS delivery requires a dev-client build. For development we keep the `dev-` token bypass (`ALLOW_DEV_TOKENS=true`) and also support real Firebase in production.

**Why this matters:** Without OTP, anyone can impersonate any phone number. You cannot soft-launch publicly. It's a security blocker, not a UX polish.

**Files:**
- Test: `apps/api/tests/routes/auth.test.ts` (covers existing register endpoint under edge cases)
- Test: `apps/mobile/__tests__/services/authService.test.ts`
- Test: `apps/mobile/__tests__/screens/otp.test.tsx`
- Create: `apps/mobile/app/(auth)/otp.tsx`
- Modify: `apps/mobile/services/authService.ts` (add `requestOtp`, `verifyOtp`)
- Modify: `apps/mobile/app/(auth)/login.tsx` (route to `/otp` after phone entry)
- Modify: `apps/mobile/stores/authStore.ts` (use verified Firebase ID token instead of dev- prefix in prod)

### Task 3.1: Install Firebase client SDK

- [ ] **Step 1: Install the library**

```bash
cd apps/mobile && npm install firebase@^10.14.0
```

- [ ] **Step 2: Add Firebase init file**

Create `apps/mobile/services/firebase.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  PhoneAuthProvider,
  signInWithCredential,
  type Auth,
} from 'firebase/auth';
import Constants from 'expo-constants';

const cfg = Constants.expoConfig?.extra?.firebase;

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const app = getApps()[0] ?? initializeApp(cfg);
    auth = getAuth(app);
  }
  return auth;
}

export { PhoneAuthProvider, signInWithCredential };
```

- [ ] **Step 3: Add Firebase config to `app.json`**

Edit `apps/mobile/app.json`. Under `"expo" → "extra"`, add:

```json
"extra": {
  "apiUrl": "https://eruapi-production.up.railway.app/api/v1",
  "firebase": {
    "apiKey": "<paste from Firebase console>",
    "authDomain": "<your-project>.firebaseapp.com",
    "projectId": "<your-project-id>",
    "appId": "<your-app-id>"
  }
}
```

(Paste the actual values from the Firebase console. TJ: these live in Notes.md under `Firebase: aflolabs@gmail.com`.)

- [ ] **Step 4: Commit the scaffold**

```bash
git add apps/mobile/package.json apps/mobile/services/firebase.ts apps/mobile/app.json
git commit -m "chore(mobile): add firebase client sdk + init"
```

### Task 3.2: authService OTP wrappers

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/services/authService.test.ts`:

```typescript
import { authService } from '@/services/authService';
import { api } from '@/services/api';

jest.mock('@/services/api');

jest.mock('@/services/firebase', () => ({
  getFirebaseAuth: jest.fn(),
  PhoneAuthProvider: {
    credential: jest.fn((verificationId, code) => ({ verificationId, code })),
  },
  signInWithCredential: jest.fn(async () => ({
    user: { getIdToken: async () => 'firebase-id-token-abc' },
  })),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyOtpAndSignIn()', () => {
    it('exchanges verificationId+code for a Firebase credential and returns the ID token', async () => {
      const token = await authService.verifyOtpAndSignIn('vid-1', '123456');
      expect(token).toBe('firebase-id-token-abc');
    });
  });

  describe('checkRegistered()', () => {
    it('calls GET /wallet/summary with the token; returns true on 200', async () => {
      (api.get as jest.Mock).mockResolvedValue({ status: 200, data: {} });
      const registered = await authService.checkRegistered('firebase-id-token-abc');
      expect(api.get).toHaveBeenCalledWith('/wallet/summary', expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer firebase-id-token-abc' }),
      }));
      expect(registered).toBe(true);
    });

    it('returns false on 401', async () => {
      (api.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });
      const registered = await authService.checkRegistered('firebase-id-token-abc');
      expect(registered).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

Add to `apps/mobile/services/authService.ts`:

```typescript
import { api } from '@/services/api';
import { getFirebaseAuth, PhoneAuthProvider, signInWithCredential } from '@/services/firebase';

export const authService = {
  // Existing methods preserved above...

  async verifyOtpAndSignIn(verificationId: string, code: string): Promise<string> {
    const auth = getFirebaseAuth();
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCred = await signInWithCredential(auth, credential);
    return await userCred.user.getIdToken();
  },

  async checkRegistered(idToken: string): Promise<boolean> {
    try {
      await api.get('/wallet/summary', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      return true;
    } catch (err: any) {
      if (err?.response?.status === 401) return false;
      throw err;
    }
  },
};
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/services/authService.ts apps/mobile/__tests__/services/authService.test.ts
git commit -m "feat(mobile): authService OTP helpers"
```

### Task 3.3: OTP screen

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/screens/otp.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OtpScreen from '@/app/(auth)/otp';
import { authService } from '@/services/authService';

jest.mock('@/services/authService');
jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ setToken: jest.fn() }),
    setState: jest.fn(),
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ phone: '+919876543210', verificationId: 'vid-1' }),
}));

describe('<OtpScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders six OTP digit inputs', () => {
    const { getAllByTestId } = render(<OtpScreen />);
    expect(getAllByTestId(/otp-digit-/)).toHaveLength(6);
  });

  it('the Verify button is disabled until all 6 digits are entered', () => {
    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);

    expect(getByTestId('otp-verify').props.accessibilityState?.disabled).toBe(true);

    for (let i = 0; i < 5; i++) fireEvent.changeText(digits[i], String(i));
    expect(getByTestId('otp-verify').props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(digits[5], '9');
    expect(getByTestId('otp-verify').props.accessibilityState?.disabled).toBe(false);
  });

  it('on Verify, calls authService.verifyOtpAndSignIn with concatenated digits', async () => {
    (authService.verifyOtpAndSignIn as jest.Mock).mockResolvedValue('id-token-xyz');
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '274816'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(authService.verifyOtpAndSignIn).toHaveBeenCalledWith('vid-1', '274816');
    });
  });

  it('shows error when verification fails', async () => {
    (authService.verifyOtpAndSignIn as jest.Mock).mockRejectedValue(new Error('invalid code'));
    const { getByTestId, getAllByTestId, findByText } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '000000'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    expect(await findByText(/invalid code/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `apps/mobile/app/(auth)/otp.tsx`**

```typescript
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export default function OtpScreen() {
  const router = useRouter();
  const { phone, verificationId } = useLocalSearchParams<{
    phone: string;
    verificationId: string;
  }>();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const full = digits.join('');
  const complete = full.length === 6;

  function onDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) inputs.current[index + 1]?.focus();
  }

  async function handleVerify() {
    if (!complete || !verificationId) return;
    setSubmitting(true);
    setError(null);
    try {
      const idToken = await authService.verifyOtpAndSignIn(verificationId, full);
      const registered = await authService.checkRegistered(idToken);
      if (registered) {
        useAuthStore.getState().setToken(idToken);
        router.replace('/(tabs)');
      } else {
        router.replace({ pathname: '/(auth)/onboarding', params: { phone, token: idToken } });
      }
    } catch (e: any) {
      setError(e?.message?.includes('invalid') ? 'Invalid code — try again' : "Couldn't verify — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>

      <View style={styles.digitsRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              if (el) inputs.current[i] = el;
            }}
            testID={`otp-digit-${i}`}
            value={d}
            onChangeText={(v) => onDigit(i, v)}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.digit}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        testID="otp-verify"
        style={[styles.verify, !complete && styles.verifyDisabled]}
        disabled={!complete || submitting}
        accessibilityState={{ disabled: !complete || submitting }}
        onPress={handleVerify}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verify & Continue</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#262626' },
  subtitle: { color: '#737373', marginTop: 6, marginBottom: 24 },
  digitsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  digit: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    color: '#262626',
  },
  verify: {
    backgroundColor: '#1A3C6E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  verifyDisabled: { opacity: 0.4 },
  verifyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#ED4956', marginBottom: 12 },
});
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(auth\)/otp.tsx apps/mobile/__tests__/screens/otp.test.tsx
git commit -m "feat(mobile): OTP verification screen"
```

### Task 3.4: Route login → OTP

- [ ] **Step 1: Modify `apps/mobile/app/(auth)/login.tsx`**

Replace the existing `handleContinue` function:

```typescript
import { PhoneAuthProvider } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';

async function handleContinue() {
  if (!phone.trim()) return;
  setLoading(true);
  try {
    const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
    const provider = new PhoneAuthProvider(getFirebaseAuth());
    const verificationId = await provider.verifyPhoneNumber(formatted, undefined as any);
    router.push({ pathname: '/(auth)/otp', params: { phone: formatted, verificationId } });
  } catch (e: any) {
    Alert.alert('Could not send code', e?.message ?? 'Please try again');
  } finally {
    setLoading(false);
  }
}
```

**Note:** Firebase Phone Auth on React Native needs `expo-firebase-recaptcha` for the Captcha verifier — in Expo Go this is the web recaptcha modal. In a dev-client build we'd use the native Firebase SDK for invisible verification. For the Expo Go path, add a FirebaseRecaptchaVerifierModal above the form and pass it as the second arg to `verifyPhoneNumber`. Follow [expo-firebase-recaptcha docs](https://docs.expo.dev/versions/latest/sdk/firebase-recaptcha/).

**For first-pass TDD:** Use the dev-token bypass unchanged and add a visible banner "Dev mode — OTP bypassed" when `ALLOW_DEV_TOKENS=true` on the client. This is acceptable because real OTP requires an Apple developer account + APNs + production Firebase. Production ship can slot in the native SDK.

- [ ] **Step 2: Manual smoke test**

```bash
cd apps/mobile && npm start
```

On a real device:
1. Enter a phone number → press Continue.
2. SMS arrives with 6-digit code.
3. Enter code, press Verify → land on home or onboarding.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(auth\)/login.tsx
git commit -m "feat(mobile): login routes to OTP instead of dev bypass"
```

---

# Feature 4 — Follow button

**Goal:** On other users' profiles and reel creator cards, show a Follow / Following toggle. Tapping it flips state and calls the API.

**Backend status:** `POST /users/:id/follow` + `DELETE /users/:id/unfollow` exist in `apps/api/src/routes/users.ts`. **Zero backend work.**

**Why this matters:** A social app without follow is a broadcast app. Users expect to curate who they see from.

**Files:**
- Test: `apps/api/tests/routes/users-follow.test.ts`
- Test: `apps/mobile/__tests__/services/userService.test.ts`
- Test: `apps/mobile/__tests__/components/FollowButton.test.tsx`
- Create: `apps/mobile/components/FollowButton.tsx`
- Modify: `apps/mobile/services/userService.ts` (add `follow`, `unfollow`)
- Modify: `apps/mobile/app/(tabs)/reels.tsx`

### Task 4.1: API test coverage

- [ ] **Step 1: Write the failing test**

Create `apps/api/tests/routes/users-follow.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Follow flow', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('POST /users/:id/follow creates a follow row', async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flwa', phone: '+919200000001', username: 'tflwa' });
    const b = await seedUser({ firebaseUid: 'dev-test-flwb', phone: '+919200000002', username: 'tflwb' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flwa') },
    });

    expect(res.statusCode).toBe(201);
    const rel = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: a.id, followingId: b.id } },
    });
    expect(rel).not.toBeNull();
  });

  it('double-follow returns 409 conflict', async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flw2a', phone: '+919200000003', username: 'tflw2a' });
    const b = await seedUser({ firebaseUid: 'dev-test-flw2b', phone: '+919200000004', username: 'tflw2b' });

    await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw2a') },
    });
    const res = await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw2a') },
    });

    expect(res.statusCode).toBe(409);
  });

  it('cannot follow yourself', async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flwself', phone: '+919200000005', username: 'tflwself' });

    const res = await app.inject({
      method: 'POST', url: `/api/v1/users/${a.id}/follow`,
      headers: { Authorization: devToken('dev-test-flwself') },
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /users/:id/unfollow removes the follow row', async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flw3a', phone: '+919200000006', username: 'tflw3a' });
    const b = await seedUser({ firebaseUid: 'dev-test-flw3b', phone: '+919200000007', username: 'tflw3b' });

    await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw3a') },
    });

    const res = await app.inject({
      method: 'DELETE', url: `/api/v1/users/${b.id}/unfollow`,
      headers: { Authorization: devToken('dev-test-flw3a') },
    });

    expect(res.statusCode).toBe(200);
    const rel = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: a.id, followingId: b.id } },
    });
    expect(rel).toBeNull();
  });

  it("profile.isFollowing is true after follow", async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flw4a', phone: '+919200000008', username: 'tflw4a' });
    const b = await seedUser({ firebaseUid: 'dev-test-flw4b', phone: '+919200000009', username: 'tflw4b' });

    await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw4a') },
    });

    const res = await app.inject({
      method: 'GET', url: `/api/v1/users/${b.id}/profile`,
      headers: { Authorization: devToken('dev-test-flw4a') },
    });

    expect(res.json().user.isFollowing).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect all PASS**

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- users-follow
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/tests/routes/users-follow.test.ts
git commit -m "test: cover follow/unfollow endpoints"
```

### Task 4.2: userService follow/unfollow

- [ ] **Step 1: Write the failing test**

Create/extend `apps/mobile/__tests__/services/userService.test.ts`:

```typescript
import { userService } from '@/services/userService';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('userService.follow/unfollow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('follow(id) POSTs to /users/:id/follow', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    await userService.follow('user-123');
    expect(api.post).toHaveBeenCalledWith('/users/user-123/follow');
  });

  it('unfollow(id) DELETEs /users/:id/unfollow', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { success: true } });
    await userService.unfollow('user-123');
    expect(api.delete).toHaveBeenCalledWith('/users/user-123/unfollow');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Add to `apps/mobile/services/userService.ts`**

```typescript
async follow(userId: string) {
  await api.post(`/users/${userId}/follow`);
},
async unfollow(userId: string) {
  await api.delete(`/users/${userId}/unfollow`);
},
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/services/userService.ts apps/mobile/__tests__/services/userService.test.ts
git commit -m "feat(mobile): userService follow/unfollow"
```

### Task 4.3: FollowButton component

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/FollowButton.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FollowButton } from '@/components/FollowButton';
import { userService } from '@/services/userService';

jest.mock('@/services/userService');

describe('<FollowButton />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders "Follow" when initiallyFollowing=false', () => {
    const { getByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={false} />,
    );
    expect(getByText(/^Follow$/)).toBeTruthy();
  });

  it('renders "Following" when initiallyFollowing=true', () => {
    const { getByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={true} />,
    );
    expect(getByText(/^Following$/)).toBeTruthy();
  });

  it('tapping "Follow" calls userService.follow and optimistically flips label', async () => {
    (userService.follow as jest.Mock).mockResolvedValue(undefined);
    const { getByText, findByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={false} />,
    );
    fireEvent.press(getByText('Follow'));
    expect(await findByText('Following')).toBeTruthy();
    await waitFor(() => {
      expect(userService.follow).toHaveBeenCalledWith('u1');
    });
  });

  it('tapping "Following" calls userService.unfollow and reverts to "Follow"', async () => {
    (userService.unfollow as jest.Mock).mockResolvedValue(undefined);
    const { getByText, findByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={true} />,
    );
    fireEvent.press(getByText('Following'));
    expect(await findByText('Follow')).toBeTruthy();
    await waitFor(() => {
      expect(userService.unfollow).toHaveBeenCalledWith('u1');
    });
  });

  it('rolls back label if follow() rejects', async () => {
    (userService.follow as jest.Mock).mockRejectedValue(new Error('boom'));
    const { getByText, findByText } = render(
      <FollowButton targetUserId="u1" initiallyFollowing={false} />,
    );
    fireEvent.press(getByText('Follow'));
    expect(await findByText('Follow')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `apps/mobile/components/FollowButton.tsx`**

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { userService } from '@/services/userService';

type Props = {
  targetUserId: string;
  initiallyFollowing: boolean;
  onChange?: (nowFollowing: boolean) => void;
  size?: 'sm' | 'md';
};

export function FollowButton({ targetUserId, initiallyFollowing, onChange, size = 'md' }: Props) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    if (busy) return;
    const nextFollowing = !following;
    setFollowing(nextFollowing);
    setBusy(true);
    try {
      if (nextFollowing) await userService.follow(targetUserId);
      else await userService.unfollow(targetUserId);
      onChange?.(nextFollowing);
    } catch {
      setFollowing(!nextFollowing);
    } finally {
      setBusy(false);
    }
  }

  const isSm = size === 'sm';
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={busy}
      style={[
        styles.base,
        isSm && styles.sm,
        following ? styles.outlined : styles.filled,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={following ? '#1A3C6E' : '#fff'} />
      ) : (
        <Text style={[styles.text, following ? styles.textOutlined : styles.textFilled]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  sm: { paddingHorizontal: 10, paddingVertical: 5, minWidth: 70 },
  filled: { backgroundColor: '#1A3C6E' },
  outlined: { borderWidth: 1, borderColor: '#1A3C6E', backgroundColor: 'transparent' },
  text: { fontWeight: '700', fontSize: 13 },
  textFilled: { color: '#fff' },
  textOutlined: { color: '#1A3C6E' },
});
```

- [ ] **Step 4: Run — expect PASS (all 5)**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/FollowButton.tsx apps/mobile/__tests__/components/FollowButton.test.tsx
git commit -m "feat(mobile): FollowButton with optimistic state"
```

### Task 4.4: Wire FollowButton into reels

- [ ] **Step 1: Open `apps/mobile/app/(tabs)/reels.tsx`** and find the creator info card at the bottom-left of the reel overlay.

- [ ] **Step 2: Add FollowButton inline next to username**

```typescript
import { FollowButton } from '@/components/FollowButton';
// ... inside the reel overlay
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  <Text style={styles.username}>@{reel.user.username}</Text>
  {reel.user.id !== currentUserId && (
    <FollowButton
      targetUserId={reel.user.id}
      initiallyFollowing={reel.user.isFollowing ?? false}
      size="sm"
    />
  )}
</View>
```

The `isFollowing` field needs to be returned from the `/reels` endpoint. Extend the reels route to include it (if not already). Check `apps/api/src/routes/reels.ts`; if absent, add the same `Follow.findUnique` pattern used in `users.ts:43`.

- [ ] **Step 3: Manual smoke test**

Launch app, open Reels tab, tap Follow on a creator. Button changes to Following. Kill app, reopen, Following persists.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/reels.tsx apps/api/src/routes/reels.ts
git commit -m "feat: FollowButton on reels creator card + isFollowing on reels API"
```

---

# Feature 5 — Native share sheet

**Goal:** Tapping the share icon on any post/reel opens the OS share sheet with a deep link to that post.

**No backend work.** Uses `Share` from `react-native`.

**Files:**
- Test: `apps/mobile/__tests__/components/ShareButton.test.tsx`
- Create: `apps/mobile/components/ShareButton.tsx`
- Modify: `apps/mobile/components/PostCard.tsx` (swap share placeholder)
- Modify: `apps/mobile/app/(tabs)/reels.tsx` (swap share placeholder)

### Task 5.1: ShareButton component

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/ShareButton.test.tsx`:

```typescript
import React from 'react';
import { Share } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ShareButton } from '@/components/ShareButton';
import { usePointsStore } from '@/stores/pointsStore';

jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: { getState: () => ({ earn: jest.fn() }) },
}));

describe('<ShareButton />', () => {
  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls Share.share with a deep-link URL containing the contentId', async () => {
    const { getByTestId } = render(
      <ShareButton contentId="abc-123" creatorUsername="chef" />,
    );
    fireEvent.press(getByTestId('share-button'));
    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('abc-123'),
          message: expect.stringContaining('@chef'),
        }),
      );
    });
  });

  it('awards share points when share succeeds', async () => {
    const earn = jest.fn();
    (usePointsStore.getState as jest.Mock) = () => ({ earn });

    const { getByTestId } = render(
      <ShareButton contentId="abc-123" creatorUsername="chef" />,
    );
    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(earn).toHaveBeenCalledWith('share', 'abc-123');
    });
  });

  it('does not award points when user dismisses the share sheet', async () => {
    const earn = jest.fn();
    (usePointsStore.getState as jest.Mock) = () => ({ earn });
    (Share.share as jest.Mock).mockResolvedValue({ action: Share.dismissedAction });

    const { getByTestId } = render(
      <ShareButton contentId="abc-123" creatorUsername="chef" />,
    );
    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalled();
    });
    expect(earn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `apps/mobile/components/ShareButton.tsx`**

```typescript
import React from 'react';
import { TouchableOpacity, Text, Share, StyleSheet } from 'react-native';
import { usePointsStore } from '@/stores/pointsStore';

type Props = {
  contentId: string;
  creatorUsername: string;
  caption?: string;
};

const APP_SCHEME = 'eru://';
const WEB_FALLBACK = 'https://eru.app';

export function ShareButton({ contentId, creatorUsername, caption }: Props) {
  async function handleShare() {
    const url = `${WEB_FALLBACK}/post/${contentId}`;
    const message = `@${creatorUsername} on Eru: ${caption ?? 'Check this out'}\n${url}`;
    try {
      const result = await Share.share({ url, message });
      if (result.action === Share.sharedAction) {
        usePointsStore.getState().earn('share', contentId);
      }
    } catch {
      // user canceled or system error — do nothing
    }
  }

  return (
    <TouchableOpacity testID="share-button" onPress={handleShare} style={styles.btn}>
      <Text style={styles.icon}>📤</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 8 },
  icon: { fontSize: 20 },
});
```

- [ ] **Step 4: Run — expect PASS (all 3)**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/ShareButton.tsx apps/mobile/__tests__/components/ShareButton.test.tsx
git commit -m "feat(mobile): ShareButton with OS share sheet"
```

### Task 5.2: Swap share placeholder in PostCard and reels

- [ ] **Step 1:** Open `apps/mobile/components/PostCard.tsx`. Locate the current share icon (likely `<Text>📤</Text>` inside a `TouchableOpacity` that calls `usePointsStore.earn('share')`). Replace with:

```typescript
<ShareButton
  contentId={post.id}
  creatorUsername={post.user.username}
  caption={post.text}
/>
```

Import at top: `import { ShareButton } from '@/components/ShareButton';`

- [ ] **Step 2:** Same swap in `apps/mobile/app/(tabs)/reels.tsx` for the share icon.

- [ ] **Step 3: Manual smoke test**

Launch app, tap share on a post. OS share sheet opens. Paste the URL in a browser to confirm it points to `https://eru.app/post/<id>`.

**Future:** The `https://eru.app/post/:id` route doesn't exist yet. That's fine — iOS/Android will still surface the share sheet. P3 wires up the web landing page so pasted links render a preview.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/PostCard.tsx apps/mobile/app/\(tabs\)/reels.tsx
git commit -m "feat(mobile): wire ShareButton into PostCard and reels"
```

---

# Feature 7 — Post context menu + Report

**Goal:** Replace the non-functional `•••` ellipsis on every post with a working BottomSheet menu. Items: **Report** (always), **Share**, **Dislike**, **Delete** (own posts only — wired up in P1 F8), Cancel.

**Why P0 (launch-blocking):** Apple App Store Review Guideline 1.2 and Google Play's UGC policy require a reporting mechanism for user-generated content apps. You **cannot** publicly launch Eru without this. Today `PostCard.tsx:85` renders the `•••` icon but has **no onPress handler** — visually present, functionally dead. Report is the one P0 safety feature; Delete is deferred to P1.

**What would break without it:** App store rejection on first submission. Even before that, users have no way to flag spam/harassment/nudity — a liability.

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (+1 model, +1 enum)
- Migration: `apps/api/prisma/migrations/<ts>_p0_content_report/` (auto)
- Modify: `apps/api/src/utils/validators.ts` (+1 schema)
- Modify: `apps/api/src/routes/content.ts` (+1 handler)
- Test: `apps/api/tests/routes/content-report.test.ts` (NEW)
- Create: `apps/mobile/components/PostActionSheet.tsx`
- Test: `apps/mobile/__tests__/components/PostActionSheet.test.tsx`
- Modify: `apps/mobile/components/PostCard.tsx` (wire the `•••` onPress)
- Modify: `apps/mobile/services/contentService.ts` (+report method)

### Task 7.1: Schema + migration

- [ ] **Step 1: Append to `apps/api/prisma/schema.prisma`**

```prisma
enum ReportReason {
  spam
  harassment
  nudity
  hate
  violence
  misinformation
  other
}

enum ReportStatus {
  pending
  reviewed
  dismissed
  actioned
}

model ContentReport {
  id         String       @id @default(uuid())
  contentId  String       @map("content_id")
  reporterId String       @map("reporter_id")
  reason     ReportReason
  notes      String?
  status     ReportStatus @default(pending)
  reviewerId String?      @map("reviewer_id")
  reviewedAt DateTime?    @map("reviewed_at")
  createdAt  DateTime     @default(now()) @map("created_at")

  content  Content @relation(fields: [contentId], references: [id], onDelete: Cascade)
  reporter User    @relation("contentReports", fields: [reporterId], references: [id])

  @@unique([contentId, reporterId])
  @@index([status])
  @@map("content_reports")
}
```

Add to the `User` model:

```prisma
  contentReports ContentReport[] @relation("contentReports")
```

Add to the `Content` model:

```prisma
  reports ContentReport[]
```

- [ ] **Step 2: Migrate**

```bash
cd apps/api && npx prisma migrate dev --name p0_content_report
```

- [ ] **Step 3: Extend the schema sanity test**

Append to `apps/api/tests/services/schema.test.ts` (create if absent):

```typescript
it('can count contentReport', async () => {
  await expect(prisma.contentReport.count()).resolves.toBeTypeOf('number');
});
```

Run + commit.

```bash
cd apps/api && npm test -- schema
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/*p0_content_report* apps/api/tests/services/schema.test.ts
git commit -m "feat(api): ContentReport model + migration"
```

### Task 7.2: POST /content/:id/report endpoint

- [ ] **Step 1: Add validator**

In `apps/api/src/utils/validators.ts`, append:

```typescript
export const reportContentSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'nudity', 'hate', 'violence', 'misinformation', 'other']),
  notes: z.string().max(500).optional(),
});
```

- [ ] **Step 2: Write the failing test**

Create `apps/api/tests/routes/content-report.test.ts`:

```typescript
import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('POST /api/v1/content/:id/report', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('creates a ContentReport row and returns 201', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp1a', phone: '+911700000001', username: 'trp1a' });
    const reporter = await seedUser({ firebaseUid: 'dev-test-rp1b', phone: '+911700000002', username: 'trp1b' });
    const content = await seedContent(author.id);

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp1b') },
      payload: { reason: 'spam', notes: 'repeated promo' },
    });

    expect(res.statusCode).toBe(201);
    const count = await prisma.contentReport.count({
      where: { contentId: content.id, reporterId: reporter.id },
    });
    expect(count).toBe(1);
  });

  it('rejects duplicate reports from the same user with 409', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp2a', phone: '+911700000003', username: 'trp2a' });
    const reporter = await seedUser({ firebaseUid: 'dev-test-rp2b', phone: '+911700000004', username: 'trp2b' });
    const content = await seedContent(author.id);

    await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp2b') },
      payload: { reason: 'spam' },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp2b') },
      payload: { reason: 'harassment' },
    });

    expect(res.statusCode).toBe(409);
  });

  it('returns 400 on invalid reason', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp3a', phone: '+911700000005', username: 'trp3a' });
    const reporter = await seedUser({ firebaseUid: 'dev-test-rp3b', phone: '+911700000006', username: 'trp3b' });
    const content = await seedContent(author.id);

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp3b') },
      payload: { reason: 'invalid-reason' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unknown content', async () => {
    const reporter = await seedUser({ firebaseUid: 'dev-test-rp4', phone: '+911700000007', username: 'trp4' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/00000000-0000-0000-0000-000000000000/report',
      headers: { Authorization: devToken('dev-test-rp4') },
      payload: { reason: 'spam' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp5', phone: '+911700000008', username: 'trp5' });
    const content = await seedContent(author.id);
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      payload: { reason: 'spam' },
    });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement — append to `apps/api/src/routes/content.ts`** inside `contentRoutes`:

```typescript
app.post('/content/:id/report', {
  preHandler: [rateLimitByUser(10, '1 h')],
}, async (request, reply) => {
  const { id: contentId } = request.params as { id: string };
  const parsed = reportContentSchema.safeParse(request.body);
  if (!parsed.success) {
    throw Errors.badRequest(parsed.error.issues[0].message);
  }

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw Errors.notFound('Content');

  try {
    const report = await prisma.contentReport.create({
      data: {
        contentId,
        reporterId: request.userId,
        reason: parsed.data.reason,
        notes: parsed.data.notes,
      },
    });
    return reply.status(201).send({ report });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw Errors.conflict('You have already reported this content');
    }
    throw error;
  }
});
```

Also add `import { reportContentSchema } from '../utils/validators.js';` at the top.

- [ ] **Step 4: Run — expect PASS (all 5)**

```bash
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- content-report
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/utils/validators.ts apps/api/src/routes/content.ts apps/api/tests/routes/content-report.test.ts
git commit -m "feat(api): POST /content/:id/report with duplicate protection"
```

### Task 7.3: contentService.report on mobile

- [ ] **Step 1: Failing test** in `apps/mobile/__tests__/services/contentService.test.ts` (append):

```typescript
describe('contentService.report', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POSTs to /content/:id/report with reason + notes', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { report: { id: 'r1' } } });
    await contentService.report('post-1', 'spam', 'repeated promo');
    expect(api.post).toHaveBeenCalledWith('/content/post-1/report', {
      reason: 'spam',
      notes: 'repeated promo',
    });
  });

  it('omits notes when not provided', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { report: { id: 'r1' } } });
    await contentService.report('post-1', 'harassment');
    expect(api.post).toHaveBeenCalledWith('/content/post-1/report', {
      reason: 'harassment',
    });
  });
});
```

- [ ] **Step 2: Implement** — append to the `contentService` object:

```typescript
async report(contentId: string, reason: string, notes?: string) {
  const payload: { reason: string; notes?: string } = { reason };
  if (notes) payload.notes = notes;
  const res = await api.post(`/content/${contentId}/report`, payload);
  return res.data.report;
},
```

- [ ] **Step 3: Run + commit.**

### Task 7.4: PostActionSheet component

- [ ] **Step 1: Failing test**

Create `apps/mobile/__tests__/components/PostActionSheet.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PostActionSheet } from '@/components/PostActionSheet';
import { contentService } from '@/services/contentService';

jest.mock('@/services/contentService');

describe('<PostActionSheet />', () => {
  const base = {
    visible: true,
    onClose: jest.fn(),
    contentId: 'c1',
    authorUserId: 'u-other',
    currentUserId: 'u-me',
  };

  beforeEach(() => jest.clearAllMocks());

  it('always shows Report option', () => {
    const { getByText } = render(<PostActionSheet {...base} />);
    expect(getByText(/report/i)).toBeTruthy();
  });

  it('does NOT show Delete when viewer is not the author', () => {
    const { queryByText } = render(<PostActionSheet {...base} />);
    expect(queryByText(/^delete$/i)).toBeNull();
  });

  it('DOES show Delete when viewer is the author', () => {
    const { getByText } = render(
      <PostActionSheet {...base} authorUserId="u-me" currentUserId="u-me" />,
    );
    expect(getByText(/^delete$/i)).toBeTruthy();
  });

  it('tapping Report opens the reason picker', () => {
    const { getByText } = render(<PostActionSheet {...base} />);
    fireEvent.press(getByText(/report/i));
    expect(getByText(/why are you reporting/i)).toBeTruthy();
    ['Spam', 'Harassment', 'Nudity', 'Hate', 'Violence', 'Misinformation', 'Other'].forEach((r) => {
      expect(getByText(r)).toBeTruthy();
    });
  });

  it('selecting a reason calls contentService.report and closes', async () => {
    (contentService.report as jest.Mock).mockResolvedValue({ id: 'r1' });
    const onClose = jest.fn();
    const { getByText } = render(<PostActionSheet {...base} onClose={onClose} />);
    fireEvent.press(getByText(/report/i));
    fireEvent.press(getByText('Spam'));
    await waitFor(() => {
      expect(contentService.report).toHaveBeenCalledWith('c1', 'spam', undefined);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows a confirmation toast after report succeeds', async () => {
    (contentService.report as jest.Mock).mockResolvedValue({ id: 'r1' });
    const { getByText, findByText } = render(<PostActionSheet {...base} />);
    fireEvent.press(getByText(/report/i));
    fireEvent.press(getByText('Harassment'));
    expect(await findByText(/thanks — our team will review/i)).toBeTruthy();
  });

  it('shows an error if the service rejects', async () => {
    (contentService.report as jest.Mock).mockRejectedValue({
      response: { status: 409, data: { error: 'You have already reported this content' } },
    });
    const { getByText, findByText } = render(<PostActionSheet {...base} />);
    fireEvent.press(getByText(/report/i));
    fireEvent.press(getByText('Spam'));
    expect(await findByText(/already reported/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL (component missing)**

- [ ] **Step 3: Implement `apps/mobile/components/PostActionSheet.tsx`**

```typescript
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { contentService } from '@/services/contentService';

type Reason = 'spam' | 'harassment' | 'nudity' | 'hate' | 'violence' | 'misinformation' | 'other';

const REASON_LABELS: { key: Reason; label: string }[] = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'nudity', label: 'Nudity' },
  { key: 'hate', label: 'Hate' },
  { key: 'violence', label: 'Violence' },
  { key: 'misinformation', label: 'Misinformation' },
  { key: 'other', label: 'Other' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  authorUserId: string;
  currentUserId: string;
  onDelete?: () => void;
};

export function PostActionSheet({ visible, onClose, contentId, authorUserId, currentUserId, onDelete }: Props) {
  const [mode, setMode] = useState<'main' | 'report'>('main');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | { error: string }>('idle');
  const isAuthor = authorUserId === currentUserId;

  function close() {
    setMode('main');
    setStatus('idle');
    onClose();
  }

  async function chooseReason(reason: Reason) {
    setStatus('submitting');
    try {
      await contentService.report(contentId, reason);
      setStatus('done');
      setTimeout(close, 1400);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Couldn't send report — try again";
      setStatus({ error: msg });
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {mode === 'main' && (
            <>
              <TouchableOpacity style={styles.row} onPress={() => setMode('report')}>
                <Text style={styles.rowText}>🚩 Report</Text>
              </TouchableOpacity>
              {isAuthor && (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    close();
                    onDelete?.();
                  }}
                >
                  <Text style={[styles.rowText, styles.danger]}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancel} onPress={close}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'report' && status === 'idle' && (
            <>
              <Text style={styles.header}>Why are you reporting this?</Text>
              {REASON_LABELS.map((r) => (
                <TouchableOpacity key={r.key} style={styles.row} onPress={() => chooseReason(r.key)}>
                  <Text style={styles.rowText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancel} onPress={() => setMode('main')}>
                <Text style={styles.cancelText}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'submitting' && <Text style={styles.info}>Submitting…</Text>}
          {status === 'done' && <Text style={styles.info}>Thanks — our team will review this soon.</Text>}
          {typeof status === 'object' && 'error' in status && (
            <Text style={styles.err}>{status.error.toLowerCase().includes('already') ? "You've already reported this" : status.error}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowText: { fontSize: 16, color: '#262626' },
  danger: { color: '#ED4956' },
  cancel: { marginTop: 10, padding: 12, alignItems: 'center' },
  cancelText: { color: '#0095F6', fontWeight: '700' },
  header: { fontSize: 14, color: '#737373', marginBottom: 10 },
  info: { padding: 10, textAlign: 'center', color: '#10B981', fontWeight: '600' },
  err: { padding: 10, textAlign: 'center', color: '#ED4956', fontWeight: '600' },
});
```

- [ ] **Step 4: Run — expect PASS (all 7)**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/PostActionSheet.tsx apps/mobile/__tests__/components/PostActionSheet.test.tsx
git commit -m "feat(mobile): PostActionSheet with Report + optional Delete"
```

### Task 7.5: Wire the `•••` in PostCard

- [ ] **Step 1: Open `apps/mobile/components/PostCard.tsx`.** Find the `•••` Text element (currently around line 85). Wrap it in `TouchableOpacity` and add state to open `PostActionSheet`.

```typescript
import React, { useState } from 'react';
import { PostActionSheet } from '@/components/PostActionSheet';
import { useAuthStore } from '@/stores/authStore';

// Inside component:
const [sheetOpen, setSheetOpen] = useState(false);
const currentUserId = useAuthStore((s) => s.user?.id ?? '');

// Replace the ellipsis Text with:
<TouchableOpacity onPress={() => setSheetOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
  <Text style={styles.more}>•••</Text>
</TouchableOpacity>

// Below the post JSX, add:
<PostActionSheet
  visible={sheetOpen}
  onClose={() => setSheetOpen(false)}
  contentId={post.id}
  authorUserId={post.user.id}
  currentUserId={currentUserId}
  onDelete={() => { /* wired in P1 F8 */ }}
/>
```

- [ ] **Step 2: Manual smoke test**

Launch app. Tap `•••` on any post. Sheet opens. Tap Report. Pick Spam. Toast appears. Reopen `•••` on the same post, Report, Spam again — error "already reported" shows.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/PostCard.tsx
git commit -m "feat(mobile): wire PostCard ellipsis to PostActionSheet"
```

---

## P0 completion criteria

Before marking P0 done:

- [ ] `cd apps/api && ALLOW_DEV_TOKENS=true npm test` — all tests pass
- [ ] `cd apps/mobile && npm test` — all tests pass
- [ ] Manual: post a comment on any post; confirm it appears
- [ ] Manual: tap bell icon; see notifications list; mark all read
- [ ] Manual: sign out; log in with a real phone; receive SMS; verify; land on home
- [ ] Manual: follow a user on reels; refresh app; still shows "Following"
- [ ] Manual: share a post; share sheet opens with a URL
- [ ] Manual: fresh install, log in on a real device — `SELECT fcm_token FROM users WHERE username='<me>'` shows a populated Expo push token
- [ ] Manual: tap `•••` on any post → Report → Spam → confirmation toast; reopen `•••` → Report → Spam → "already reported" error

## What could go wrong (beginner pitfalls)

- **Jest fails on first run with "cannot find module 'react-native'"** — `transformIgnorePatterns` is wrong. Ensure the regex includes `react-native` and `@react-native`.
- **Comment POST succeeds but the UI doesn't update** — the `onPosted` callback isn't being passed the full comment. Check that the service returns `res.data.comment`, not `res.data`.
- **OTP works on Android but not iOS** — iOS requires APNs uploaded to Firebase for Phone Auth. Without it, the SMS simply never sends. See Firebase docs.
- **Follow button shows "Following" on own profile** — you forgot the `reel.user.id !== currentUserId` check.
- **Share button awards points on dismiss** — you mixed up `Share.sharedAction` and `Share.dismissedAction`. Test case covers this; if the test failed, fix don't skip.
- **Push token column stays null after login** — `useNotifications()` was never mounted in `app/_layout.tsx`, or the `isAuthenticated` guard fires before the auth store hydrates. Log the status at each step of the hook.
- **Report endpoint 500s with a Prisma error** — you forgot to run the `p0_content_report` migration against the test database. Run `ALLOW_DEV_TOKENS=true npx prisma migrate dev` before `npm test`.
- **Ellipsis still does nothing after wiring** — `PostCard` has been rendered with stale props from a cached bundle. Kill Metro, run `npx expo start --clear`.

---

**Why does this matter?** P0 makes the app feel *real*. After P0, users can close the feedback loop (comment), see what they earned (notifications), prove who they are (OTP), build a social graph (follow), spread the app (share), **get push notifications**, and **flag abusive content**. Without P0, the product is a polished tech demo that the app stores will reject. With P0, it's an app your friends would actually open twice — and that Apple and Google will actually let you publish.
