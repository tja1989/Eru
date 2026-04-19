import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, { value: string; expireAt: number }>();
const getSpy = vi.fn(async (key: string) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expireAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
});
const setSpy = vi.fn(async (key: string, value: string, opts: { ex: number }) => {
  store.set(key, { value, expireAt: Date.now() + opts.ex * 1000 });
  return 'OK';
});
const delSpy = vi.fn(async (key: string) => {
  store.delete(key);
  return 1;
});

vi.mock('../../src/utils/redis.js', () => ({
  getRedis: () => ({ get: getSpy, set: setSpy, del: delSpy }),
}));

const { feedCache } = await import('../../src/utils/feedCache.js');

beforeEach(() => {
  store.clear();
  getSpy.mockClear();
  setSpy.mockClear();
  delSpy.mockClear();
});

describe('feedCache.getOrCompute', () => {
  it('cache miss: calls compute, stores result, returns it', async () => {
    const compute = vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const result = await feedCache.getOrCompute('feed:user-1:p1', 60, compute);

    expect(compute).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(setSpy).toHaveBeenCalledWith('feed:user-1:p1', JSON.stringify([{ id: 'a' }, { id: 'b' }]), { ex: 60 });
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

    const compute = vi.fn().mockResolvedValue([{ id: 'fresh' }]);
    const after = await feedCache.getOrCompute('feed:user-3:p1', 60, compute);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(after).toEqual([{ id: 'fresh' }]);
  });

  it('userFeedKey + trendingKey produce stable strings', () => {
    expect(feedCache.userFeedKey('uid', 2)).toBe('feed:uid:p2');
    expect(feedCache.trendingKey()).toBe('trending:global');
  });
});
