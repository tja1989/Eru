# GapFix P4 — Foundations for Pixel Parity

> **For agentic workers:** Required reading before starting: [`GapFix_Agent_Protocol.md`](./GapFix_Agent_Protocol.md). The TDD rules, audit-first rule, shared-type lockdown recipe, and commit conventions in that doc are non-negotiable. This phase doc assumes you've read it.

**Goal:** Close the five specific backend gaps that prevent P5–P10 from reaching pixel parity with the PWA, and lock every remaining route against field drift. Nothing visual ships in P4.

**Architecture:** Additive. One new Prisma model (`Watchlist`), one new FK column (`Content.businessTagId`), one new route (`routes/watchlist.ts`), one new service (`watchlistService.ts`), a WebSocket gateway plus client, a server-side QR SVG helper, and shared-type annotations on ~13 routes that don't have them yet.

**Why P4 first:** Every later phase imports contract-locked `@eru/shared` types that P4 adds. Attempting P5 before P4 means every downstream phase re-invents schemas, risks drift, and breaks the guarantee that "shared types make mismatch a compile error."

---

## The checklist-for-moving-day analogy

Imagine the repo is a house you're moving into. Previous tenants (P0–P3) put up walls, ran the plumbing, and wired the electricity. P4 is **the hour before the moving truck arrives**: label the rooms, install the address numbers on the door, hang the hook by the front door for keys, and make sure every appliance actually works. You don't hang art yet. You don't buy furniture yet. You just make the house ready to receive everything the next phases will bring.

Ship nothing visual in P4. The payoff is P5–P10 moving 2× faster because they never re-litigate contracts.

---

## Feature inventory

| # | Feature | Backend | Mobile | Notes |
|---|---------|---------|--------|-------|
| 1 | `Watchlist` model + routes + service | NEW Prisma model + NEW route file + NEW service | NEW mobile service | Dev Spec §5.5 — completely missing today |
| 2 | Socket.io gateway + client | NEW `ws/` module, wire into `app.ts`, emit on `Message` create | NEW `realtime.ts` singleton w/ reconnection | Messages currently poll. P8 chat needs realtime. |
| 3 | Server-side QR SVG on reward claim | `services/qrService.ts` NEW | — | Mobile currently draws QR client-side; Dev Spec §13 mandates server SVG |
| 4 | `Content.businessTagId` FK + derived feed fields | schema column + feed response annotate | — | Powers PWA sponsored CTAs in P6 |
| 5 | Contract-lock remaining routes | Annotate handlers + add shared types | Type mobile services, remove fallback chains | Closes the drift-lockdown story |
| 6 | 25-earning-actions reference table | — | — | Consolidation only; shared reference for P5–P10 |

Sub-grouping:

- **P4a** — data contracts (Features 1, 4, 5).
- **P4b** — realtime + QR infrastructure (Features 2, 3).
- **P4c** — documentation (Feature 6).

You can run P4a and P4b in parallel. P4c is a 30-minute write-up at the end.

---

## Prerequisites

- [ ] P0, P1, P2, P3 are complete and green.
- [ ] `cd apps/api && ALLOW_DEV_TOKENS=true npm test` currently passes (baseline before P4 changes).
- [ ] `cd apps/mobile && npm test` currently passes.
- [ ] `apps/api/.env` has `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (used by existing rate-limiting; P4 doesn't add new Redis usage).
- [ ] `GapFix_Agent_Protocol.md` §1–§11 read.

---

## Existing-implementation audit (RUN FIRST)

Paste the output of each of these greps into the PR description. **Do not start Feature 1 until every "expected result" below has been verified.**

### A1. No existing Watchlist model

```
Grep: pattern="Watchlist|watchlist" path=apps/api/prisma/schema.prisma
Expected: no matches
```

### A2. No Socket.io in API

```
Grep: pattern="socket\.io|Socket\.IO|io\.on\(" path=apps/api/src
Expected: no matches (transitive hits in package-lock.json are fine to ignore)
```

### A3. No server-side QR generator

```
Grep: pattern="qrcode|QRCode|qr_code" path=apps/api
Expected: no matches
```

### A4. Content has no `businessTagId`

```
Grep: pattern="businessTagId|business_tag_id" path=apps/api/prisma/schema.prisma
Expected: no matches
```

### A5. Identify not-yet-locked routes

```
Grep: pattern="async \(req, reply\) => \{" path=apps/api/src/routes
```

Cross-reference the list with `GapFix/Eru_Field_Drift_Lockdown.md#routes-now-contract-locked-13-endpoints`. Any route **not** in that list is a candidate for Feature 5. Expect ~13 candidates.

### A6. Baseline test counts

```
cd apps/api && ALLOW_DEV_TOKENS=true npm test -- --reporter=dot 2>&1 | tail -5
cd apps/mobile && npm test -- --silent 2>&1 | tail -5
```

Record the passing counts. P4 must not decrease them.

---

# Feature 1 — Watchlist (model + route + service + mobile)

**Goal:** Users follow businesses; followed businesses surface in My Rewards as stores-with-offers; businesses see their follower count in their dashboard.

**Why P4:** Dev Spec §5.5 lists `Watchlist` as a core data model; P7 (My Rewards) renders the Watchlist tab and P9 (Storefront) renders "Follow & Get Offers" + follower count. Neither can stub this.

**Files:**

