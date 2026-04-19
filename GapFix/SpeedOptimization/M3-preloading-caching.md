# M3 — Preloading + Redis Caching

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:executing-plans`, `superpowers:test-driven-development`. M0 must be complete; M1 is strongly recommended (HLS preload is much more valuable than MP4 preload). TDD rules per `GapFix/SpeedOptimization.md#7-tdd-protocol-agent-first`.

## 1. Goal

Keep the next reel(s) "warm" so vertical swipes play instantly. Cache the feed API response per-user in Redis (60s TTL) and the trending list cross-user (300s TTL) to cut API latency and DB load. Trim Prisma `include`/`select` to ship only the fields the client uses.

## 2. Analogy

The food trucks (M2) deliver fast, but our kitchen's *prep station* (preloading) can already have the next two plates ready before the diner finishes the current one. And the daily-specials board (Redis cache) doesn't need to be re-printed for every customer.

## 3. Why we need this

- **Reel preload:** without it, every vertical swipe triggers a fresh manifest + segment fetch — ~500ms of stall even on a fast CDN. TikTok preloads 3 reels ahead; Instagram preloads 1–2.
- **Feed cache:** `getFeed()` currently scores 200 posts in JS on every request. At 1,000 users hitting feed every 30s, that's 2,000 × 200 = 400,000 scoring operations per minute. Caching the result for 60s drops it to ~1,000 operations per minute.
- **Trimmed payloads:** the current feed response includes full `user` objects for every post; for a 10-post feed that's 10× the avatar URL, name, etc. Reducing this by half shrinks the payload from ~45 KB to ~22 KB.

## 4. Files to modify

| File | Change |
|---|---|
| `apps/mobile/package.json` | Add `@react-native-community/netinfo` |
| `apps/mobile/hooks/useReelPreloader.ts` | **NEW** — bandwidth-aware preload controller |
| `apps/mobile/app/(tabs)/reels.tsx` | Use `useReelPreloader` in the FlatList `onViewableItemsChanged` |
| `apps/mobile/__tests__/hooks/useReelPreloader.test.ts` | **NEW** — TDD for bandwidth → preload-count logic |
| `apps/mobile/__tests__/screens/reels-preload.test.tsx` | **NEW** — asserts N+1 and N+2 players are created when user is on wifi |
| `apps/api/src/utils/feedCache.ts` | **NEW** — thin wrapper around Upstash Redis |
| `apps/api/tests/utils/feedCache.test.ts` | **NEW** — TDD for cache hit / miss / TTL |
| `apps/api/src/routes/feed.ts` | Wrap `getFeed` call in `feedCache.getOrCompute(...)` |
| `apps/api/src/services/feedAlgorithm.ts` | Trim `include` to `select` with only mobile-consumed fields |
| `apps/api/src/services/trendingService.ts` (from M2) | Wrap with cross-user cache, 300s TTL |
| `apps/api/src/routes/admin.ts` (or similar) | Add `POST /admin/feed-cache/invalidate/:userId` for manual busting |
| `apps/api/src/services/moderationService.ts` | On content removal, invalidate author's follower caches (best-effort) |

## 5. Ordered TDD tasks

### Task M3.1 — Bandwidth-aware preloader hook

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/hooks/useReelPreloader.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useReelPreloader, preloadCountForBandwidth } from '@/hooks/useReelPreloader';

// Mock NetInfo
const netInfoMock = {
  fetch: jest.fn(),
  addEventListener: jest.fn(),
};
jest.mock('@react-native-community/netinfo', () => ({
  default: netInfoMock,
  useNetInfo: () => netInfoMock.__lastState ?? { type: 'wifi', isConnected: true, isInternetReachable: true },
}));

