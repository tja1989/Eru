/**
 * Idempotent seed script for the Playwright MCP audit. Populates the Railway
 * DB with fixtures covering every PostCard variant + a business + an offer + a
 * pending sponsorship + a watchlist entry, so the 20-screen audit can assert
 * against known data.
 *
 * Cleanup: all users start with `dev-test-` prefix → the existing
 * `cleanupTestData()` helper in tests/helpers/db.ts sweeps them.
 *
 * Run:
 *   cd apps/api && npx tsx src/scripts/seed-playwright.ts
 *
 * Re-runs are safe — everything checks-then-creates or upserts by unique key.
 */
import {
  PrismaClient,
  Tier,
  UserRole,
  ModerationStatus,
  ContentType,
  MediaType,
  TranscodeStatus,
  InteractionType,
  SponsorshipStatus,
  OfferType,
} from '@prisma/client';

const prisma = new PrismaClient();

const pravatar = (username: string) => `https://i.pravatar.cc/300?u=${username}`;
const picsum = (seed: string, w = 1200, h = 1200) =>
  `https://picsum.photos/seed/eru-${seed}/${w}/${h}`;

// Sample video from a public CDN. Stable, CORS-friendly, short duration.
const SAMPLE_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

const TEST_USER = {
  firebaseUid: 'dev-test-pwtest',
  phone: '+919999999001',
  name: 'Playwright Test',
  username: 'pwtest',
  primaryPincode: '682016',
  tier: Tier.engager,
  bio: 'Automated audit user. Do not delete manually — cleanup script handles it.',
  interests: ['tech', 'food', 'travel'],
  contentLanguages: ['en', 'ml'],
  lifetimePoints: 1250,
  currentBalance: 840,
  streakDays: 5,
  isVerified: false,
};

const CREATOR = {
  firebaseUid: 'dev-test-creator-pw',
  phone: '+919999999002',
  name: 'Aisha Nair',
  username: 'aisha_pw',
  primaryPincode: '682016',
  tier: Tier.influencer,
  bio: 'Kerala creator — food, travel, culture 🌴',
  interests: ['food', 'travel', 'photography'],
  contentLanguages: ['en', 'ml'],
  lifetimePoints: 8240,
  currentBalance: 3100,
  streakDays: 12,
  isVerified: true,
};

const BIZ_OWNER = {
  firebaseUid: 'dev-test-biz-pw',
  phone: '+919999999003',
  name: 'Kashi Bakes Owner',
  username: 'kashi_bakes_pw',
  primaryPincode: '682016',
  tier: Tier.engager,
  bio: 'Business owner account — Kashi Bakes.',
  interests: ['food', 'business'],
  contentLanguages: ['en'],
  lifetimePoints: 0,
  currentBalance: 0,
  streakDays: 0,
  isVerified: false,
};

const BUSINESS = {
  name: 'Kashi Bakes Test',
  category: 'Bakery & Cafe',
  description: 'Freshly baked artisan breads and pastries in Kochi.',
  pincode: '682016',
  address: 'MG Road, Ernakulam',
  phone: '+914849999999',
  since: 2019,
  responseTimeMinutes: 45,
  isVerified: true,
};