- Create: `apps/api/prisma/schema.prisma` (add `Watchlist` model — append near other relational models)
- Create: `apps/api/src/routes/watchlist.ts`
- Create: `apps/api/src/services/watchlistService.ts`
- Create: `apps/api/tests/routes/watchlist.test.ts`
- Modify: `apps/api/src/app.ts` — register the new route
- Modify: `apps/api/tests/helpers/db.ts` — add watchlist cleanup in FK-safe order
- Create: `apps/mobile/services/watchlistService.ts`
- Create: `apps/mobile/__tests__/services/watchlistService.test.ts`
- Create: `packages/shared/src/types/watchlist.ts`
- Modify: `packages/shared/src/index.ts` (export)

### Task 1.1: Prisma model

- [ ] **Step 1: Extend schema**

Append to `apps/api/prisma/schema.prisma`:

```prisma
model Watchlist {
  id               String    @id @default(uuid())
  userId           String    @map("user_id")
  businessId       String    @map("business_id")
  notifyOnOffers   Boolean   @default(true) @map("notify_on_offers")
  createdAt        DateTime  @default(now()) @map("created_at")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@unique([userId, businessId])
  @@index([userId])
  @@index([businessId])
  @@map("watchlist")
}
```

Add the back-relation on `User`:

```prisma
// inside model User { ... }
watchlist Watchlist[]
```

Add the back-relation on `Business`:

```prisma
// inside model Business { ... }
watchlist Watchlist[]
```

- [ ] **Step 2: Apply**

```bash
cd apps/api
npx prisma db push
npx prisma generate
```

- [ ] **Step 3: Extend cleanup helper**

Edit `apps/api/tests/helpers/db.ts#cleanupTestData`. Add, in FK-safe order (children before parents):

```ts
await prisma.watchlist.deleteMany({ where: { user: { firebaseUid: { startsWith: 'dev-test-' } } } });
```

This must run before the user deletion.

- [ ] **Step 4: Commit**

```
chore(api): add Watchlist model + FK-safe test cleanup
```

### Task 1.2: Shared type

- [ ] **Step 1: Create shared type**

Create `packages/shared/src/types/watchlist.ts`:

```ts
export interface WatchlistEntry {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatarUrl: string | null;
  businessCategory: string | null;
  businessPincode: string | null;
  notifyOnOffers: boolean;
  activeOfferCount: number;
  createdAt: string;  // ISO8601
}

export interface GetWatchlistResponse {
  items: WatchlistEntry[];
  total: number;
}

export interface AddWatchlistRequest {
  businessId: string;
}

export interface AddWatchlistResponse {
  entry: WatchlistEntry;
}
```

- [ ] **Step 2: Export**

Edit `packages/shared/src/index.ts`, add:

```ts
export * from './types/watchlist';
```

- [ ] **Step 3: Commit**

```
feat(shared): add Watchlist response types
```

### Task 1.3: Service — RED test

- [ ] **Step 1: Failing test**

Create `apps/api/tests/services/watchlistService.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { watchlistService } from '../../src/services/watchlistService';
import { cleanupTestData, seedUser } from '../helpers/db';
import { prisma } from '../../src/utils/prisma';

describe('watchlistService.addAndList', () => {
  beforeEach(cleanupTestData);

  it('adds a business to the user\'s watchlist and lists it back', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wl1', phone: '+912000010001', username: 'wl1' });
    const business = await prisma.business.create({
      data: { name: 'Kashi Bakes', category: 'bakery', pincode: '682016' },
    });

    const added = await watchlistService.add(user.id, business.id);
    expect(added.businessId).toBe(business.id);
    expect(added.notifyOnOffers).toBe(true);

    const list = await watchlistService.listForUser(user.id);
    expect(list.items).toHaveLength(1);
    expect(list.items[0].businessName).toBe('Kashi Bakes');
  });

  it('is idempotent — adding the same business twice does not create duplicates', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wl2', phone: '+912000010002', username: 'wl2' });
    const business = await prisma.business.create({ data: { name: 'B', pincode: '682016' } });

    await watchlistService.add(user.id, business.id);
    await watchlistService.add(user.id, business.id);

    const list = await watchlistService.listForUser(user.id);
    expect(list.items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Verify RED**

```bash
cd apps/api
ALLOW_DEV_TOKENS=true npm test -- tests/services/watchlistService.test.ts
```

Expect failure: `Cannot find module '../../src/services/watchlistService'` — correct reason.

### Task 1.4: Service — GREEN

- [ ] **Step 1: Implement**

Create `apps/api/src/services/watchlistService.ts`:

```ts
import { prisma } from '../utils/prisma';
import type { WatchlistEntry, GetWatchlistResponse } from '@eru/shared';

