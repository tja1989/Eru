import { prisma } from '../utils/prisma.js';

export interface TrendingInput {
  viewsLastHour: number;
  creatorScore: number;
  hoursSincePost: number;
}

export function computeTrendingScore(input: TrendingInput): number {
  if (input.viewsLastHour <= 0) return 0;
  const sqrtCreator = Math.sqrt(Math.max(0, input.creatorScore));
  const decay = Math.pow(0.5, input.hoursSincePost / 6);
  return input.viewsLastHour * sqrtCreator * decay;
}

export interface TrendingReel {
  id: string;
  hlsManifestUrl: string;
  variantManifests: string[];
  score: number;
}

export async function getTopReels(limit: number): Promise<TrendingReel[]> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const candidates = await prisma.content.findMany({
    where: {
      type: 'reel',
      moderationStatus: 'published',
      createdAt: { gte: since },
      media: { some: { hlsManifestUrl: { not: null } } },
    },
    include: {
      user: { select: { creatorScore: true } },
      media: {
        select: {
          hlsManifestUrl: true,
          video240pUrl: true,
          video360pUrl: true,
          video540pUrl: true,
          video720pUrl: true,
          video1080pUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const now = Date.now();

  const scored = candidates
    .map((c) => {
      const hlsManifest = c.media[0]?.hlsManifestUrl;
      if (!hlsManifest) return null;

      const hoursSincePost = (now - c.createdAt.getTime()) / (60 * 60 * 1000);
      // Approximation: divide lifetime viewCount by hours-alive to get an
      // average views-per-hour. Real fix is a ViewEvent table — see DWSet4-M2.md.
      const approxViewsPerHour = c.viewCount / Math.max(1, hoursSincePost);
      const creatorScore = c.user?.creatorScore ? Number(c.user.creatorScore) : 1;

      const score = computeTrendingScore({
        viewsLastHour: approxViewsPerHour,
        creatorScore,
        hoursSincePost,
      });

      return {
        id: c.id,
        hlsManifestUrl: hlsManifest,
        variantManifests: [
          c.media[0]?.video240pUrl,
          c.media[0]?.video360pUrl,
          c.media[0]?.video540pUrl,
          c.media[0]?.video720pUrl,
          c.media[0]?.video1080pUrl,
        ].filter((u): u is string => typeof u === 'string'),
        score,
      } as TrendingReel;
    })
    .filter((x): x is TrendingReel => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
