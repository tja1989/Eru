import { prisma } from '../utils/prisma.js';

async function main() {
  // Sample businesses
  const biz1 = await prisma.business.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Kashi Bakes',
      category: 'Artisan Bakery',
      pincode: '682016',
      address: 'MG Road, Ernakulam',
      phone: '+919843215678',
      rating: 4.7 as any,
      reviewCount: 287,
      isVerified: true,
    },
  });

  // Sample offers
  await prisma.offer.upsert({
    where: { id: '22222222-2222-2222-2222-222222222221' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222221',
      type: 'local',
      businessId: biz1.id,
      title: '20% off all cakes',
      description: 'Valid Fri–Sun',
      pointsCost: 200,
      cashValue: 50 as any,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2027-01-01'),
    },
  });

  await prisma.offer.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      type: 'giftcard',
      title: 'Amazon ₹100',
      pointsCost: 1000,
      cashValue: 100 as any,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2027-01-01'),
    },
  });

  // Sample quests (weekly)
  await prisma.quest.upsert({
    where: { id: '33333333-3333-3333-3333-333333333331' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333331',
      title: 'Read 5 articles',
      actionType: 'read_article',
      targetCount: 5,
      rewardPoints: 25,
      period: 'weekly',
    },
  });
  await prisma.quest.upsert({
    where: { id: '33333333-3333-3333-3333-333333333332' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333332',
      title: 'Share 3 posts',
      actionType: 'share',
      targetCount: 3,
      rewardPoints: 30,
      period: 'weekly',
    },
  });

  // Sample badges
  await prisma.badge.upsert({
    where: { code: 'first_purchase' },
    update: {},
    create: {
      code: 'first_purchase',
      title: 'First Purchase',
      description: 'Claim your first reward',
      emoji: '🛍️',
      unlockRule: { type: 'rewards_claimed', threshold: 1 },
    },
  });
  await prisma.badge.upsert({
    where: { code: 'streak_7' },
    update: {},
    create: {
      code: 'streak_7',
      title: '7-Day Streak',
      description: 'Check in 7 days in a row',
      emoji: '🔥',
      unlockRule: { type: 'streak_days', threshold: 7 },
    },
  });

  console.log('Seeded rewards, quests, and badges.');
}

main().finally(() => prisma.$disconnect());