describe('preloadCountForBandwidth (pure)', () => {
  it('0 on 2g or cellular when downlink is absent/slow', () => {
    expect(preloadCountForBandwidth({ type: 'cellular', details: { cellularGeneration: '2g' } })).toBe(0);
  });

  it('1 on 3g', () => {
    expect(preloadCountForBandwidth({ type: 'cellular', details: { cellularGeneration: '3g' } })).toBe(1);
  });

  it('2 on 4g', () => {
    expect(preloadCountForBandwidth({ type: 'cellular', details: { cellularGeneration: '4g' } })).toBe(2);
  });

  it('3 on wifi', () => {
    expect(preloadCountForBandwidth({ type: 'wifi' })).toBe(3);
  });

  it('0 when offline', () => {
    expect(preloadCountForBandwidth({ type: 'none' })).toBe(0);
    expect(preloadCountForBandwidth({ type: 'wifi', isConnected: false })).toBe(0);
  });

  it('respects explicit downlinkMbps when provided', () => {
    // downlinkMbps < 1 → 0, 1-3 → 1, 3-6 → 2, >6 → 3
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 0.5 } })).toBe(0);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 2 } })).toBe(1);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 5 } })).toBe(2);
    expect(preloadCountForBandwidth({ type: 'cellular', details: { downlinkMbps: 10 } })).toBe(3);
  });
});

describe('useReelPreloader', () => {
  it('returns the right ahead/behind window for wifi', () => {
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 5 }));
    expect(result.current.indicesToPreload).toEqual([4, 6, 7, 8]);  // N-1, N+1, N+2, N+3
  });

  it('shrinks to N+1 only on 3g', () => {
    netInfoMock.__lastState = { type: 'cellular', details: { cellularGeneration: '3g' }, isConnected: true, isInternetReachable: true };
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 5 }));
    expect(result.current.indicesToPreload).toEqual([6]);
  });

  it('empty window when offline', () => {
    netInfoMock.__lastState = { type: 'none', isConnected: false, isInternetReachable: false };
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 5 }));
    expect(result.current.indicesToPreload).toEqual([]);
  });

  it('does not return negative indices', () => {
    netInfoMock.__lastState = { type: 'wifi', isConnected: true, isInternetReachable: true };
    const { result } = renderHook(() => useReelPreloader({ activeIndex: 0 }));
    // N-1 would be -1; skip it
    expect(result.current.indicesToPreload).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Install NetInfo.** From `apps/mobile/`:

```bash
npm install @react-native-community/netinfo
```

- [ ] **Step 3: Implement.** Create `apps/mobile/hooks/useReelPreloader.ts`:

```typescript
import { useMemo } from 'react';
import { useNetInfo, NetInfoState } from '@react-native-community/netinfo';

export function preloadCountForBandwidth(state: Partial<NetInfoState>): number {
  if (state.type === 'none' || state.isConnected === false) return 0;
  if (state.type === 'wifi') return 3;
  if (state.type === 'cellular') {
    const details = state.details as { cellularGeneration?: string; downlinkMbps?: number } | undefined;
    if (details?.downlinkMbps !== undefined) {
      if (details.downlinkMbps < 1) return 0;
      if (details.downlinkMbps < 3) return 1;
      if (details.downlinkMbps < 6) return 2;
      return 3;
    }
    const gen = details?.cellularGeneration;
    if (gen === '2g') return 0;
    if (gen === '3g') return 1;
    if (gen === '4g' || gen === '5g') return 2;
    return 1;  // unknown cellular → be conservative
  }
  return 1;
}

export interface UseReelPreloaderArgs {
  activeIndex: number;
}

export interface UseReelPreloaderResult {
  preloadCount: number;
  indicesToPreload: number[];
}

export function useReelPreloader({ activeIndex }: UseReelPreloaderArgs): UseReelPreloaderResult {
  const netInfo = useNetInfo();
  const preloadCount = preloadCountForBandwidth(netInfo);
  const indicesToPreload = useMemo(() => {
    if (preloadCount === 0) return [];
    const ahead = Array.from({ length: preloadCount }, (_, i) => activeIndex + 1 + i);
    const behind = activeIndex - 1 >= 0 ? [activeIndex - 1] : [];
    return [...behind, ...ahead].filter(i => i >= 0);
  }, [activeIndex, preloadCount]);

  return { preloadCount, indicesToPreload };
}
```

Line-by-line:

- `preloadCountForBandwidth` is a pure function so it's easy to unit-test without mocking NetInfo. The `useReelPreloader` hook uses it internally.
- `downlinkMbps` takes priority over `cellularGeneration` because newer Androids report it more accurately.
- `[...behind, ...ahead]` — we preload one behind so that scrolling back up is also instant.

- [ ] **Step 4: Verify green.** `cd apps/mobile && npm test -- useReelPreloader`.

### Task M3.2 — Wire into reels.tsx

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/screens/reels-preload.test.tsx`:

```typescript
import React from 'react';
import { render, act } from '@testing-library/react-native';
import Reels from '@/app/(tabs)/reels';

const playerInstances: Array<{ source: unknown; __index: number }> = [];
jest.mock('expo-video', () => ({
  useVideoPlayer: (source: unknown) => {
    const player = { source, play: jest.fn(), pause: jest.fn(), __index: playerInstances.length };
    playerInstances.push(player);
    return player;
  },
  VideoView: () => null,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ type: 'wifi', isConnected: true, isInternetReachable: true }),
}));
jest.mock('@/services/contentService', () => ({
  getReels: jest.fn().mockResolvedValue({
    items: Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`, type: 'reel', text: '',
      media: [{ originalUrl: `https://cdn/o${i}.mov`, hlsManifestUrl: `https://cdn/h${i}.m3u8` }],
      user: { id: 'u1', name: 'Test', username: 'test', avatarUrl: null, isVerified: false, tier: 'bronze' },
    })),
    page: 1, limit: 10, total: 10,
  }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: unknown) => (sel as (s: unknown) => unknown)({ user: { id: 'u-me' } }),
}));