function shape(row: any): WatchlistEntry {
  return {
    id: row.id,
    businessId: row.businessId,
    businessName: row.business?.name ?? '',
    businessAvatarUrl: row.business?.avatarUrl ?? null,
    businessCategory: row.business?.category ?? null,
    businessPincode: row.business?.pincode ?? null,
    notifyOnOffers: row.notifyOnOffers,
    activeOfferCount: row.business?._count?.offers ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export const watchlistService = {
  async add(userId: string, businessId: string): Promise<WatchlistEntry> {
    const row = await prisma.watchlist.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId },
      update: {},
      include: {
        business: {
          include: { _count: { select: { offers: { where: { expiresAt: { gt: new Date() } } } } } },
        },
      },
    });
    return shape(row);
  },

  async listForUser(userId: string): Promise<GetWatchlistResponse> {
    const rows = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          include: { _count: { select: { offers: { where: { expiresAt: { gt: new Date() } } } } } },
        },
      },
    });
    return { items: rows.map(shape), total: rows.length };
  },

  async remove(userId: string, businessId: string): Promise<void> {
    await prisma.watchlist.delete({
      where: { userId_businessId: { userId, businessId } },
    });
  },

  async setNotifyPreference(userId: string, businessId: string, notify: boolean): Promise<void> {
    await prisma.watchlist.update({
      where: { userId_businessId: { userId, businessId } },
      data: { notifyOnOffers: notify },
    });
  },
};
```

- [ ] **Step 2: Verify GREEN**

```bash
ALLOW_DEV_TOKENS=true npm test -- tests/services/watchlistService.test.ts
```

Both tests pass.

- [ ] **Step 3: Commit**

```
feat(api): watchlistService — add/list/remove/notify
```

### Task 1.5: Route — RED + GREEN

- [ ] **Step 1: Failing route test**

Create `apps/api/tests/routes/watchlist.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup';
import { cleanupTestData, seedUser, devToken } from '../helpers/db';
import { prisma } from '../../src/utils/prisma';

