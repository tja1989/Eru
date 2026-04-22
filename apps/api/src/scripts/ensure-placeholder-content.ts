/**
 * Idempotent seed for the ContentMedia FK anchor.
 *
 * /media/upload writes ContentMedia rows with a sentinel contentId
 * (`00000000-...`) before the real Content row exists. That FK requires a
 * Content row with the sentinel ID to be present; this script creates it if
 * missing so the upload path works on a freshly-wiped database.
 *
 * Usage:
 *   cd apps/api && railway run npx tsx src/scripts/ensure-placeholder-content.ts
 */
import { PrismaClient } from '@prisma/client';
import { ensurePlaceholderContent, PLACEHOLDER_CONTENT_ID } from '../utils/placeholderContent.js';

async function main() {
  console.log(`DB: ${process.env.DATABASE_URL?.replace(/:[^:]+@/, ':***@')}`);
  await ensurePlaceholderContent();
  const prisma = new PrismaClient();
  const row = await prisma.content.findUnique({ where: { id: PLACEHOLDER_CONTENT_ID } });
  console.log('placeholder row present:', row?.id, 'userId:', row?.userId);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
