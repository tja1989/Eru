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
  subtype: string | null;
  text: string | null;
  hashtags: string[];
  locationPincode: string | null;
  businessTagId: string | null;
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
  businessTag: {
    id: string;
    name: string;
    avatarUrl: string | null;
    category: string;
    pincode: string;
  } | null;
  // --- Derived fields consumed by mobile PostCard variants (PWA parity) ---
  ugcBadge: 'creator' | 'user_created' | null;
  moderationBadge: 'approved' | 'pending' | 'declined' | null;
  isSponsored: boolean;
  sponsorName: string | null;
  sponsorAvatarUrl: string | null;
  sponsorBusinessId: string | null;
  offerUrl: string | null;
  pointsEarnedOnView: number;
  locationLabel: string | null;
  mediaKind: 'photo' | 'video' | 'carousel' | 'poll' | 'reel' | 'thread' | 'text';
  carouselCount: number | null;
  durationSeconds: number | null;
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

// Reach multiplier applied to the final score based on content subtype.
// Keys must match the ContentSubtype enum in schema.prisma.
// Sole source of truth for the "Reviews get 3x more reach" promise in the UI.
export const SUBTYPE_REACH_MULTIPLIER: Record<string, number> = {
  review: 3.0,
  local_guide: 2.0,
  recommendation: 1.5,
  tutorial: 1.3,
  event_coverage: 1.3,
  recipe: 1.2,
  vlog: 1.0,
  photo_story: 1.0,
  comparison: 1.0,
  unboxing: 1.0,
  hot_take: 1.0,
  meme: 1.0,
};

// ---------------------------------------------------------------------------
// Display-field derivations — turn raw Prisma rows into the shape the mobile
// PostCard needs to render PWA's 6 variants. Keeping this pure + colocated
// with the feed so any change to the wire format is obvious from this file.
// ---------------------------------------------------------------------------

interface DerivedDisplayFields {
  ugcBadge: 'creator' | 'user_created' | null;
  moderationBadge: 'approved' | 'pending' | 'declined' | null;
  isSponsored: boolean;
  sponsorName: string | null;
  sponsorAvatarUrl: string | null;
  sponsorBusinessId: string | null;
  offerUrl: string | null;
  pointsEarnedOnView: number;
  locationLabel: string | null;
  mediaKind: 'photo' | 'video' | 'carousel' | 'poll' | 'reel' | 'thread' | 'text';
  carouselCount: number | null;
  durationSeconds: number | null;
}

