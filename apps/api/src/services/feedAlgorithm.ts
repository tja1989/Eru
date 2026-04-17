import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContentMediaLite {
  id: string;
  contentId: string;
  type: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  video360pUrl: string | null;
  video720pUrl: string | null;
  video1080pUrl: string | null;
  durationSeconds: number | null;
  width: number;
  height: number;
  sortOrder: number;
  transcodeStatus: string;
}

interface ScoredContent {
  id: string;
  userId: string;
  type: string;
  text: string | null;
  hashtags: string[];
  locationPincode: string | null;
  moderationStatus: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  score: number;
  isLiked: boolean;
  isSaved: boolean;
  media: ContentMediaLite[];
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    isVerified: boolean;
    tier: string;
  };
}

interface FeedContext {
  userId: string;
  pincode: string;
  interests: string[];
  followingIds: string[];
}

interface FeedPage {
  items: ScoredContent[];
  page: number;
  limit: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Scoring helpers — each returns a number between 0.0 and 1.0
// ---------------------------------------------------------------------------

/**
 * recencyScore — newer content scores higher.
 * Think of it like produce freshness at a market: just-arrived items get
 * prime shelf placement; yesterday's leftovers get moved to the back.
 */
function recencyScore(publishedAt: Date | null, createdAt: Date): number {
  const ref = publishedAt ?? createdAt;
  const ageMs = Date.now() - ref.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1) return 1.0;
  if (ageHours < 6) return 0.8;
  if (ageHours < 24) return 0.5;
  if (ageHours < 48) return 0.3;
  return 0.1;
}

/**
 * engagementScore — likes, comments (weighted 2x), and shares (weighted 3x).
 * Normalised against 100 and capped at 1.0.
 */
function engagementScore(likes: number, comments: number, shares: number): number {
  const raw = likes + comments * 2 + shares * 3;
  return Math.min(raw / 100, 1.0);
}

/**
 * interestMatchScore — fraction of the content's hashtags that overlap with
 * the user's declared interests.
 */
function interestMatchScore(contentHashtags: string[], userInterests: string[]): number {
  if (contentHashtags.length === 0 || userInterests.length === 0) return 0;

  const interestSet = new Set(userInterests.map((i) => i.toLowerCase()));
  const matches = contentHashtags.filter((h) => interestSet.has(h.toLowerCase())).length;

  return Math.min(matches / userInterests.length, 1.0);
}

/**
 * pincodeProximityScore — hyper-local content should surface first.
 * Same 6-digit pin → full score; same first 3 digits (district) → partial;
 * completely different area → low baseline.
 */
function pincodeProximityScore(
  contentPincode: string | null,
  userPincode: string,
): number {
  if (!contentPincode) return 0.2;
  if (contentPincode === userPincode) return 1.0;
  if (contentPincode.slice(0, 3) === userPincode.slice(0, 3)) return 0.5;
  return 0.2;
}

/**
 * followingScore — 1.0 if the current user follows the creator, 0 otherwise.
 */
function followingScore(creatorId: string, followingIds: string[]): number {
  return followingIds.includes(creatorId) ? 1.0 : 0.0;
}

// ---------------------------------------------------------------------------
// Weights — must sum to 1.0
// ---------------------------------------------------------------------------

const WEIGHTS = {
  recency: 0.3,
  engagement: 0.25,
  interestMatch: 0.2,
  pincodeProximity: 0.15,
  following: 0.1,
} as const;

/**
 * scoreContent — combines the five factor scores into one final number.
 */
function scoreContent(
  content: {
    publishedAt: Date | null;
    createdAt: Date;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    hashtags: string[];
    locationPincode: string | null;
    userId: string;
  },
  ctx: FeedContext,
): number {
  const r = recencyScore(content.publishedAt, content.createdAt);
  const e = engagementScore(content.likeCount, content.commentCount, content.shareCount);
  const i = interestMatchScore(content.hashtags, ctx.interests);
  const p = pincodeProximityScore(content.locationPincode, ctx.pincode);
  const f = followingScore(content.userId, ctx.followingIds);

  return (
    r * WEIGHTS.recency +
    e * WEIGHTS.engagement +
    i * WEIGHTS.interestMatch +
    p * WEIGHTS.pincodeProximity +
    f * WEIGHTS.following
  );
}

// ---------------------------------------------------------------------------
// Sponsored content placeholder (Phase 2)
// ---------------------------------------------------------------------------

/**
 * injectSponsoredContent — returns null until Phase 2 ad system is built.
 * Slot is reserved so the feed array shape won't change when ads ship.
 */
export function injectSponsoredContent(): null {
  return null;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * getFeed — fetches up to 200 recently published posts, scores each one
 * against the user's context, sorts by score descending, then paginates.
 *
 * Candidate window: last 7 days of published content.
 */
export async function getFeed(ctx: FeedContext, page: number, limit: number): Promise<FeedPage> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Pull candidates — up to 200 published posts from the last 7 days
  const candidates = await prisma.content.findMany({
    where: {
      moderationStatus: 'published',
      createdAt: { gte: sevenDaysAgo },
    },
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: {
      media: true,
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
  });

  // 2. Check which candidates the current user has liked or saved
  const candidateIds = candidates.map((c) => c.id);

  const [likedInteractions, savedInteractions] = await Promise.all([
    prisma.interaction.findMany({
      where: { userId: ctx.userId, contentId: { in: candidateIds }, type: 'like' },
      select: { contentId: true },
    }),
    prisma.interaction.findMany({
      where: { userId: ctx.userId, contentId: { in: candidateIds }, type: 'save' },
      select: { contentId: true },
    }),
  ]);

  const likedSet = new Set(likedInteractions.map((i) => i.contentId));
  const savedSet = new Set(savedInteractions.map((i) => i.contentId));

  // 3. Score every candidate
  const scored: ScoredContent[] = candidates.map((c) => ({
    ...c,
    score: scoreContent(c, ctx),
    isLiked: likedSet.has(c.id),
    isSaved: savedSet.has(c.id),
  }));

  // 4. Sort highest score first
  scored.sort((a, b) => b.score - a.score);

  // 5. Paginate
  const total = scored.length;
  const skip = (page - 1) * limit;
  const items = scored.slice(skip, skip + limit);

  return { items, page, limit, total };
}