const POST_VARIANTS = [
  // V1 — Creator photo post
  {
    variant: 'creator_photo',
    owner: 'creator',
    type: ContentType.post,
    text: "Made the perfect Kerala fish curry today! The key is fresh coconut milk and karimeen straight from the harbour. Reminds me of Sunday afternoons at my grandmother's house in Vypeen. #KeralaMonsoon #HomeCooking",
    hashtags: ['KeralaMonsoon', 'HomeCooking'],
    locationPincode: '682016',
    media: [{ type: MediaType.image, seed: 'kerala-curry' }],
    likeCount: 5124,
    commentCount: 342,
    shareCount: 78,
    viewCount: 18200,
    pointsEarned: 8,
  },
  // V2 — Creator video post
  {
    variant: 'creator_video',
    owner: 'creator',
    type: ContentType.post,
    text: 'Morning drive through the mist-covered tea gardens of Munnar. Turn the volume up 🎧 #Munnar #Roadtrip',
    hashtags: ['Munnar', 'Roadtrip'],
    locationPincode: '685612',
    media: [
      {
        type: MediaType.video,
        seed: 'munnar-video',
        durationSeconds: 272,
        hlsManifestUrl: null,
      },
    ],
    likeCount: 2894,
    commentCount: 145,
    shareCount: 62,
    viewCount: 12400,
    pointsEarned: 12,
  },
  // V3 — Sponsored post
  {
    variant: 'sponsored',
    owner: 'creator',
    type: ContentType.post,
    text: "Tried the new cardamom croissant at Kashi Bakes — ₹120 well spent. First 50 customers today get 20% off. Claim with the offer below ⬇️",
    hashtags: ['KochiFood', 'Sponsored'],
    locationPincode: '682016',
    tagBusiness: true,
    commissionPctEarned: 20,
    media: [{ type: MediaType.image, seed: 'kashi-croissant' }],
    likeCount: 412,
    commentCount: 21,
    shareCount: 18,
    viewCount: 3800,
    pointsEarned: 15,
  },
  // V4 — User-created carousel (approved)
  {
    variant: 'user_carousel',
    owner: 'pwtest',
    type: ContentType.post,
    text: 'Saturday hike to Edakkal caves 🪨 swipe →',
    hashtags: ['Wayanad', 'Weekend'],
    locationPincode: '673577',
    media: [
      { type: MediaType.image, seed: 'edakkal-1' },
      { type: MediaType.image, seed: 'edakkal-2' },
      { type: MediaType.image, seed: 'edakkal-3' },
    ],
    likeCount: 87,
    commentCount: 9,
    shareCount: 3,
    viewCount: 420,
    pointsEarned: 30,
  },
  // V5 — Poll
  {
    variant: 'poll',
    owner: 'creator',
    type: ContentType.poll,
    text: "Which breakfast hits different on a Kerala morning?",
    hashtags: ['KeralaFood'],
    locationPincode: '682016',
    pollOptions: [
      { text: 'Puttu + kadala curry', votes: 1680 },
      { text: 'Appam + stew', votes: 1240 },
      { text: 'Idiyappam + egg roast', votes: 840 },
      { text: 'Dosa + sambar', votes: 440 },
    ],
    likeCount: 312,
    commentCount: 88,
    shareCount: 14,
    viewCount: 6200,
    pointsEarned: 25,
  },
  // V6 — Reel
  {
    variant: 'reel',
    owner: 'creator',
    type: ContentType.reel,
    text: '45-sec guide to Fort Kochi in monsoon ☔',
    hashtags: ['FortKochi', 'Reel'],
    locationPincode: '682001',
    media: [
      {
        type: MediaType.video,
        seed: 'fortkochi-reel',
        durationSeconds: 45,
        hlsManifestUrl: null,
      },
    ],
    likeCount: 7120,
    commentCount: 210,
    shareCount: 390,
    viewCount: 42000,
    pointsEarned: 6,
  },
];

// ---------------------------------------------------------------------------
// Upsert helpers
// ---------------------------------------------------------------------------

interface SeedUser {
  firebaseUid: string;
  phone: string;
  name: string;
  username: string;
  primaryPincode: string;
  tier: Tier;
  bio: string;
  interests: string[];
  contentLanguages: string[];
  lifetimePoints: number;
  currentBalance: number;
  streakDays: number;
  isVerified: boolean;
}

async function upsertUser(u: SeedUser) {
  return prisma.user.upsert({
    where: { firebaseUid: u.firebaseUid },
    update: {
      avatarUrl: pravatar(u.username),
      tier: u.tier,
      lifetimePoints: u.lifetimePoints,
      currentBalance: u.currentBalance,
      isVerified: u.isVerified,
      streakDays: u.streakDays,
    },
    create: {
      firebaseUid: u.firebaseUid,
      phone: u.phone,
      name: u.name,
      username: u.username,
      primaryPincode: u.primaryPincode,
      tier: u.tier,
      bio: u.bio,
      interests: u.interests,
      contentLanguages: u.contentLanguages,
      avatarUrl: pravatar(u.username),
      lifetimePoints: u.lifetimePoints,
      currentBalance: u.currentBalance,
      isVerified: u.isVerified,
      streakDays: u.streakDays,
    },
  });
}

