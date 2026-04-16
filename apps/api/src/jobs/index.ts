import cron from 'node-cron';
import { runStreakReminder } from './streakReminder.js';
import { runStreakReset } from './streakReset.js';
import { runPointsExpiry } from './pointsExpiry.js';
import { runLeaderboardReset } from './leaderboardReset.js';
import { runModerationSLA } from './moderationSLA.js';

/**
 * Wraps a job function so that any unhandled error is caught and logged
 * instead of crashing the cron scheduler process.
 */
function safe(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[cron/${name}] Unhandled error:`, err);
    }
  };
}

export function startCronJobs(): void {
  // 8:30 PM IST = 14:30 UTC — remind users about their at-risk streak
  cron.schedule('30 14 * * *', safe('streakReminder', runStreakReminder), {
    timezone: 'UTC',
  });

  // Midnight IST = 18:30 UTC — reset broken streaks
  cron.schedule('30 18 * * *', safe('streakReset', runStreakReset), {
    timezone: 'UTC',
  });

  // 2 AM IST = 20:30 UTC — expire points and send 30-day warnings
  cron.schedule('30 20 * * *', safe('pointsExpiry', runPointsExpiry), {
    timezone: 'UTC',
  });

  // Monday midnight IST = Sunday 18:31 UTC — snapshot and reset weekly leaderboard
  cron.schedule('31 18 * * 0', safe('leaderboardReset', runLeaderboardReset), {
    timezone: 'UTC',
  });

  // Every 5 minutes — check moderation SLA
  cron.schedule('*/5 * * * *', safe('moderationSLA', runModerationSLA), {
    timezone: 'UTC',
  });

  console.log('[cron] All 5 cron jobs scheduled.');
}
