import { PrismaClient, Tier, UserRole, ModerationStatus, ContentType } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const ADMIN_USER = {
  firebaseUid: 'seed-admin-firebase-uid',
  phone: '+919400000000',
  name: 'Eru Admin',
  username: 'eru_admin',
  primaryPincode: '682016',
  tier: Tier.champion,
  role: UserRole.admin,
  lifetimePoints: 10000,
  currentBalance: 10000,
  bio: 'Official Eru platform admin account.',
  interests: ['tech', 'community'],
  contentLanguages: ['en', 'ml'],
};

const DEMO_CREATORS = [
  {
    firebaseUid: 'seed-creator-1-uid',
    phone: '+919400000001',
    name: 'Preethi Nair',
    username: 'foodiepreethi',
    primaryPincode: '682016',
    tier: Tier.influencer,
    bio: 'Kerala food blogger 🍛 Sharing recipes from my Kochi kitchen.',
    interests: ['food', 'cooking', 'culture'],
    contentLanguages: ['en', 'ml'],
    posts: [
      {
        text: 'Made the perfect Kerala fish curry today! The key is fresh coconut milk and a good piece of karimeen. This dish reminds me of Sunday afternoons at my grandmother\'s house in Vypeen. #KeralaFood #FishCurry #HomeCooking #Kochi',
        hashtags: ['KeralaFood', 'FishCurry', 'HomeCooking', 'Kochi'],
        locationPincode: '682016',
      },
      {
        text: 'Puttu and kadala curry — the breakfast that fuels Kerala. I add a pinch of cinnamon to the chickpea masala and the whole family fights over the last portion 😄 Try this at home! #Puttu #BreakfastGoals #KeralaBreakfast',
        hashtags: ['Puttu', 'BreakfastGoals', 'KeralaBreakfast'],
        locationPincode: '682016',
      },
      {
        text: 'Found the best sadhya outside of a temple festival — 24 dishes on a banana leaf at this small restaurant in Ernakulam. Every item perfectly balanced. Onam may be months away but sadhya season never ends for us Keralites! #Sadhya #OnamVibes #BananaLeaf',
        hashtags: ['Sadhya', 'OnamVibes', 'BananaLeaf'],
        locationPincode: '682016',
      },
    ],
  },
  {
    firebaseUid: 'seed-creator-2-uid',
    phone: '+919400000002',
    name: 'Ravi Menon',
    username: 'traveler_ravi',
    primaryPincode: '695001',
    tier: Tier.influencer,
    bio: 'Exploring God\'s Own Country one backwater at a time 🛶',
    interests: ['travel', 'photography', 'nature'],
    contentLanguages: ['en', 'ml'],
    posts: [
      {
        text: 'Sunrise over Vembanad Lake this morning — got up at 5 AM and it was absolutely worth it. The mist, the silence, the sound of oars dipping into still water. This is why Kerala is called God\'s Own Country. #Vembanad #Backwaters #SunrisePhotography #Kerala',
        hashtags: ['Vembanad', 'Backwaters', 'SunrisePhotography', 'Kerala'],
        locationPincode: '686001',
      },
      {
        text: 'Spent the weekend at Munnar tea estates. The rolling green hills covered in tea plants, the cool mountain air at 1600m elevation — completely different Kerala from the coast. Visited the Tea Museum and learned the whole process from leaf to cup. #Munnar #TeaGarden #HillStation',
        hashtags: ['Munnar', 'TeaGarden', 'HillStation'],
        locationPincode: '685612',
      },
      {
        text: 'Theyyam season is upon us in North Malabar! Witnessed the Kanathur Theyyam last night — a 6-hour ritual where the performer literally becomes the deity. The costume, the makeup, the fire — I was speechless. This is living heritage. #Theyyam #Malabar #KeralaFestivals #Culture',
        hashtags: ['Theyyam', 'Malabar', 'KeralaFestivals', 'Culture'],
        locationPincode: '670001',
      },
    ],
  },
  {
    firebaseUid: 'seed-creator-3-uid',
    phone: '+919400000003',
    name: 'Meera Krishnan',
    username: 'meera_clicks',
    primaryPincode: '682001',
    tier: Tier.engager,
    bio: 'Street photographer. Capturing Kochi one frame at a time 📷',
    interests: ['photography', 'art', 'street-culture'],
    contentLanguages: ['en', 'ml'],
    posts: [
      {
        text: 'Fort Kochi\'s famous Chinese fishing nets at golden hour — I\'ve photographed these hundreds of times and they never get old. The geometry of the nets against a tangerine sky, fishermen silhouetted against the light. No filter needed. #FortKochi #ChineseFishingNets #GoldenHour',
        hashtags: ['FortKochi', 'ChineseFishingNets', 'GoldenHour'],
        locationPincode: '682001',
      },
      {
        text: 'Jew Town, Mattancherry on a quiet Tuesday morning. The antique shops are still opening, spice merchants are weighing their stock, and an old man reads the newspaper outside the synagogue. This corner of Kochi holds 500 years of history. #Mattancherry #JewTown #KochiHeritage',
        hashtags: ['Mattancherry', 'JewTown', 'KochiHeritage'],
        locationPincode: '682002',
      },
      {
        text: 'Captured this beautiful moment at the Thrissur Pooram preparation — the elephants are decorated for 8 hours before the procession and the level of craftsmanship in the caparisons (the decorated cloth coverings) is extraordinary. 80 caparisoned elephants in one place is a sight I will never forget. #ThrissurPooram #Elephants #KeralaFestival',
        hashtags: ['ThrissurPooram', 'Elephants', 'KeralaFestival'],
        locationPincode: '680001',
      },
    ],
  },
  {
    firebaseUid: 'seed-creator-4-uid',
    phone: '+919400000004',
    name: 'Arjun Pillai',
    username: 'techie_arjun',
    primaryPincode: '682030',
    tier: Tier.engager,
    bio: 'Software dev in Technopark, Trivandrum. Writing about tech + Kerala startup scene.',
    interests: ['tech', 'startups', 'gadgets'],
    contentLanguages: ['en'],
    posts: [
      {
        text: 'Technopark Trivandrum now has over 70,000 tech professionals — it\'s the largest IT park in India by employment. Yet most people outside Kerala don\'t know it exists. The Kerala startup ecosystem is quietly building something real. Anyone else here from the park? #Technopark #Trivandrum #TechKeala #Startups',
        hashtags: ['Technopark', 'Trivandrum', 'TechKerala', 'Startups'],
        locationPincode: '695581',
      },
      {
        text: 'Just attended the Kerala Blockchain Academy graduation — Kerala government is training 50,000 people in blockchain technology. Love or hate the technology, training this many people in emerging tech is a serious investment. Other states should take note. #KeralaBlockchain #GovTech #Kerala',
        hashtags: ['KeralaBlockchain', 'GovTech', 'Kerala'],
        locationPincode: '695001',
      },
      {
        text: 'Built a small app this weekend to track KSRTC bus timings in real time using the public API — it\'s rough but works! The KSRTC API is surprisingly well-documented for a government service. Kerala\'s digital infrastructure surprises me every time. #KSRTC #Kerala #OpenData #WeekendProject',
        hashtags: ['KSRTC', 'Kerala', 'OpenData', 'WeekendProject'],
        locationPincode: '682030',
      },
    ],
  },
  {
    firebaseUid: 'seed-creator-5-uid',
    phone: '+919400000005',
    name: 'Lakshmi Varma',
    username: 'lakshmi_cooks',
    primaryPincode: '680001',
    tier: Tier.explorer,
    bio: 'Thrissur amma cooking traditional Kerala recipes my mother taught me 🌿',
    interests: ['cooking', 'food', 'culture', 'family'],
    contentLanguages: ['ml', 'en'],
    posts: [
      {
        text: 'Olan — the simplest, most humble dish in the Kerala sadya, and somehow the one everyone remembers most. White gourd, red cowpeas, coconut milk, a few green chillies, and coconut oil poured over the top at the very end. The coconut oil step is not optional. #Olan #KeralaRecipes #Sadya #ThrissurFood',
        hashtags: ['Olan', 'KeralaRecipes', 'Sadya', 'ThrissurFood'],
        locationPincode: '680001',
      },
      {
        text: 'My mother\'s payasam recipe has no measurements — she taught me with her hands. "A fist of rice, enough jaggery to smell right, coconut milk until it looks rich." I finally wrote it down today before this knowledge disappears. Traditions are worth preserving. #Payasam #KeralaSweets #FamilyRecipes',
        hashtags: ['Payasam', 'KeralaSweets', 'FamilyRecipes'],
        locationPincode: '680001',
      },
      {
        text: 'Harvested turmeric from my small backyard garden this morning — fresh turmeric is so different from the powder. Bright orange inside, fragrant, almost floral. Going to make a small batch of fresh turmeric pickle today. Growing your own spices connects you to the food in a different way. #Turmeric #HomeGarden #KeralaSpices',
        hashtags: ['Turmeric', 'HomeGarden', 'KeralaSpices'],
        locationPincode: '680001',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log('Starting database seed...\n');

  // 1. Upsert admin user
  console.log('Creating admin user...');
  const admin = await prisma.user.upsert({
    where: { username: ADMIN_USER.username },
    update: {},
    create: {
      firebaseUid: ADMIN_USER.firebaseUid,
      phone: ADMIN_USER.phone,
      name: ADMIN_USER.name,
      username: ADMIN_USER.username,
      primaryPincode: ADMIN_USER.primaryPincode,
      tier: ADMIN_USER.tier,
      role: ADMIN_USER.role,
      lifetimePoints: ADMIN_USER.lifetimePoints,
      currentBalance: ADMIN_USER.currentBalance,
      bio: ADMIN_USER.bio,
      interests: ADMIN_USER.interests,
      contentLanguages: ADMIN_USER.contentLanguages,
    },
  });
  console.log(`  ✓ Admin user: @${admin.username} (${admin.role}, ${admin.tier} tier)`);

  // 2. Upsert demo creators and their posts
  let totalPosts = 0;

  for (const creatorData of DEMO_CREATORS) {
    console.log(`\nCreating creator: @${creatorData.username}...`);

    const creator = await prisma.user.upsert({
      where: { username: creatorData.username },
      update: {},
      create: {
        firebaseUid: creatorData.firebaseUid,
        phone: creatorData.phone,
        name: creatorData.name,
        username: creatorData.username,
        primaryPincode: creatorData.primaryPincode,
        tier: creatorData.tier,
        bio: creatorData.bio,
        interests: creatorData.interests,
        contentLanguages: creatorData.contentLanguages,
        lifetimePoints: Math.floor(Math.random() * 2000) + 500,
        currentBalance: Math.floor(Math.random() * 1000) + 100,
      },
    });

    console.log(`  ✓ User: @${creator.username} (${creator.tier} tier)`);

    // Create 3 posts per creator
    for (let i = 0; i < creatorData.posts.length; i++) {
      const postData = creatorData.posts[i];

      // Use a stable content-based key for idempotency
      // We check if a post with this exact text already exists for this user
      const existing = await prisma.content.findFirst({
        where: {
          userId: creator.id,
          text: postData.text,
        },
      });

      if (existing) {
        console.log(`  ✓ Post ${i + 1}: already exists, skipping`);
        totalPosts++;
        continue;
      }

      const publishedAt = new Date();
      publishedAt.setDate(publishedAt.getDate() - (i * 3 + Math.floor(Math.random() * 5)));

      await prisma.content.create({
        data: {
          userId: creator.id,
          type: ContentType.post,
          text: postData.text,
          hashtags: postData.hashtags,
          locationPincode: postData.locationPincode,
          moderationStatus: ModerationStatus.published,
          publishedAt: publishedAt,
          likeCount: Math.floor(Math.random() * 150) + 10,
          commentCount: Math.floor(Math.random() * 30) + 2,
          shareCount: Math.floor(Math.random() * 20),
          viewCount: Math.floor(Math.random() * 800) + 50,
          pointsEarned: Math.floor(Math.random() * 100) + 10,
        },
      });

      console.log(`  ✓ Post ${i + 1}: "${postData.text.substring(0, 60)}..."`);
      totalPosts++;
    }
  }

  console.log('\n-----------------------------------------');
  console.log('Seed complete!');
  console.log(`  Admin users:   1`);
  console.log(`  Demo creators: ${DEMO_CREATORS.length}`);
  console.log(`  Posts created: ${totalPosts}`);
  console.log('-----------------------------------------\n');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
