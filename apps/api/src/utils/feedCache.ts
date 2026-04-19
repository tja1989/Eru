import { getRedis } from './redis.js';

export const feedCache = {
  async getOrCompute<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    let cached: unknown = null;
    let redis: ReturnType<typeof getRedis> | null = null;
    try {
      redis = getRedis();
      cached = await redis.get(key);
    } catch {
      // Redis unavailable / misconfigured — fall through to compute path.
      cached = null;
    }
    if (typeof cached === 'string') {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // stale/corrupt entry — fall through
      }
    } else if (cached !== null && cached !== undefined) {
      return cached as T;
    }

    const fresh = await compute();
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(fresh), { ex: ttlSeconds });
      } catch {
        // Best-effort cache write; never block the response.
      }
    }
    return fresh;
  },

  async invalidate(key: string): Promise<void> {
    try {
      await getRedis().del(key);
    } catch {
      // Best-effort; not fatal.
    }
  },

  userFeedKey(userId: string, page: number): string {
    return `feed:${userId}:p${page}`;
  },

  trendingKey(): string {
    return 'trending:global';
  },
};