describe('POST /api/v1/watchlist', () => {
  beforeEach(cleanupTestData);
  afterAll(closeTestApp);

  it('adds a business and returns the shaped entry', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wlr1', phone: '+912000020001', username: 'wlr1' });
    const biz = await prisma.business.create({ data: { name: 'Brew District', pincode: '682001' } });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/watchlist',
      headers: { Authorization: devToken('dev-test-wlr1') },
      payload: { businessId: biz.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.entry.businessName).toBe('Brew District');
    expect(body.entry.notifyOnOffers).toBe(true);
  });

  it('rejects unknown businessId with 404', async () => {
    await seedUser({ firebaseUid: 'dev-test-wlr2', phone: '+912000020002', username: 'wlr2' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/watchlist',
      headers: { Authorization: devToken('dev-test-wlr2') },
      payload: { businessId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/v1/watchlist', () => {
  beforeEach(cleanupTestData);

  it('lists the current user\'s watched businesses', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wlr3', phone: '+912000020003', username: 'wlr3' });
    const b1 = await prisma.business.create({ data: { name: 'A', pincode: '682001' } });
    const b2 = await prisma.business.create({ data: { name: 'B', pincode: '682001' } });
    await prisma.watchlist.createMany({
      data: [
        { userId: user.id, businessId: b1.id },
        { userId: user.id, businessId: b2.id },
      ],
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/watchlist',
      headers: { Authorization: devToken('dev-test-wlr3') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(2);
  });
});

describe('DELETE /api/v1/watchlist/:businessId', () => {
  beforeEach(cleanupTestData);

  it('removes a business and returns 204', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wlr4', phone: '+912000020004', username: 'wlr4' });
    const biz = await prisma.business.create({ data: { name: 'X', pincode: '682001' } });
    await prisma.watchlist.create({ data: { userId: user.id, businessId: biz.id } });

    const res = await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/watchlist/${biz.id}`,
      headers: { Authorization: devToken('dev-test-wlr4') },
    });
    expect(res.statusCode).toBe(204);
    const remaining = await prisma.watchlist.findMany({ where: { userId: user.id } });
    expect(remaining).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Verify RED** (route file doesn't exist — expect 404 on all three)

- [ ] **Step 3: Implement route**

Create `apps/api/src/routes/watchlist.ts`:

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { watchlistService } from '../services/watchlistService';
import { Errors } from '../utils/errors';
import { prisma } from '../utils/prisma';
import type {
  GetWatchlistResponse,
  AddWatchlistResponse,
} from '@eru/shared';

const addSchema = z.object({ businessId: z.string().uuid() });
const notifySchema = z.object({ notifyOnOffers: z.boolean() });

export default async function watchlistRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/', async (req, reply): Promise<AddWatchlistResponse> => {
    const { businessId } = addSchema.parse(req.body);
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) throw Errors.notFound('business');
    const entry = await watchlistService.add(req.user!.id, businessId);
    reply.code(201);
    return { entry };
  });

  app.get('/', async (req): Promise<GetWatchlistResponse> => {
    return watchlistService.listForUser(req.user!.id);
  });

  app.delete('/:businessId', async (req, reply) => {
    const { businessId } = req.params as { businessId: string };
    try {
      await watchlistService.remove(req.user!.id, businessId);
    } catch {
      throw Errors.notFound('watchlist entry');
    }
    reply.code(204).send();
  });

  app.patch('/:businessId', async (req) => {
    const { businessId } = req.params as { businessId: string };
    const { notifyOnOffers } = notifySchema.parse(req.body);
    await watchlistService.setNotifyPreference(req.user!.id, businessId, notifyOnOffers);
    return { ok: true };
  });
}
```

- [ ] **Step 4: Register in `app.ts`**

Edit `apps/api/src/app.ts`, add (near other `app.register` lines):

```ts
import watchlistRoutes from './routes/watchlist';
// ...
await app.register(watchlistRoutes, { prefix: '/api/v1/watchlist' });
```

- [ ] **Step 5: Verify GREEN**

All 4 route tests pass; existing suite still green.

- [ ] **Step 6: Commit**

```
feat(api): POST/GET/DELETE/PATCH /api/v1/watchlist
```

### Task 1.6: Mobile service — RED + GREEN

- [ ] **Step 1: Failing test**

Create `apps/mobile/__tests__/services/watchlistService.test.ts`:

```ts
import api from '@/services/api';
import { watchlistService } from '@/services/watchlistService';

jest.mock('@/services/api');

describe('watchlistService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('list() returns the shared WatchlistEntry[] shape', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { items: [{ id: 'w1', businessId: 'b1', businessName: 'Brew', notifyOnOffers: true, activeOfferCount: 2, businessAvatarUrl: null, businessCategory: 'cafe', businessPincode: '682001', createdAt: '2026-04-21T10:00:00Z' }], total: 1 },
    });
    const res = await watchlistService.list();
    expect(res.items[0].businessName).toBe('Brew');
    expect(api.get).toHaveBeenCalledWith('/watchlist');
  });

  it('add() POSTs businessId and returns the entry', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { entry: { id: 'w2', businessId: 'b2', businessName: 'Kashi', notifyOnOffers: true, activeOfferCount: 0, businessAvatarUrl: null, businessCategory: null, businessPincode: null, createdAt: 'x' } },
    });
    const e = await watchlistService.add('b2');
    expect(e.businessName).toBe('Kashi');
    expect(api.post).toHaveBeenCalledWith('/watchlist', { businessId: 'b2' });
  });

  it('remove() DELETEs /:businessId', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ status: 204 });
    await watchlistService.remove('b3');
    expect(api.delete).toHaveBeenCalledWith('/watchlist/b3');
  });
});
```

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement**

Create `apps/mobile/services/watchlistService.ts`:

```ts
import api from './api';
import type {
  WatchlistEntry,
  GetWatchlistResponse,
} from '@eru/shared';

export const watchlistService = {
  async list(): Promise<GetWatchlistResponse> {
    const res = await api.get('/watchlist');
    return res.data;
  },
  async add(businessId: string): Promise<WatchlistEntry> {
    const res = await api.post('/watchlist', { businessId });
    return res.data.entry;
  },
  async remove(businessId: string): Promise<void> {
    await api.delete(`/watchlist/${businessId}`);
  },
  async setNotify(businessId: string, notifyOnOffers: boolean): Promise<void> {
    await api.patch(`/watchlist/${businessId}`, { notifyOnOffers });
  },
};
```

- [ ] **Step 4: Verify GREEN + commit**

```
feat(mobile): watchlistService — list/add/remove/setNotify
```

---

# Feature 2 — Socket.io gateway

**Goal:** Server emits `message:new` + `proposal:updated` events on their respective mutations; mobile subscribes and updates stores in realtime. Polling in `messagesService` stays as a fallback (don't delete it) but realtime takes over when the socket is healthy.

**Why P4:** P8 Messages screen needs realtime for the open-chat view (inbound bubbles appear without refresh). Dev Spec §20 Dev Notes: "Real-time via WebSocket."

**Dependencies:**

- `socket.io` (server) — install in `apps/api`
- `socket.io-client` — install in `apps/mobile`

**Files:**

- Install: `socket.io` in `apps/api/package.json`
- Install: `socket.io-client` in `apps/mobile/package.json`
- Create: `apps/api/src/ws/gateway.ts`
- Modify: `apps/api/src/server.ts` — attach socket.io to the Fastify http server
- Modify: `apps/api/src/routes/messages.ts` — emit `message:new` after `POST /conversations/:id/send`
- Modify: `apps/api/src/routes/sponsorship.ts` — emit `proposal:updated` on accept/decline/negotiate
- Create: `apps/api/tests/ws/gateway.test.ts`
- Create: `apps/mobile/services/realtime.ts`
- Create: `apps/mobile/__tests__/services/realtime.test.ts`

### Task 2.1: Install dependencies

- [ ] **Step 1: Add deps**

```bash
cd apps/api
npm install socket.io@^4

cd ../../apps/mobile
npm install socket.io-client@^4
```

- [ ] **Step 2: Commit**

```
chore: add socket.io + socket.io-client for realtime
```

### Task 2.2: Gateway — RED test

- [ ] **Step 1: Failing test**

Create `apps/api/tests/ws/gateway.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient, Socket } from 'socket.io-client';
import { getTestApp, closeTestApp } from '../helpers/setup';
import { seedUser, devToken } from '../helpers/db';

describe('Socket.io gateway', () => {
  let port: number;
  let client: Socket;

  beforeAll(async () => {
    const app = getTestApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    port = (app.server.address() as any).port;
  });

  afterAll(async () => {
    client?.disconnect();
    await closeTestApp();
  });

  it('rejects a connection without a valid token', async () => {
    await new Promise<void>((resolve, reject) => {
      const c = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
      c.on('connect_error', (err) => { expect(err.message).toMatch(/auth/i); c.disconnect(); resolve(); });
      c.on('connect', () => reject(new Error('should not have connected')));
    });
  });

  it('joins the user\'s personal room on valid token', async () => {
    await seedUser({ firebaseUid: 'dev-test-ws1', phone: '+912000030001', username: 'ws1' });
    await new Promise<void>((resolve) => {
      client = ioClient(`http://127.0.0.1:${port}`, {
        transports: ['websocket'],
        auth: { token: 'dev-test-ws1' },
      });
      client.on('connect', () => resolve());
    });
    expect(client.connected).toBe(true);
  });
});
```

- [ ] **Step 2: Verify RED** (gateway doesn't exist yet)

### Task 2.3: Gateway — GREEN

- [ ] **Step 1: Implement gateway**

Create `apps/api/src/ws/gateway.ts`:

```ts
import { Server as HttpServer } from 'http';
import { Server as IoServer, Socket } from 'socket.io';
import { resolveUserFromToken } from '../middleware/auth';

let io: IoServer | null = null;

export function initGateway(httpServer: HttpServer) {
  io = new IoServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/ws',
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('auth: missing token'));
      const user = await resolveUserFromToken(token);
      if (!user) return next(new Error('auth: invalid token'));
      (socket.data as any).userId = user.id;
      next();
    } catch (err: any) {
      next(new Error('auth: ' + (err?.message ?? 'unknown')));
    }
  });

  io.on('connection', (socket) => {
    const userId: string = (socket.data as any).userId;
    socket.join(`user:${userId}`);
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
```

**Note:** this depends on a `resolveUserFromToken(token: string)` helper in `middleware/auth`. If that function isn't already exported, refactor `authMiddleware` so the token-to-user resolution is a named export. Add a unit test for `resolveUserFromToken` first if you're changing its shape.

- [ ] **Step 2: Wire into server**

Edit `apps/api/src/server.ts`:

```ts
import { buildApp } from './app';
import { initGateway } from './ws/gateway';

(async () => {
  const app = await buildApp();
  await app.ready();
  initGateway(app.server);
  await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
})();
```

- [ ] **Step 3: Verify GREEN**

```bash
cd apps/api
ALLOW_DEV_TOKENS=true npm test -- tests/ws/gateway.test.ts
```

Both tests pass.

- [ ] **Step 4: Commit**

```
feat(api): Socket.io gateway with JWT auth + per-user rooms
```

### Task 2.4: Emit on message create

- [ ] **Step 1: Failing test** — add to `apps/api/tests/routes/messages.test.ts` (extend existing file):

```ts
it('emits message:new to the recipient\'s user room after POST /conversations/:id/send', async () => {
  // Similar to the gateway connect test: start socket client as user B, ensure
  // POST as user A into a conversation (A, B) triggers an inbound event on B's socket
  // within 1s timeout.
});
```

*(Full test code expands the pattern in Task 2.2 — RED before GREEN.)*

- [ ] **Step 2: GREEN — emit after persistence**

Edit `apps/api/src/routes/messages.ts`. In the handler for `POST /conversations/:id/send`, after the message is persisted:

```ts
import { emitToUser } from '../ws/gateway';
// ...
const recipientId = conversation.participantIds.find((id: string) => id !== req.user!.id);
if (recipientId) {
  emitToUser(recipientId, 'message:new', {
    conversationId: conversation.id,
    message: shapeMessage(savedMessage),
  });
}
```

- [ ] **Step 3: Verify GREEN + commit**

```
feat(api): emit message:new on POST /conversations/:id/send
```

### Task 2.5: Emit on proposal update

- [ ] **Step 1: Failing test** — add tests to `apps/api/tests/routes/sponsorship.test.ts` asserting a `proposal:updated` event fires on accept/decline/negotiate.

- [ ] **Step 2: GREEN** — call `emitToUser(creatorUserId, 'proposal:updated', {...})` after each mutation.

- [ ] **Step 3: Commit**

```
feat(api): emit proposal:updated on sponsorship mutations
```

### Task 2.6: Mobile realtime client

- [ ] **Step 1: Failing test**

Create `apps/mobile/__tests__/services/realtime.test.ts`:

```ts
import { realtime } from '@/services/realtime';

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
}));

