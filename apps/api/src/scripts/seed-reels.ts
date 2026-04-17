import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Short, publicly-hosted MP4 test videos from Google's sample bucket (~15s each).
// These are royalty-free and reliable. Perfect for verifying the Reels flow.
const SAMPLE_VIDEOS = [
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
    caption: 'Street food tour of Kochi tonight — ending with Kulfi at Marine Drive. Watch till the end! 🍨 #kochifoodie #kulfi #streetfood',
    hashtags: ['kochifoodie', 'kulfi', 'streetfood', 'kerala'],
    width: 640,
    height: 360,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
    caption: 'Backwaters of Alleppey from a drone — this is why Kerala is called God\'s Own Country 🌴 #alleppey #backwaters #godsowncountry',
    hashtags: ['alleppey', 'backwaters', 'godsowncountry', 'kerala'],
    width: 640,
    height: 360,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    duration: 15,
    caption: 'Typical Monday morning traffic on MG Road, Kochi. 30 seconds you won\'t get back 😅 #kochilife #traffic #monday',
    hashtags: ['kochilife', 'traffic', 'monday'],
    width: 640,
    height: 360,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    duration: 15,
    caption: 'Appam being made the traditional way — crispy edges, soft centre. Save this recipe! 🍚 #appam #keralarecipes #breakfast',
    hashtags: ['appam', 'keralarecipes', 'breakfast', 'food'],
    width: 640,
    height: 360,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    duration: 60,
    caption: 'Day in the life of a Technopark employee — from auto to desk to chai break. #technopark #trivandrum #devlife',
    hashtags: ['technopark', 'trivandrum', 'devlife', 'tech'],
    width: 640,
    height: 360,
  },
];

async function seedReels() {
  console.log('Seeding reels...\n');

  // Round-robin the 5 reels across the demo creators
  const creators = await prisma.user.findMany({
    where: {
      username: {
        in: ['foodiepreethi', 'traveler_ravi', 'meera_clicks', 'techie_arjun', 'lakshmi_cooks'],
      },
    },
    select: { id: true, username: true },
  });

  if (creators.length === 0) {
    console.error('No demo creators found. Run `npm run db:seed` first.');
    process.exit(1);
  }

  const now = new Date();

  for (let i = 0; i < SAMPLE_VIDEOS.length; i++) {
    const video = SAMPLE_VIDEOS[i];
    const creator = creators[i % creators.length];

    // Random published time in the last 48 hours so the feed mixer has variety
    const hoursAgo = Math.random() * 48;
    const publishedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    const reel = await prisma.content.create({
      data: {
        userId: creator.id,
        type: 'reel',
        text: video.caption,
        hashtags: video.hashtags,
        locationPincode: '682016',
        moderationStatus: 'published',
        publishedAt,
        likeCount: Math.floor(50 + Math.random() * 250),
        commentCount: Math.floor(5 + Math.random() * 40),
        shareCount: Math.floor(3 + Math.random() * 20),
        viewCount: Math.floor(200 + Math.random() * 800),
        pointsEarned: 30,
      },
    });

    await prisma.contentMedia.create({
      data: {
        contentId: reel.id,
        type: 'video',
        originalUrl: video.url,
        // MediaConvert is deferred on this account, so we point video*pUrl at
        // the original too — the reel player falls through to originalUrl.
        video360pUrl: video.url,
        video720pUrl: video.url,
        video1080pUrl: video.url,
        // Poster image shown behind <VideoView> while the video loads (and as
        // a graceful fallback if playback fails, e.g. in Expo Go).
        thumbnailUrl: `https://picsum.photos/seed/eru-reel-${reel.id}/640/1136`,
        durationSeconds: video.duration,
        width: video.width,
        height: video.height,
        sortOrder: 1,
        transcodeStatus: 'complete',
      },
    });

    console.log(
      `  @${creator.username}: ${video.duration}s reel — "${video.caption.slice(0, 50)}..."`,
    );
  }

  console.log(`\nDone — ${SAMPLE_VIDEOS.length} reels created across ${creators.length} creators.`);
  await prisma.$disconnect();
}

seedReels().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
