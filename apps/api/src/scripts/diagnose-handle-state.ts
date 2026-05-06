// One-off diagnostic: dump the relevant onboarding-state fields for a given
// phone so we can see what the route guard is reading from the server side.
//
// Usage:
//   npx tsx src/scripts/diagnose-handle-state.ts +919388480874

import { prisma } from '../utils/prisma.js';

async function run() {
  const phone = process.argv[2];
  if (!phone) {
    console.error('Usage: npx tsx src/scripts/diagnose-handle-state.ts +91xxxxxxxxxx');
    process.exit(1);
  }

  // Show ALL accounts most recently active so we can spot the one being tested.
  const recent = await prisma.user.findMany({
    orderBy: { lastActive: 'desc' },
    take: 5,
    select: {
      id: true,
      phone: true,
      username: true,
      needsHandleChoice: true,
      lastActive: true,
    },
  });
  console.log('--- 5 most-recently-active users ---');
  for (const u of recent) {
    console.log(
      `${u.phone}\t${u.username}\tneedsHandle=${u.needsHandleChoice}\tlastActive=${u.lastActive?.toISOString() ?? 'null'}`,
    );
  }
  console.log('');

  const user = await prisma.user.findFirst({
    where: { phone },
    select: {
      id: true,
      phone: true,
      name: true,
      username: true,
      firebaseUid: true,
      needsHandleChoice: true,
      createdAt: true,
      lastActive: true,
    },
  });

  if (!user) {
    console.log(`No user found for phone=${phone}`);
    return;
  }

  const welcomeBonus = await prisma.pointsLedger.findFirst({
    where: { userId: user.id, actionType: 'welcome_bonus' },
    select: { id: true, createdAt: true },
  });

  console.log('--- Account state ---');
  console.log(JSON.stringify(user, null, 2));
  console.log('--- Onboarding ---');
  console.log(`hasWelcomeBonus (= onboarding.complete): ${welcomeBonus !== null}`);
  if (welcomeBonus) console.log(`welcomeBonus.createdAt: ${welcomeBonus.createdAt.toISOString()}`);
  console.log('--- Derived gate decisions (mobile) ---');
  const usernameIsReal = user.username && !user.username.startsWith('pending_');
  console.log(`usernameIsReal: ${usernameIsReal}`);
  console.log(`onboardingStatus.needsHandleChoice: ${user.needsHandleChoice}`);
  console.log(`onboardingStatus.complete: ${welcomeBonus !== null}`);
  console.log(`Expected first route after OTP: ${
    user.needsHandleChoice
      ? '/(auth)/personalize (needsHandleChoice=true)'
      : welcomeBonus !== null
      ? '/(tabs)'
      : '/(auth)/personalize (onboarding.complete=false)'
  }`);
}

run()
  .catch((e) => {
    console.error('diagnose failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
