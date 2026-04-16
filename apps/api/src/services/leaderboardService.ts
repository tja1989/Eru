import { getRedis } from '../utils/redis.js';
import { prisma } from '../utils/prisma.js';

export async function getLeaderboard(pincode: string, scope: string, limit = 50) {
  const redis = getRedis();
  const key = `leaderboard:${scope}:${pincode}`;
  const rankings = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });
  if (!rankings || rankings.length === 0) return [];

  const userIds = rankings.filter((_, i) => i % 2 === 0) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true, streakDays: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const result = [];
  for (let i = 0; i < rankings.length; i += 2) {
    const userId = rankings[i] as string;
    const points = Number(rankings[i + 1]);
    const user = userMap.get(userId);
    if (user) {
      result.push({ rank: Math.floor(i / 2) + 1, ...user, pointsThisWeek: points });
    }
  }
  return result;
}

export async function getUserRank(userId: string, pincode: string, scope: string) {
  const redis = getRedis();
  const key = `leaderboard:${scope}:${pincode}`;
  const rank = await redis.zrevrank(key, userId);
  const score = await redis.zscore(key, userId);
  return { rank: rank !== null ? rank + 1 : null, pointsThisWeek: score ? Number(score) : 0 };
}
