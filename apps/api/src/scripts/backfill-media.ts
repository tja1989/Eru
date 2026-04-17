import 'dotenv/config';
import { PrismaClient, MediaType, ContentType, TranscodeStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic placeholder URLs — same input always yields the same image.
const pravatar = (username: string) => `https://i.pravatar.cc/300?u=${username}`;
const picsumPost = (seed: string) => `https://picsum.photos/seed/eru-${seed}/1200/1200`;
const picsumPostThumb = (seed: string) => `https://picsum.photos/seed/eru-${seed}/400/400`;
const picsumReelPoster = (seed: string) => `https://picsum.photos/seed/eru-reel-${seed}/640/1136`;

const DEMO_USERNAMES = [
  'foodiepreethi',
  'traveler_ravi',
  'meera_clicks',
  'techie_arjun',
  'lakshmi_cooks',
];

async function backfill() {
  console.log('Backfilling media for demo data...\n');

  // -------------------------------------------------------------------------
  // 1. User avatars — set avatarUrl where null
  // -------------------------------------------------------------------------
  let avatarsUpdated = 0;
  for (const username of DEMO_USERNAMES) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, avatarUrl: true },
    });
    if (!user) {
      console.log(`  - @${username}: not found, skipping`);
      continue;
    }
    if (user.avatarUrl) {
      console.log(`  - @${username}: avatar already set`);
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: pravatar(username) },
    });
    console.log(`  ✓ @${username}: avatar set`);
    avatarsUpdated++;
  }

  // -------------------------------------------------------------------------
  // 2. Post media — insert one ContentMedia per type='post' that has none
  // -------------------------------------------------------------------------
  const postsWithoutMedia = await prisma.content.findMany({
    where: {
      type: ContentType.post,
      media: { none: {} },
    },
    select: { id: true, text: true },
  });

  let postsMediaInserted = 0;
  for (const post of postsWithoutMedia) {
    await prisma.contentMedia.create({
      data: {
        contentId: post.id,
        type: MediaType.image,
        originalUrl: picsumPost(post.id),
        thumbnailUrl: picsumPostThumb(post.id),
        width: 1200,
        height: 1200,
        sortOrder: 1,
        transcodeStatus: TranscodeStatus.complete,
      },
    });
    postsMediaInserted++;
  }
  console.log(`\n  ✓ ${postsMediaInserted} post-media records inserted`);

  // -------------------------------------------------------------------------
  // 3. Reel thumbnails — set thumbnailUrl where null on video media
  // -------------------------------------------------------------------------
  const reelMediaMissingThumbs = await prisma.contentMedia.findMany({
    where: {
      type: MediaType.video,
      thumbnailUrl: null,
      content: { type: ContentType.reel },
    },
    select: { id: true, contentId: true },
  });

  let thumbsSet = 0;
  for (const m of reelMediaMissingThumbs) {
    await prisma.contentMedia.update({
      where: { id: m.id },
      data: { thumbnailUrl: picsumReelPoster(m.contentId) },
    });
    thumbsSet++;
  }
  console.log(`  ✓ ${thumbsSet} reel-thumbnails set`);

  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------');
  console.log('Backfill complete!');
  console.log(`  Avatars updated:         ${avatarsUpdated}`);
  console.log(`  Post media inserted:     ${postsMediaInserted}`);
  console.log(`  Reel thumbnails set:     ${thumbsSet}`);
  console.log('-----------------------------------------\n');
}

backfill()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
