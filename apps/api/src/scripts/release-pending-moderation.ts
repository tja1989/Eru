// Phase-1 pilot backfill: flush every post currently stuck in the moderation
// queue. Mirrors the new auto-approve default in routes/content.ts so that
// posts submitted by pilot testers before the default flipped become visible.
//
// Run once with: npx tsx src/scripts/release-pending-moderation.ts
// Safe to re-run — idempotent, only touches rows that are still 'pending'.

import { prisma } from '../utils/prisma.js';

async function main() {
  const pending = await prisma.content.findMany({
    where: { moderationStatus: 'pending' },
    select: { id: true, userId: true, createdAt: true },
  });

  console.log(`Found ${pending.length} pending posts.`);
  if (pending.length === 0) return;

  const now = new Date();
  const ids = pending.map((p) => p.id);

  await prisma.$transaction([
    prisma.content.updateMany({
      where: { id: { in: ids } },
      data: { moderationStatus: 'published', publishedAt: now },
    }),
    prisma.moderationQueue.deleteMany({
      where: { contentId: { in: ids } },
    }),
  ]);

  console.log(`Released ${ids.length} posts to the feed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
