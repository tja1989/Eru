import 'dotenv/config';
import { PrismaClient, ContentType, MediaType } from '@prisma/client';

const prisma = new PrismaClient();

// Ordered replacement URLs — one per reel. All HTTP 200 verified (W3Schools +
// test-videos.co.uk). The original Google `gtv-videos-bucket` URLs started
// returning 403 and caused ExoPlayer "playback exception" on the device.
const REPLACEMENT_URLS = [
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
  'https://www.w3schools.com/html/movie.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
];

async function fix() {
  console.log('Fixing reel video URLs...\n');

  // Find every video ContentMedia that belongs to a reel Content, ordered
  // deterministically so the same URL keeps being assigned to the same reel
  // across re-runs.
  const reelMedia = await prisma.contentMedia.findMany({
    where: {
      type: MediaType.video,
      content: { type: ContentType.reel },
    },
    orderBy: { contentId: 'asc' },
    select: { id: true, contentId: true, originalUrl: true },
  });

  console.log(`Found ${reelMedia.length} reel media record(s).\n`);

  let fixed = 0;
  for (let i = 0; i < reelMedia.length; i++) {
    const m = reelMedia[i];
    const newUrl = REPLACEMENT_URLS[i % REPLACEMENT_URLS.length];

    if (m.originalUrl === newUrl) {
      console.log(`  - ${m.contentId.slice(0, 8)}… already has correct URL, skipping`);
      continue;
    }

    await prisma.contentMedia.update({
      where: { id: m.id },
      data: {
        originalUrl: newUrl,
        video360pUrl: newUrl,
        video720pUrl: newUrl,
        video1080pUrl: newUrl,
      },
    });
    console.log(`  ✓ ${m.contentId.slice(0, 8)}… → ${newUrl}`);
    fixed++;
  }

  console.log('\n-----------------------------------------');
  console.log(`Fix complete! ${fixed} record(s) updated.`);
  console.log('-----------------------------------------\n');
}

fix()
  .catch((err) => {
    console.error('Fix failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
