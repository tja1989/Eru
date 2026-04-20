import { prisma } from '../utils/prisma.js';

export interface ClearDemoMediaOptions {
  dryRun: boolean;
}

export interface ClearDemoMediaReport {
  contentToDelete: number;
  mediaToDelete: number;
  contentDeleted: number;
  mediaDeleted: number;
  interactionsDeleted: number;
  commentsDeleted: number;
  moderationQueueDeleted: number;
  highlightItemsDeleted: number;
  pollVotesDeleted: number;
  sponsorshipProposalsCleared: number;
  durationMs: number;
}

/**
 * clearDemoMedia — wipes ALL Content + ContentMedia rows from the database
 * (in FK-safe order) while preserving users, follows, points, badges, etc.
 *
 * Used to reset the demo / production database before re-uploading media so
 * the new HLS pipeline populates fresh variant URLs from scratch.
 */
export async function clearDemoMedia(opts: ClearDemoMediaOptions): Promise<ClearDemoMediaReport> {
  const start = Date.now();

  const contentToDelete = await prisma.content.count();
  const mediaToDelete = await prisma.contentMedia.count();

  const report: ClearDemoMediaReport = {
    contentToDelete,
    mediaToDelete,
    contentDeleted: 0,
    mediaDeleted: 0,
    interactionsDeleted: 0,
    commentsDeleted: 0,
    moderationQueueDeleted: 0,
    highlightItemsDeleted: 0,
    pollVotesDeleted: 0,
    sponsorshipProposalsCleared: 0,
    durationMs: 0,
  };

  if (opts.dryRun) {
    report.durationMs = Date.now() - start;
    return report;
  }

  // FK-safe order: child rows that don't cascade from Content first.
  const interactions = await prisma.interaction.deleteMany({});
  report.interactionsDeleted = interactions.count;

  const comments = await prisma.comment.deleteMany({});
  report.commentsDeleted = comments.count;

  const modQ = await prisma.moderationQueue.deleteMany({});
  report.moderationQueueDeleted = modQ.count;

  const highlightItems = await prisma.highlightItem.deleteMany({});
  report.highlightItemsDeleted = highlightItems.count;

  // PollVote depends on PollOption; PollOption cascades from Content.
  const pollVotes = await prisma.pollVote.deleteMany({});
  report.pollVotesDeleted = pollVotes.count;

  // SponsorshipProposal.contentId is nullable + has no cascade. Null it out
  // so the proposal record (a business decision) survives the media wipe.
  const sponsorships = await prisma.sponsorshipProposal.updateMany({
    where: { contentId: { not: null } },
    data: { contentId: null },
  });
  report.sponsorshipProposalsCleared = sponsorships.count;

  // Now safe to nuke Content. Cascades take care of:
  // ContentMedia, PollOption, ContentReport, PointsLedger, threadChildren.
  const content = await prisma.content.deleteMany({});
  report.contentDeleted = content.count;

  // Media count after — should be 0 since cascade removed them.
  report.mediaDeleted = mediaToDelete - (await prisma.contentMedia.count());

  report.durationMs = Date.now() - start;
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = !process.argv.includes('--apply');
  if (!dryRun) {
    console.log('[clear-demo-media] DESTRUCTIVE MODE — deleting all Content + ContentMedia rows');
  } else {
    console.log('[clear-demo-media] dry-run mode — pass --apply to actually delete');
  }
  clearDemoMedia({ dryRun })
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