describe('realtime singleton', () => {
  it('connects with the user\'s token', async () => {
    await realtime.connect('fake-token-abc');
    const { io } = require('socket.io-client');
    expect(io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      auth: { token: 'fake-token-abc' },
    }));
  });

  it('emitter subscribe/unsubscribe wires through to socket.on/off', () => {
    const fn = () => {};
    realtime.on('message:new', fn);
    realtime.off('message:new', fn);
    // Assert on mock call counts via the mocked client.
  });
});
```

- [ ] **Step 2: Implement**

Create `apps/mobile/services/realtime.ts`:

```ts
import { io, Socket } from 'socket.io-client';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? 'http://localhost:3000';

class RealtimeClient {
  private socket: Socket | null = null;

  async connect(token: string) {
    if (this.socket?.connected) return;
    this.socket = io(BASE_URL, {
      path: '/ws',
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }

  emit(event: string, payload: unknown) {
    this.socket?.emit(event, payload);
  }
}

export const realtime = new RealtimeClient();
```

- [ ] **Step 3: Verify GREEN + commit**

```
feat(mobile): realtime socket.io client with auto-reconnect
```

---

# Feature 3 — Server-side QR SVG

**Goal:** When a user claims a reward (`POST /rewards/claim`), the server generates a deterministic SVG QR encoding the reward code; mobile receives the SVG string and renders it inside `RewardCard` instead of using `react-native-qrcode-svg` client-side.

**Why P4:** Dev Spec §13: "QR codes: server-side SVG." Server-side generation means offline rendering on mobile is unaffected, the code is tamper-evident (server signs the payload), and we can extend payloads later (expiry, issuance time) without a mobile release.

**Dependencies:**

- `qrcode` (server) — add to `apps/api`

**Files:**

- Install: `qrcode` in `apps/api`
- Create: `apps/api/src/services/qrService.ts`
- Create: `apps/api/tests/services/qrService.test.ts`
- Modify: `apps/api/src/services/rewardsService.ts` — embed `qrSvg` string in the returned reward on claim
- Modify: `packages/shared/src/types/` (rewards.ts, new) — add `qrSvg: string` to the shared reward shape if not already there
- Modify: `apps/mobile/components/RewardCard.tsx` — render the server SVG (use `react-native-svg`'s `SvgXml`) and **remove** the client `react-native-qrcode-svg` import once the server SVG is present (keep as fallback if `qrSvg` missing)

### Task 3.1: Install + shared type

- [ ] `cd apps/api && npm install qrcode && npm install -D @types/qrcode`
- [ ] Add `qrSvg: string` to the shared `UserRewardItem` type (or equivalent). Rebuild shared.
- [ ] Commit.

### Task 3.2: Service — RED

Create `apps/api/tests/services/qrService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { qrService } from '../../src/services/qrService';

describe('qrService.generate', () => {
  it('returns an SVG string for the given code', async () => {
    const svg = await qrService.generate('ERU-TEST-1234');
    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('is deterministic for the same input', async () => {
    const a = await qrService.generate('ERU-TEST-1234');
    const b = await qrService.generate('ERU-TEST-1234');
    expect(a).toBe(b);
  });

  it('produces different output for different codes', async () => {
    const a = await qrService.generate('ERU-A');
    const b = await qrService.generate('ERU-B');
    expect(a).not.toBe(b);
  });
});
```

Verify RED.

### Task 3.3: Service — GREEN

Create `apps/api/src/services/qrService.ts`:

```ts
import QRCode from 'qrcode';

export const qrService = {
  async generate(code: string): Promise<string> {
    return QRCode.toString(code, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  },
};
```

Verify GREEN. Commit.

### Task 3.4: Wire into rewardsService

- [ ] Modify `apps/api/src/services/rewardsService.ts` `claim()`: after the reward is minted and `rewardCode` is assigned, call `qrService.generate(rewardCode)` and persist on `UserReward.qrSvg` (add column via `db push`) OR compute on-read in list/detail handlers.
- [ ] Failing test: `POST /api/v1/rewards/claim` response includes `qrSvg` that starts with `<svg`.
- [ ] GREEN.
- [ ] Modify `apps/mobile/components/RewardCard.tsx`: if `reward.qrSvg` exists, render via `SvgXml xml={reward.qrSvg}`. Else fall back to existing `QRCode` component.
- [ ] Failing mobile test for `RewardCard`: asserts SvgXml is rendered when `qrSvg` prop is a string.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 4 — Content.businessTagId + derived feed fields

**Goal:** A post can tag exactly one business (for "Review" subtype + commission flow). The feed response includes enough information per post for PostCard to render: UGC/creator/sponsored badges, moderation status, per-post points, location, time-ago, carousel vs reel type, offer CTA if sponsored.

**Why P4:** P6 PostCard needs these fields. Adding them now means P6 only does pixel/UX work, not schema.

**Files:**

- Modify: `apps/api/prisma/schema.prisma` — add `businessTagId` FK on `Content`
- Modify: `packages/shared/src/types/content.ts` — extend `FeedPostItem` with derived fields
- Modify: `apps/api/src/services/feedAlgorithm.ts` and `routes/feed.ts` — include `business` relation and compute derived fields in the response shape
- Modify: `apps/api/tests/routes/feed.test.ts` — assert on derived fields

### Task 4.1: Schema

- [ ] Add `businessTagId String? @map("business_tag_id")` + relation `businessTag Business? @relation(fields: [businessTagId], references: [id])` to `Content`.
- [ ] `npx prisma db push && npx prisma generate`.
- [ ] Commit.

### Task 4.2: Shared type extension — RED

Edit `packages/shared/src/types/content.ts`. Add to the canonical `FeedPostItem`:

```ts
export interface FeedPostItem {
  // existing fields…
  ugcBadge: 'creator' | 'user_created' | null;
  moderationBadge: 'approved' | 'pending' | null;
  isSponsored: boolean;
  sponsorName: string | null;
  sponsorAvatarUrl: string | null;
  sponsorBusinessId: string | null;
  offerUrl: string | null;
  pointsEarnedOnView: number;
  locationLabel: string | null;  // e.g. "Munnar, Kerala"
  locationPincode: string | null;
  createdAt: string;  // ISO
  mediaKind: 'photo' | 'video' | 'carousel' | 'poll' | 'reel' | 'text' | 'thread';
  durationSeconds: number | null;
  carouselCount: number | null;
}
```

Write a type test in `packages/shared/__tests__/content.test.ts` (create if missing):

```ts
import type { FeedPostItem } from '../src/types/content';

const _typecheck: FeedPostItem = {
  // full shape — this must compile
};
```

Vitest + `tsc --noEmit` is the gate.

### Task 4.3: Feed route — derived fields

- [ ] Failing test in `apps/api/tests/routes/feed.test.ts`:

```ts
it('feed items include ugcBadge/moderationBadge/isSponsored/mediaKind/etc', async () => {
  // seed a user, a business, a creator post, a sponsored post, a poll post;
  // hit GET /api/v1/feed; assert each derived field for each item.
});
```

- [ ] GREEN: update `feedAlgorithm.ts` / `routes/feed.ts` to compute these from: `user.role` (if creator), `moderationStatus`, `businessTagId` (sponsored iff present), `type` + `media[0].type`, `locationPincode` → lookup label via `locationsService`, etc.
- [ ] Commit.

---

# Feature 5 — Contract lockdown of remaining routes

**Goal:** After P4, every response-bearing API route is annotated `async (...): Promise<SharedType>` with the matching type in `@eru/shared`, and every mobile service that calls it types its return accordingly. Any future rename breaks the build on both sides.

**Why P4:** `Eru_Field_Drift_Lockdown.md` locked 13 routes. P4 locks the rest. This is the *enforcement* mechanism; without it, P5–P10 can silently drift.

### Task 5.1: Enumerate unlocked routes

- [ ] Run audit A5. List the ~13 candidates. Common set (verify against current state):

```
/actions/*
/badges
/business/*
/comments  (under /content/:id/comments)
/highlights
/locations/*
/messages
/notifications
/offers
/polls
/quests
/reels/:id (detail, if not in lockdown set)
/rewards
/spin
/sponsorship
/stories
/webhooks/*   (intentionally NOT locked — they serve third-party schemas)
/whatsapp-otp (pre-auth, no response shape to lock)
```

Exclude `webhooks` and `whatsapp-otp`. The actual count will be 10–13 depending on what's already locked. Confirm with: `grep -rn 'Promise<.*Response>' apps/api/src/routes/`.

### Task 5.2: Per-route lockdown

For **each** unlocked route, follow the 4-step recipe in `GapFix_Agent_Protocol.md §3`:

- [ ] Add/update the shared type in `packages/shared/src/types/<topic>.ts`.
- [ ] Annotate the handler `Promise<MySharedType>`.
- [ ] Annotate the mobile service.
- [ ] Remove any fallback chains (`data.items ?? data.posts ?? []`).

### Task 5.3: Contract tests

For each locked route, add (or extend) a test in `apps/api/tests/routes/<route>.test.ts` that asserts the response shape has all fields of `MySharedType` and no extras:

```ts
it('GET /api/v1/<route> response matches SharedType exactly', async () => {
  // ... setup
  const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/<route>', headers: { Authorization: devToken('dev-test-xxx') } });
  const body = res.json();
  const expected: (keyof MySharedType)[] = ['id', 'foo', 'bar']; // etc.
  expect(Object.keys(body)).toEqual(expect.arrayContaining(expected));
  expect(Object.keys(body).length).toBe(expected.length);
});
```

### Task 5.4: Update Eru_Field_Drift_Lockdown.md

- [ ] Move the newly-locked routes from "audited clean (types in mobile services)" to "contract-locked." Update counts.

### Task 5.5: Commit

One commit per route family. Example:

```
feat(shared): lockdown /offers + /rewards routes
```

---

# Feature 6 — 25 earning actions reference table

**Goal:** Consolidate all earning actions so P5–P10 can reference a single table instead of scraping the PWA/Dev Spec each time.

**Deliverable:** Append to this file (section below), and update `apps/api/src/services/pointsEngine.ts` to expose an `ACTIONS` const matching this table if it doesn't already.

### The 25 actions

Derived from PWA lines 436–471 (tutorial screen) + Dev Spec §4.1 reference + existing `pointsEngine.ts` usage:

| # | Action key | Points | Daily cap | Category | Verified by |
|---|---|---:|---:|---|---|
| 1 | `read_article` | +4 | 200 | Consume | Dwell time ≥ 8s |
| 2 | `watch_video` | +6 | 200 | Consume | Watch ≥ 10s |
| 3 | `view_reel` | +3 | 170 | Consume | Watch ≥ 3s |
| 4 | `listen_podcast` | +5 | 150 | Consume | Play ≥ 15s |
| 5 | `read_thread` | +3 | 100 | Consume | Scroll to last post |
| 6 | `like` | +1 | 140 | Engage | One per content |
| 7 | `comment` | +3 | 140 | Engage | ≥ 10 words (server count) |
| 8 | `share` | +2 | 60 | Engage | Expo Sharing dispatch |
| 9 | `save` | +1 | 40 | Engage | Interaction=save |
| 10 | `follow` | +2 | 20 | Engage | Follow edge created |
| 11 | `vote_poll` | +5 | 100 | Opinions | PollVote row created |
| 12 | `short_survey` | +15 | 60 | Opinions | Survey submit |
| 13 | `long_survey` | +40 | 80 | Opinions | Survey submit |
| 14 | `review` | +10 | 100 | Opinions | Content.subtype='review' approved |
| 15 | `rate_business` | +5 | 50 | Opinions | Business rating persisted |
| 16 | `view_sponsored` | +2 | 40 | Shop | Impression event |
| 17 | `click_sponsored_cta` | +5 | 50 | Shop | Click event |
| 18 | `claim_offer` | +10 | 80 | Shop | UserReward row created |
| 19 | `redeem_qr` | +25 | 100 | Shop | QR scan verified by business |
| 20 | `purchase` | +15 | 100 | Shop | Purchase webhook |
| 21 | `refer_friend` | +100 | — | Big win | Referred user signs up + verifies |
| 22 | `create_post` | +30 | — | Big win | Moderation-approved |
| 23 | `trending_bonus` | +200 | — | Big win | `isTrending` flag set |
| 24 | `daily_checkin` | +25 | 25/day | Big win | First API call of the day |
| 25 | `sponsored_ugc_live` | +50 | — | Big win | Sponsorship proposal → live |

**PWA average claim**: 193 pts/day at typical engagement levels. This is the baseline the tutorial advertises.

**Tier multipliers** (from `Eru_Consumer_Dev_Spec_final.docx` §2.1 Screen 4):

- Explorer: 1.0×
- Engager: 1.2×
- Influencer: 1.5×
- Champion: 2.0×

Applied on credit, not on display. Stored as `multiplier` on `PointsLedger`.

### Task 6.1: Audit findings — current state

The repo's `packages/shared/src/constants/points.ts` exports `ACTION_CONFIGS` with **15 actions**, not 25. The guardrail `packages/shared/__tests__/action-configs.test.ts` (added in P4 F6) asserts exactly 15, so future drift is caught at build time.

**Currently shipped (15):**

`read_article`, `watch_video`, `reel_watch`, `listen_podcast`, `read_thread`, `like`, `comment` (10-word gating in `validation.minWordCount`), `share`, `save`, `follow`, `daily_checkin`, `create_content`, `content_trending`, `refer_friend`, `complete_profile`.

**Planned but not yet implemented (10 — DEFERRED):**

`vote_poll`, `short_survey`, `long_survey`, `review`, `rate_business`, `view_sponsored`, `click_sponsored_cta`, `claim_offer` (likely covered by reward-claim flow side-effect), `redeem_qr`, `purchase`, `sponsored_ugc_live`, `welcome_bonus` (covered by `complete_profile`-style one-shot in P5 F6).

Why deferred: each of the 10 needs product validation on (a) the exact point value, (b) daily cap, (c) verification method (e.g., `purchase` needs a partner webhook). Adding them to the engine without those decisions invites churn. P5 F6 (`welcome_bonus`) and P6 F5 (`view_sponsored`/`click_sponsored_cta`) will revisit specific entries when their phase needs them.

### Task 6.2: Commit

```
test(shared): action-configs guardrail; docs(gapfix): align P4 F6 to shipped subset
```

---

## Playwright smoke (optional for P4)

P4 ships no visuals, so Playwright isn't required. If you want a sanity check after Feature 4 (the feed derived fields), run:

1. `cd apps/api && npm run dev` (local API).
2. `cd apps/mobile && npx expo export --platform web --output-dir /tmp/eru-web`.
3. Open `/tmp/eru-web/index.html` in the Playwright browser, log in, scroll the feed.
4. Use `browser_evaluate` to check the JSON of a post card against the shared type at runtime — a quick contract smoke.

This is diagnostic only, not a gate.

---

## Phase-completion gate

Per protocol §9. All of these must be true before declaring P4 done:

- [ ] `Watchlist` Prisma model present, applied via `db push`, generator run.
- [ ] `cleanupTestData` in `tests/helpers/db.ts` has `watchlist.deleteMany`.
- [ ] `POST/GET/DELETE/PATCH /api/v1/watchlist` tests all green.
- [ ] `apps/mobile/services/watchlistService.ts` with tests green.
- [ ] Socket.io server attached to the Fastify http server; gateway tests green.
- [ ] `apps/mobile/services/realtime.ts` tests green.
- [ ] `qrService.generate()` returns deterministic SVG; integration test asserts `qrSvg` in `POST /rewards/claim` response.
- [ ] `Content.businessTagId` FK present; feed response includes the full `FeedPostItem` derived-field set.
- [ ] Every previously-unlocked route is annotated `Promise<SharedType>`; mobile services match; fallback chains removed.
- [ ] 25-action reference table matches `pointsEngine.ts`.
- [ ] `cd apps/api && ALLOW_DEV_TOKENS=true npm test` green (≥ baseline test count).
- [ ] `cd apps/mobile && npm test` green (≥ baseline test count).
- [ ] `cd apps/api && npx tsc --noEmit` 0 errors.
- [ ] `cd apps/mobile && npx tsc --noEmit` no new errors.
- [ ] `Eru_Field_Drift_Lockdown.md` updated to reflect newly locked routes.
- [ ] All commits scoped per protocol §7.

---

## What could go wrong (beginner traps)

- **Skipping the audit.** The #1 risk is writing a second implementation of something that exists. Always run the greps in "Existing-implementation audit" first. If any finds matches, read them before proceeding.
- **Migrating instead of `db push`.** `npx prisma migrate dev` will *create a migrations folder* and break every later `db push`. If you catch yourself typing `migrate dev`, stop. Delete the generated `prisma/migrations/` folder if it was created.
- **Testing the gateway against `buildApp()` without `.listen()`**. Socket.io attaches to the http server, which doesn't exist until `.listen()` is called. Tests must start the server on `port:0`.
- **Emitting the wrong recipient.** `emitToUser(recipientId, ...)` must be the OTHER participant, not the sender. Off-by-one is how messaging systems look haunted.
- **Forgetting the FK-safe cleanup order.** Add `watchlist.deleteMany` BEFORE `user.deleteMany` in `cleanupTestData`. Miss this and the full suite starts failing P2003.
- **Installing `qrcode` in mobile instead of api.** Keep the client-side `react-native-qrcode-svg` import in `RewardCard` as a *fallback* only. Generation moves to the server.
- **Locking a webhook route.** `/webhooks/*` responds to third-party schemas (MediaConvert, Stripe-like). Do not annotate their response with `@eru/shared` types.
- **Adding fields to the PWA schema during P4.** P4 adds only the fields listed. Features 1–5 are the inventory. New visual fields are P5–P10 territory.

---

## Next phase

Once the gate is green, open [`GapFixP5.md`](./GapFixP5.md) — Phase 1, Onboarding. P5 assumes every P4 shared type exists and every locked route returns exactly the shape it advertises.