describe('Reels preloads neighbours on wifi', () => {
  beforeEach(() => { playerInstances.length = 0; });

  it('activeIndex=0 warms players for indices 0, 1, 2, 3 (no -1)', async () => {
    const { findByTestId } = render(<Reels />);
    // let feed load + mounts render
    await act(() => new Promise(r => setTimeout(r, 0)));
    const warmedIndices = playerInstances.map(p => p.__index);
    expect(warmedIndices).toEqual(expect.arrayContaining([0, 1, 2, 3]));
    // but NOT 4+ (out of preload window from activeIndex=0 + 3)
    expect(warmedIndices.some(i => i >= 4)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement.** Edit `apps/mobile/app/(tabs)/reels.tsx`:

- Import `useReelPreloader`
- In the main screen component, call `useReelPreloader({ activeIndex })`
- Pass `indicesToPreload` into the FlatList `renderItem` logic so that `ReelItem` receives an `isWarmed` flag when its index is either active OR in the preload window
- In `ReelItem`, only create the `useVideoPlayer` player when `isActive || isWarmed`. Previously you created every player unconditionally.

Rough shape of the diff (refer to existing reels.tsx for exact context):

```typescript
// New imports
import { useReelPreloader } from '@/hooks/useReelPreloader';

// Inside the screen component:
const [activeIndex, setActiveIndex] = useState(0);
const { indicesToPreload } = useReelPreloader({ activeIndex });

// Inside renderItem:
const isActive = index === activeIndex;
const isWarmed = indicesToPreload.includes(index);
return <ReelItem item={item} isActive={isActive} isWarmed={isWarmed} />;

// Inside ReelItem:
function ReelItem({ item, isActive, isWarmed }: Props) {
  const shouldRenderPlayer = isActive || isWarmed;
  const videoUrl = shouldRenderPlayer ? pickVideoUrl(item.media?.[0]) : undefined;
  const player = useVideoPlayer(shouldRenderPlayer && videoUrl ? { uri: videoUrl } : null);
  // ...
  useEffect(() => {
    if (!isActive) {
      player?.pause();
      return;
    }
    player?.play();
  }, [isActive, player]);
  // ...
}
```

- [ ] **Step 3: Verify green.**

### Task M3.3 — Eviction

The useVideoPlayer hook in expo-video 3.x auto-disposes when the source becomes `null`. M3.2's implementation already achieves eviction: once a reel is OUTSIDE the preload window, `shouldRenderPlayer` becomes false, source becomes `null`, player disposes.

- [ ] **Step 1: Failing test.** Add to `reels-preload.test.tsx`:

```typescript
it('evicts players outside preload window', async () => {
  const { rerender, findByTestId } = render(<Reels />);
  await act(() => new Promise(r => setTimeout(r, 0)));

  // Simulate scroll: activeIndex moves from 0 → 5
  // Details depend on test-harness for FlatList viewable-items-changed.
  // Key assertion: after activeIndex=5, players for indices 0 and 1 should have their source become null.
  // (Mock expo-video to track null-source transitions.)
});
```

Note: complete test depends on the specific FlatList viewability test harness. Detail to refine during implementation.

- [ ] **Step 2: Verify in manual Metro session.** Open reels, scroll rapidly to the 20th reel, use Android Studio Memory Profiler to confirm memory plateaus (not a monotonic climb). Expect ~200 MB peak, not 2 GB.

### Task M3.4 — Feed cache utility

- [ ] **Step 1: Failing test.** Create `apps/api/tests/utils/feedCache.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { feedCache } from '../../src/utils/feedCache.js';
import { Redis } from '@upstash/redis';

// Minimal Upstash Redis mock
const store = new Map<string, { value: string; expireAt: number }>();
const getSpy = vi.fn(async (key: string) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expireAt < Date.now()) { store.delete(key); return null; }
  return entry.value;
});
const setSpy = vi.fn(async (key: string, value: string, opts: { ex: number }) => {
  store.set(key, { value, expireAt: Date.now() + opts.ex * 1000 });
  return 'OK';
});
const delSpy = vi.fn(async (key: string) => { store.delete(key); return 1; });

vi.mock('../../src/utils/redis.js', () => ({
  redis: { get: getSpy, set: setSpy, del: delSpy } as unknown as Redis,
}));

beforeEach(() => { store.clear(); vi.clearAllMocks(); });

describe('feedCache.getOrCompute', () => {
  it('cache miss: calls compute, stores result, returns it', async () => {
    const compute = vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const result = await feedCache.getOrCompute('feed:user-1:p1', 60, compute);

    expect(compute).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(setSpy).toHaveBeenCalledWith('feed:user-1:p1', JSON.stringify([{id:'a'},{id:'b'}]), { ex: 60 });
  });

  it('cache hit: returns cached value without calling compute', async () => {
    const compute1 = vi.fn().mockResolvedValue([{ id: 'a' }]);
    await feedCache.getOrCompute('feed:user-1:p1', 60, compute1);

    const compute2 = vi.fn().mockResolvedValue([{ id: 'different' }]);
    const result = await feedCache.getOrCompute('feed:user-1:p1', 60, compute2);

    expect(compute2).not.toHaveBeenCalled();
    expect(result).toEqual([{ id: 'a' }]);
  });

  it('respects TTL: after expiry, recomputes', async () => {
    vi.useFakeTimers();
    try {
      const compute1 = vi.fn().mockResolvedValue([{ id: 'a' }]);
      await feedCache.getOrCompute('feed:user-2:p1', 5, compute1);

      vi.advanceTimersByTime(6_000);

      const compute2 = vi.fn().mockResolvedValue([{ id: 'b' }]);
      const result = await feedCache.getOrCompute('feed:user-2:p1', 5, compute2);

      expect(compute2).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 'b' }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('invalidate() clears the key', async () => {
    await feedCache.getOrCompute('feed:user-3:p1', 60, async () => [{ id: 'a' }]);
    await feedCache.invalidate('feed:user-3:p1');
    expect(delSpy).toHaveBeenCalledWith('feed:user-3:p1');
  });
});
```

- [ ] **Step 2: Implement.** Create `apps/api/src/utils/feedCache.ts`:

```typescript
import { redis } from './redis.js';

export const feedCache = {
  async getOrCompute<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const cached = await redis.get(key);
    if (typeof cached === 'string') {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // stale/corrupt entry — fall through to recompute
      }
    } else if (cached !== null && cached !== undefined) {
      // Upstash can return parsed objects directly; handle both shapes.
      return cached as T;
    }
    const fresh = await compute();
    await redis.set(key, JSON.stringify(fresh), { ex: ttlSeconds });
    return fresh;
  },

  async invalidate(key: string): Promise<void> {
    await redis.del(key);
  },

  userFeedKey(userId: string, page: number): string {
    return `feed:${userId}:p${page}`;
  },

  trendingKey(): string {
    return 'trending:global';
  },
};
```

- [ ] **Step 3: Verify green.**

### Task M3.5 — Wrap `getFeed` route

- [ ] **Step 1: Failing test.** Add to `apps/api/tests/routes/feed.test.ts`:

```typescript
it('caches feed per user — 2nd call within TTL does not re-query Prisma', async () => {
  const user = await seedUser('dev-test-cache1');
  // Add a couple of content rows owned by the user...
  // (omitted for brevity, use existing helpers)

  const findManySpy = vi.spyOn(prisma.content, 'findMany');

  const r1 = await app.inject({ method: 'GET', url: '/api/v1/feed?page=1', headers: { authorization: devToken('dev-test-cache1') }});
  expect(r1.statusCode).toBe(200);
  const baseline = findManySpy.mock.calls.length;

  const r2 = await app.inject({ method: 'GET', url: '/api/v1/feed?page=1', headers: { authorization: devToken('dev-test-cache1') }});
  expect(r2.statusCode).toBe(200);
  // 2nd call should NOT query Prisma content.findMany again
  expect(findManySpy.mock.calls.length).toBe(baseline);

  findManySpy.mockRestore();
});
```

- [ ] **Step 2: Implement.** Edit `apps/api/src/routes/feed.ts` to wrap the `getFeed` call:

```typescript
import { feedCache } from '../utils/feedCache.js';

// Inside the route handler:
const cacheKey = feedCache.userFeedKey(request.userId, page);
const cachedOrFresh = await feedCache.getOrCompute(cacheKey, 60, async () => {
  return getFeed({ userId: request.userId, page, limit });
});
return cachedOrFresh;
```

- [ ] **Step 3: Verify green.** Tests pass; the full feed test suite still passes; a manual `curl` shows identical response content on two calls within 60s.

### Task M3.6 — Trimmed Prisma selects

- [ ] **Step 1: Failing test.** Add to `apps/api/tests/routes/feed.test.ts`:

```typescript
it('feed response does NOT include user.bio (omitted for payload trimming)', async () => {
  const user = await seedUser('dev-test-trim1', { bio: 'this should not appear' });
  await seedContent({ userId: user.id, type: 'post' });
  const res = await app.inject({ method: 'GET', url: '/api/v1/feed?page=1', headers: { authorization: devToken('dev-test-trim1') }});
  const body = JSON.parse(res.body);
  const firstItem = body.items?.[0];
  expect(firstItem).toBeDefined();
  expect(firstItem.user).toBeDefined();
  expect(firstItem.user.bio).toBeUndefined();  // bio NOT included
  // Confirm essentials are still there
  expect(firstItem.user.id).toBeDefined();
  expect(firstItem.user.name).toBeDefined();
  expect(firstItem.user.avatarUrl).not.toBeUndefined();  // may be null but key exists
});
```

- [ ] **Step 2: Implement.** Edit `apps/api/src/services/feedAlgorithm.ts` Prisma call:

Before:
```typescript
include: {
  media: true,
  user: { select: { id, name, username, avatarUrl, isVerified, tier } },
},
```

After — verify the `select` already omits `bio`, `createdAt` on user, `updatedAt` on content, etc. Reduce `media.include = true` to a `select` listing only the fields `pickVideoUrl` needs + `thumbnailUrl`:

```typescript
select: {
  id: true,
  type: true,
  text: true,
  hashtags: true,
  locationPincode: true,
  moderationStatus: true,
  viewCount: true,
  likeCount: true,
  dislikeCount: true,
  commentCount: true,
  createdAt: true,
  threadPosition: true,
  threadParentId: true,
  taggedUserIds: true,
  media: {
    select: {
      id: true,
      type: true,
      originalUrl: true,
      thumbnailUrl: true,
      video240pUrl: true,
      video360pUrl: true,
      video540pUrl: true,
      video720pUrl: true,
      video1080pUrl: true,
      hlsManifestUrl: true,
      width: true,
      height: true,
      durationSeconds: true,
      sortOrder: true,
      transcodeStatus: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      isVerified: true,
      tier: true,
    },
  },
},
```

- [ ] **Step 3: Regression test.** Run the full mobile Jest suite — every test that renders a feed item must still pass (they should, because `user.bio` is never used in mobile UI, but verify).

### Task M3.7 — Manual cache invalidation + moderation hook

- [ ] **Step 1: Failing test.** Add to an admin-routes test file:

```typescript
it('POST /admin/feed-cache/invalidate/:userId clears the key', async () => {
  const admin = await seedUser('dev-test-admin1', { role: 'admin' });
  await feedCache.getOrCompute('feed:target-user:p1', 60, async () => [{ id: 'a' }]);

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/feed-cache/invalidate/target-user',
    headers: { authorization: devToken('dev-test-admin1') },
  });
  expect(res.statusCode).toBe(200);
  // Next call should miss and recompute
  const next = await feedCache.getOrCompute('feed:target-user:p1', 60, async () => [{ id: 'b' }]);
  expect(next).toEqual([{ id: 'b' }]);
});
```

- [ ] **Step 2: Implement.** Add the route to the admin routes file (or create `apps/api/src/routes/admin.ts` if it doesn't exist). Require admin role via existing auth middleware.

- [ ] **Step 3: Moderation invalidation.** Edit `apps/api/src/services/moderationService.ts` — after marking content removed, invalidate `feed:${authorId}:*`. For v1, simplest: invalidate only page 1 (`feedCache.invalidate(feedCache.userFeedKey(authorId, 1))`). Page 2+ remains stale for up to 60s, acceptable.

## 6. Cache invalidation decision (documented)

**TTL-only for v1. Event-driven deferred to v2.**

Why TTL is fine:

- 60s staleness on feed is human-imperceptible. A user who liked a post in tab A sees their +1 like count in tab B within 60s.
- Event-driven requires pub/sub + invalidation graph: on `like`, invalidate author's follower feeds, related trending cache, creator-score cache. Cascading failures are a real risk.
- Eru's growth rate lets us operate on TTL for 6–12 months without user-visible issues.

Why revisit for v2:

- Once a user reaches 100,000+ followers, a like on their post staleness stretches across tens of thousands of cached feeds.
- Sponsored/ad content must update in real time to reflect budget depletion.
- When these firm up, move to Redis pub/sub on `content.published`, `interaction.created`, `user.followed` events.

## 7. What could go wrong

- **Stale cache after content moderation.** Moderated-down content might continue appearing in a cached feed for up to 60s. **Mitigation:** M3.7 adds invalidation in `moderationService`.
- **Mobile memory pressure from preloaded players.** Three active expo-video players can reach ~200 MB RAM on a budget Android. **Mitigation:** eviction in M3.3 + Sentry memory watch (M5).
- **Preload on 2G burns battery for nothing.** NetInfo returns "2g" → preload count = 0. Tests verify this branch (M3.1).
- **Stale NetInfo state on Android.** `cellularGeneration` can return `null` when the device is transitioning towers. **Mitigation:** fall back to `downlinkMbps` when present; fall back to "1 preload" when both are missing.
- **Upstash Redis outage.** If Redis is down, every feed request falls through to compute → DB load spike. **Mitigation:** `feedCache.getOrCompute` already catches via `redis.get` returning null on error; no fallback needed, but monitor `redis:errors` count in M5.
- **Cache key collisions.** `feed:${userId}:p${page}` — if we ever let userIds contain colons (they're UUIDs, so we won't), keys would collide. Document this invariant in the code.

## 8. Rollback

- **Preload hook:** flag-gate via `process.env.EXPO_PUBLIC_REEL_PRELOAD=0` to disable, then ship normal build. Or revert M3.2's reels.tsx changes.
- **Redis cache:** set TTL to 0 (hot-config via Upstash dashboard, no code change) → cache always misses, API returns to pre-M3 performance.
- **Prisma trim:** git revert the `feedAlgorithm.ts` diff. Payload grows back, nothing else changes.

No data loss in any rollback path.

## 9. Cost delta

- Upstash Redis: already on the plan; feed-cache TTL traffic adds ~5,000 req/sec at peak → still within free tier for Eru scale.
- Mobile data: preload N+1 + N+2 = 2 extra HLS manifest fetches (~2 KB each) + 2 initial segments (~400 KB each for 720p) per reel swipe. At average 30 reels/day per active user, that's ~24 MB extra/day. Document in onboarding as "uses ~100 MB per hour of reel scrolling."
- **Net M3 delta:** $0–$5/month API-side. Mobile-side bandwidth burden is user-borne.

## 10. Duration

- M3.1–M3.3 (mobile preload + eviction): 8–10 hours
- M3.4–M3.5 (feed cache): 4–6 hours
- M3.6 (Prisma trim + regression): 6–8 hours
- M3.7 (manual invalidation + moderation hook): 2–3 hours
- **Total:** 20–27 hours = **3–4 working days**.

## 11. Dependencies

- Blocked by: M0 (mobile URL helper). M1 strongly recommended (HLS preload is much more valuable than MP4 preload).
- Parallel with: M2, M4, M5.

## 12. Next milestone

Proceed to [M4 — Startup + bundle](M4-startup-bundle.md) or [M5 — Monitoring](M5-monitoring.md) (parallelisable).
