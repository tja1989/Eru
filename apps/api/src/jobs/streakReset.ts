import { prisma } from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';

/**
 * streakReset — runs daily at midnight IST (18:30 UTC).
 *
 * Finds every user whose streakDays > 0 but whose streakLastDate is before
 * yesterday (i.e. they missed at least one full day). Resets their streak
 * to 0 and sends a "streak broken" notification.
 */
export async function runStreakReset(): Promise<void> {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  const usersWithBrokenStreak = await prisma.user.findMany({
    where: {
      streakDays: { gt: 0 },
      streakLastDate: { lt: yesterday },
    },
    select: { id: true, streakDays: true },
  });

  if (usersWithBrokenStreak.length === 0) {
    console.log('[streakReset] No broken streaks found.');
    return;
  }

  console.log(`[streakReset] Resetting streaks for ${usersWithBrokenStreak.length} user(s).`);

  for (const user of usersWithBrokenStreak) {
    // Reset streak in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { streakDays: 0 },
    });

    // Notify the user
    await sendNotification({
      userId: user.id,
      type: 'streak_broken',
      title: 'Your streak was broken 😢',
      body: `You had a ${user.streakDays}-day streak! Start fresh today and build it back up.`,
      priority: 'medium',
      deepLink: 'eru://streak',
    });
  }

  console.log('[streakReset] Done.');
}
