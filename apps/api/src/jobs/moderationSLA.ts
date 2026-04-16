import { prisma } from '../utils/prisma.js';

const SLA_MINUTES = 15;

/**
 * moderationSLA — runs every 5 minutes.
 *
 * Counts moderation_queue entries that have no decision yet (decision = null)
 * and were created more than SLA_MINUTES ago. Logs a warning if any are found
 * so that ops/alerting systems can pick it up.
 */
export async function runModerationSLA(): Promise<void> {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - SLA_MINUTES);

  const overdueCount = await prisma.moderationQueue.count({
    where: {
      decision: null,
      createdAt: { lt: cutoff },
    },
  });

  if (overdueCount > 0) {
    console.warn(
      `[moderationSLA] WARNING: ${overdueCount} moderation item(s) have exceeded the ${SLA_MINUTES}-minute SLA. Immediate review required.`
    );
  } else {
    console.log('[moderationSLA] All moderation items are within SLA.');
  }
}