/** Insert a welcome_bonus ledger row so /users/me/onboarding-status returns
 * `{complete: true}` and the mobile client skips the tutorial screen. */
async function ensureWelcomeBonus(userId: string) {
  const existing = await prisma.pointsLedger.findFirst({
    where: { userId, actionType: 'welcome_bonus' },
  });
  if (existing) return;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 6);
  await prisma.pointsLedger.create({
    data: {
      userId,
      actionType: 'welcome_bonus',
      points: 250,
      multiplierApplied: 1,
      expiresAt: expires,
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding Playwright fixtures…\n');

  // 1. Users
  const testUser = await upsertUser(TEST_USER);
  console.log(`  ✓ test user @${testUser.username} (${testUser.id})`);

  const creator = await upsertUser(CREATOR);
  console.log(`  ✓ creator @${creator.username} (${creator.id})`);

  const bizOwner = await upsertUser(BIZ_OWNER);
  console.log(`  ✓ biz owner @${bizOwner.username} (${bizOwner.id})`);

  // Skip the onboarding tutorial for all 3 test users by writing a welcome_bonus
  // ledger entry — the mobile app checks GET /users/me/onboarding-status which
  // returns {complete: true} when this row exists.
  for (const u of [testUser, creator, bizOwner]) {
    await ensureWelcomeBonus(u.id);
  }
  console.log(`  ✓ welcome_bonus ledger rows ensured for all 3 users`);

  // 2. Business — find by name first for idempotency (no unique key on name).
  let business = await prisma.business.findFirst({ where: { name: BUSINESS.name } });
  if (!business) {
    business = await prisma.business.create({
      data: {
        ...BUSINESS,
        ownerId: bizOwner.id,
        avatarUrl: picsum('kashi-avatar', 300, 300),
        bannerUrl: picsum('kashi-banner', 1200, 400),
        rating: 4.6,
        reviewCount: 128,
        followerCount: 1240,
      },
    });
    console.log(`  ✓ business "${business.name}" (${business.id})`);
  } else {
    console.log(`  ✓ business "${business.name}" already exists (${business.id})`);
  }

  // 3. Follow relationship — pwtest follows creator.
  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: testUser.id, followingId: creator.id },
    },
    update: {},
    create: { followerId: testUser.id, followingId: creator.id },
  });
  console.log(`  ✓ follow: pwtest → creator`);

  // 4. Posts
  for (let i = 0; i < POST_VARIANTS.length; i++) {
    const v = POST_VARIANTS[i];
    const authorId = v.owner === 'creator' ? creator.id : testUser.id;

    // Idempotency: skip if a post with identical text already exists for this author.
    const existing = await prisma.content.findFirst({
      where: { userId: authorId, text: v.text },
    });
    if (existing) {
      console.log(`  ✓ post ${i + 1} (${v.variant}): already exists`);
      continue;
    }

    const publishedAt = new Date(Date.now() - (i + 1) * 3 * 60 * 60 * 1000); // spread across past 18h

    const post = await prisma.content.create({
      data: {
        userId: authorId,
        type: v.type,
        text: v.text,
        hashtags: v.hashtags,
        locationPincode: v.locationPincode,
        moderationStatus: ModerationStatus.published,
        publishedAt,
        likeCount: v.likeCount,
        commentCount: v.commentCount,
        shareCount: v.shareCount,
        viewCount: v.viewCount,
        pointsEarned: v.pointsEarned,
        businessTagId: v.tagBusiness ? business.id : null,
        commissionPctEarned: v.commissionPctEarned ?? 0,
      },
    });

    // Media attachments
    if (v.media) {
      for (let m = 0; m < v.media.length; m++) {
        const media = v.media[m];
        await prisma.contentMedia.create({
          data: {
            contentId: post.id,
            type: media.type,
            originalUrl:
              media.type === MediaType.video ? SAMPLE_VIDEO_URL : picsum(media.seed),
            thumbnailUrl: picsum(media.seed, 400, 400),
            width: media.type === MediaType.video ? 1080 : 1200,
            height: media.type === MediaType.video ? 1920 : 1200,
            durationSeconds: (media as any).durationSeconds ?? null,
            hlsManifestUrl: (media as any).hlsManifestUrl ?? null,
            sortOrder: m + 1,
            transcodeStatus: TranscodeStatus.complete,
          },
        });
      }
    }

    // Poll options
    if (v.pollOptions) {
      for (let o = 0; o < v.pollOptions.length; o++) {
        const opt = v.pollOptions[o];
        await prisma.pollOption.create({
          data: {
            contentId: post.id,
            text: opt.text,
            sortOrder: o + 1,
            voteCount: opt.votes,
          },
        });
      }
    }

    console.log(`  ✓ post ${i + 1} (${v.variant}): "${v.text.substring(0, 50)}…"`);
  }

  // 5. Offer — local offer at Kashi Bakes Test
  const offerTitle = '20% off cardamom croissant';
  let offer = await prisma.offer.findFirst({
    where: { businessId: business.id, title: offerTitle },
  });
  if (!offer) {
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    offer = await prisma.offer.create({
      data: {
        type: OfferType.local,
        businessId: business.id,
        title: offerTitle,
        description: 'First 50 customers daily. Show claim QR in store.',
        imageUrl: picsum('offer-croissant', 800, 600),
        pointsCost: 200,
        cashValue: 24,
        stock: 50,
        perUserLimit: 1,
        validFrom,
        validUntil,
        isActive: true,
      },
    });
    console.log(`  ✓ offer "${offer.title}"`);
  } else {
    console.log(`  ✓ offer already exists`);
  }

  // 6. Sponsorship proposal — business → creator, pending.
  const existingProposal = await prisma.sponsorshipProposal.findFirst({
    where: { businessId: business.id, creatorId: creator.id, status: SponsorshipStatus.pending },
  });
  if (!existingProposal) {
    await prisma.sponsorshipProposal.create({
      data: {
        businessId: business.id,
        creatorId: creator.id,
        boostAmount: 2500,
        commissionPct: 20,
        status: SponsorshipStatus.pending,
      },
    });
    console.log(`  ✓ sponsorship proposal (pending)`);
  } else {
    console.log(`  ✓ sponsorship proposal already exists`);
  }

  // 7. Watchlist — pwtest watches the business
  await prisma.watchlist.upsert({
    where: {
      userId_businessId: { userId: testUser.id, businessId: business.id },
    },
    update: {},
    create: {
      userId: testUser.id,
      businessId: business.id,
      notifyOnOffers: true,
    },
  });
  console.log(`  ✓ watchlist entry: pwtest → ${business.name}`);

  // 8. Notifications — one unread for pwtest so the bell renders a badge.
  const existingNotif = await prisma.notification.findFirst({
    where: { userId: testUser.id, type: 'welcome' },
  });
  if (!existingNotif) {
    await prisma.notification.create({
      data: {
        userId: testUser.id,
        type: 'welcome',
        title: 'Welcome to Eru!',
        body: 'Tap here to explore your home feed.',
        isRead: false,
      },
    });
    console.log(`  ✓ notification: welcome (unread)`);
  }

  console.log('\n✅ Seed complete.');
  console.log(`   Test user:   @${testUser.username} / Bearer ${testUser.firebaseUid}`);
  console.log(`   Creator:     @${creator.username} / Bearer ${creator.firebaseUid}`);
  console.log(`   Biz owner:   @${bizOwner.username} / Bearer ${bizOwner.firebaseUid}`);
  console.log(`   Business id: ${business.id}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