function deriveDisplayFields(c: {
  type: string;
  moderationStatus: string;
  locationPincode: string | null;
  user: { isVerified: boolean };
  media: ContentMediaLite[];
  businessTag: { id: string; name: string; avatarUrl: string | null } | null;
  sponsorshipProposals: { id: string }[];
}): DerivedDisplayFields {
  const ugcBadge: 'creator' | 'user_created' | null = c.user.isVerified
    ? 'creator'
    : 'user_created';

  // APPROVED badge only surfaces on UGC (user_created). Verified creators
  // don't show it because their content bypasses visible moderation labelling.
  const moderationBadge: DerivedDisplayFields['moderationBadge'] =
    ugcBadge === 'user_created' && c.moderationStatus === 'published'
      ? 'approved'
      : c.moderationStatus === 'pending'
        ? 'pending'
        : c.moderationStatus === 'declined'
          ? 'declined'
          : null;

  const isSponsored = c.sponsorshipProposals.length > 0;
  const sponsorName = c.businessTag?.name ?? null;
  const sponsorAvatarUrl = c.businessTag?.avatarUrl ?? null;
  const sponsorBusinessId = c.businessTag?.id ?? null;
  const offerUrl = c.businessTag ? `/business/${c.businessTag.id}` : null;

  const firstMedia = c.media[0];
  const mediaKind: DerivedDisplayFields['mediaKind'] = (() => {
    if (c.type === 'reel') return 'reel';
    if (c.type === 'poll') return 'poll';
    if (c.type === 'thread') return 'thread';
    if (c.media.length > 1) return 'carousel';
    if (firstMedia?.type === 'video') return 'video';
    if (firstMedia?.type === 'image') return 'photo';
    return 'text';
  })();

  const carouselCount = mediaKind === 'carousel' ? c.media.length : null;
  const durationSeconds = firstMedia?.durationSeconds ?? null;

  // pointsEarnedOnView — shown top-right as 🪙 +N on the PostCard. Matches
  // the PWA reference numbers so the labels don't wobble between screens.
  const pointsEarnedOnView = (() => {
    if (isSponsored) return 15;
    if (mediaKind === 'poll') return 25;
    if (mediaKind === 'reel') return 5;
    if (mediaKind === 'video') return 12;
    if (ugcBadge === 'user_created' && moderationBadge === 'approved') return 30;
    if (mediaKind === 'photo') return 8;
    return 4;
  })();

  // For now the label is just the pincode. A later pass can resolve it into
  // "Kochi, Kerala" via pincodes.json but that's cosmetic polish.
  const locationLabel = c.locationPincode;

  return {
    ugcBadge,
    moderationBadge,
    isSponsored,
    sponsorName,
    sponsorAvatarUrl,
    sponsorBusinessId,
    offerUrl,
    pointsEarnedOnView,
    locationLabel,
    mediaKind,
    carouselCount,
    durationSeconds,
  };
}

/**
 * scoreContent — combines the five factor scores into one final number,
 * then multiplies by a subtype-specific reach factor.
 */
export function scoreContent(
  content: {
    publishedAt: Date | null;
    createdAt: Date;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    hashtags: string[];
    locationPincode: string | null;
    userId: string;
    subtype?: string | null;
  },
  ctx: FeedContext,
): number {
  const r = recencyScore(content.publishedAt, content.createdAt);
  const e = engagementScore(content.likeCount, content.commentCount, content.shareCount);
  const i = interestMatchScore(content.hashtags, ctx.interests);
  const p = pincodeProximityScore(content.locationPincode, ctx.pincode);
  const f = followingScore(content.userId, ctx.followingIds);

  const base =
    r * WEIGHTS.recency +
    e * WEIGHTS.engagement +
    i * WEIGHTS.interestMatch +
    p * WEIGHTS.pincodeProximity +
    f * WEIGHTS.following;

  const multiplier = content.subtype ? SUBTYPE_REACH_MULTIPLIER[content.subtype] ?? 1.0 : 1.0;
  return base * multiplier;
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
      deletedAt: null,
      createdAt: { gte: sevenDaysAgo },
    },
    take: 200,
    orderBy: { createdAt: 'desc' },
    include: {
      // Explicit select — protects the wire format from silent bloat when
      // future migrations add columns to content_media that mobile doesn't use.
      media: {
        select: {
          id: true,
          contentId: true,
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
      businessTag: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          category: true,
          pincode: true,
        },
      },
      // An "active" sponsorship is what makes a post sponsored right now.
      // We only need to know *whether one exists* — 1 row is enough.
      sponsorshipProposals: {
        where: { status: 'active' },
        select: { id: true },
        take: 1,
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

  // 3. Score every candidate + derive PostCard display fields
  const scored: ScoredContent[] = candidates.map((c) => {
    const derived = deriveDisplayFields(c);
    return {
      ...c,
      score: scoreContent(c, ctx),
      isLiked: likedSet.has(c.id),
      isSaved: savedSet.has(c.id),
      ...derived,
    };
  });

  // 4. Sort highest score first
  scored.sort((a, b) => b.score - a.score);

  // 5. Paginate
  const total = scored.length;
  const skip = (page - 1) * limit;
  const items = scored.slice(skip, skip + limit);

  return { items, page, limit, total };
}
