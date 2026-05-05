// Backfill: rename users with phone-derived `user_<10digits>` usernames to
// memorable adjective_noun_NNN handles. Idempotent — re-running picks up
// only rows still matching the legacy pattern.
//
// Run from apps/api:
//   npx tsx src/scripts/backfill-handles.ts > handle-backfill.log
//
// Why we ALSO set needsHandleChoice: false — these users predate the new
// onboarding flow. Forcing them through Personalize on next login would be
// hostile. They land with a clean handle they can edit later in Settings.

import { prisma } from '../utils/prisma.js';

const ADJ = [
  'swift', 'quiet', 'bold', 'bright', 'calm', 'clever', 'eager', 'fierce',
  'gentle', 'happy', 'jolly', 'keen', 'lively', 'merry', 'noble',
  'proud', 'rapid', 'sharp', 'sunny', 'wise',
];
const NOUN = [
  'panda', 'otter', 'falcon', 'tiger', 'heron', 'koala', 'lynx', 'dolphin',
  'eagle', 'fox', 'owl', 'wolf', 'hawk', 'seal', 'swan', 'rabbit',
  'badger', 'beaver', 'crane', 'gecko',
];

function generate(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  const d = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  // e.g. swift_panda_472 — 14 chars, lowercase, valid per usernameSchema.
  return `${a}_${n}_${d}`;
}

async function findFreshHandle(): Promise<string | null> {
  for (let i = 0; i < 8; i++) {
    const cand = generate();
    const clash = await prisma.user.findUnique({
      where: { username: cand },
      select: { id: true },
    });
    if (!clash) return cand;
  }
  return null;
}

async function run() {
  // Pass 1 — rename phone-derived handles to memorable ones.
  const candidates = await prisma.user.findMany({
    where: { username: { startsWith: 'user_' } },
    select: { id: true, username: true },
  });
  const targets = candidates.filter((u) => /^user_\d{10}$/.test(u.username));

  console.log(`Found ${targets.length} user_<10digits> rows to rename.`);

  let renamed = 0;
  let skipped = 0;
  for (const u of targets) {
    const next = await findFreshHandle();
    if (!next) {
      console.warn(`Could not generate a unique handle for ${u.id} after 8 tries — skipping`);
      skipped++;
      continue;
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { username: next, needsHandleChoice: false },
    });
    console.log(`${u.username}\t→\t${next}`);
    renamed++;
  }

  // Pass 2 — clear needsHandleChoice for any pre-existing user that already
  // has a real (non-`pending_*`) handle. The schema added the column with
  // `@default(true)` for safety on new rows, which side-effected every old
  // row into "needs to pick a handle" — without this pass, returning users
  // would get bounced to Personalize on next login.
  const cleared = await prisma.user.updateMany({
    where: {
      needsHandleChoice: true,
      username: { not: { startsWith: 'pending_' } },
    },
    data: { needsHandleChoice: false },
  });
  console.log(`Cleared needsHandleChoice on ${cleared.count} pre-existing real-handle users.`);

  console.log(`Done. Renamed=${renamed} Skipped=${skipped} FlagsCleared=${cleared.count}`);
}

run()
  .catch((e) => {
    console.error('backfill-handles failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
