import { prisma } from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';

/**
 * streakReminder — runs daily at 8:30 PM IST (14:30 UTC).
 *
 * Finds users who have an active streak (streakDays > 0) but haven't
 * done any activity today (streakLastDate < today). Sends a high-priority
 * "don't lose your streak!" push to nudge them back into the app.
 */
export async function runStreakReminder(): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const usersAtRisk = await prisma.user.findMany({
    where: {
      streakDays: { gt: 0 },
      streakLastDate: { lt: today },
    },
    select: { id: true, streakDays: true },
  });

  if (usersAtRisk.length === 0) {
    console.log('[streakReminder] No at-risk streaks found.');
    return;
  }

  console.log(`[streakReminder] Reminding ${usersAtRisk.length} user(s) about their streak.`);

  for (const user of usersAtRisk) {
    await sendNotification({
      userId: user.id,
      type: 'streak_reminder',
      title: "Don't lose your streak! 🔥",
      body: `You're on a ${user.streakDays}-day streak. Open Eru now to keep it alive!`,
      priority: 'high',
      deepLink: 'eru://streak',
    });
  }

  console.log('[streakReminder] Done.');
}
