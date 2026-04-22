/**
 * Danger: wipes every user and all user-scoped data from the connected DB.
 *
 * Intended for a manual reset before real users arrive. Runs against whatever
 * DATABASE_URL is currently set — **double-check** you are NOT pointed at a
 * production URL with real data you care about.
 *
 * Usage:
 *   cd apps/api && npx tsx src/scripts/delete-all-users.ts --yes
 *
 * The --yes flag is mandatory. Running without it prints the row counts and
 * exits, so you can audit before committing to the delete.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CONFIRM_FLAG = '--yes';

async function counts() {
  const [
    users, content, media, interactions, comments, follows, notifications,
    points, rewards, streaks, badges, leaderboard, convs, messages, stories,
    pollOptions, pollVotes, highlights, highlightItems, watchlist,
    modQueue, reports, sponsorships, spin, quests, businesses, offers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.content.count(),
    prisma.contentMedia.count(),
    prisma.interaction.count(),
    prisma.comment.count(),
    prisma.follow.count(),
    prisma.notification.count(),
    prisma.pointsLedger.count(),
    prisma.userReward.count(),
    prisma.streak.count(),
    prisma.userBadge.count(),
    prisma.leaderboardEntry.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.story.count(),
    prisma.pollOption.count(),
    prisma.pollVote.count(),
    prisma.highlight.count(),
    prisma.highlightItem.count(),
    prisma.watchlist.count(),
    prisma.moderationQueue.count(),
    prisma.contentReport.count(),
    prisma.sponsorshipProposal.count(),
    prisma.spinResult.count(),
    prisma.userQuestProgress.count(),
    prisma.business.count(),
    prisma.offer.count(),
  ]);
  return {
    users, content, media, interactions, comments, follows, notifications,
    pointsLedger: points, rewards, streaks, badges, leaderboard,
    conversations: convs, messages, stories, pollOptions, pollVotes,
    highlights, highlightItems, watchlist, moderationQueue: modQueue,
    reports, sponsorships, spin, questProgress: quests, businesses, offers,
  };
}

async function wipe() {
  // Order: children → parents. Prisma does NOT enforce cascade here because
  // `db push` created referential constraints at DB level without onDelete
  // Cascade (except where we set it explicitly in schema.prisma — Content,
  // HighlightItem, Watchlist). Delete children first to avoid P2003 FK errors.

  console.log('→ poll_votes, poll_options');
  await prisma.pollVote.deleteMany({});
  await prisma.pollOption.deleteMany({});

  console.log('→ highlight_items, highlights');
  await prisma.highlightItem.deleteMany({});
  await prisma.highlight.deleteMany({});

  console.log('→ story_views, stories');
  await prisma.storyView.deleteMany({});
  await prisma.story.deleteMany({});

  console.log('→ messages, conversations');
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});

  console.log('→ sponsorship_proposals');
  await prisma.sponsorshipProposal.deleteMany({});

  console.log('→ notifications');
  await prisma.notification.deleteMany({});

  console.log('→ interactions, comments');
  await prisma.interaction.deleteMany({});
  await prisma.comment.deleteMany({});

  console.log('→ follows');
  await prisma.follow.deleteMany({});

  console.log('→ content_reports, moderation_queue');
  await prisma.contentReport.deleteMany({});
  await prisma.moderationQueue.deleteMany({});

  console.log('→ points_ledger');
  await prisma.pointsLedger.deleteMany({});

  console.log('→ user_rewards');
  await prisma.userReward.deleteMany({});

  console.log('→ user_badges');
  await prisma.userBadge.deleteMany({});

  console.log('→ user_quest_progress');
  await prisma.userQuestProgress.deleteMany({});

  console.log('→ spin_results');
  await prisma.spinResult.deleteMany({});

  console.log('→ streaks');
  await prisma.streak.deleteMany({});

  console.log('→ leaderboard_entries');
  await prisma.leaderboardEntry.deleteMany({});

  console.log('→ watchlist');
  await prisma.watchlist.deleteMany({});

  console.log('→ content_media, content');
  await prisma.contentMedia.deleteMany({});
  await prisma.content.deleteMany({});

  console.log('→ offers, businesses');
  await prisma.offer.deleteMany({});
  await prisma.business.deleteMany({});

  console.log('→ users');
  await prisma.user.deleteMany({});
}

async function main() {
  const confirmed = process.argv.includes(CONFIRM_FLAG);

  console.log(`DB: ${process.env.DATABASE_URL?.replace(/:[^:]+@/, ':***@')}`);
  console.log();
  console.log('Current row counts:');
  console.table(await counts());
  console.log();

  if (!confirmed) {
    console.log(`Dry run — pass ${CONFIRM_FLAG} to actually wipe.`);
    return;
  }

  console.log('⚠️  Wiping ALL users and related data...');
  console.log();
  await wipe();
  console.log();
  console.log('✅ Wipe complete. Post-wipe counts:');
  console.table(await counts());
}

main()
  .catch((err) => {
    console.error('Wipe failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
