import { prisma } from '../utils/prisma.js';

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export const questsService = {
  async getWeeklyProgress(userId: string) {
    const quests = await prisma.quest.findMany({
      where: { isActive: true, period: 'weekly' },
      orderBy: { createdAt: 'asc' },
    });
    const periodStart = startOfCurrentWeek();

    const counts = await Promise.all(
      quests.map(async (q) => {
        const count = await prisma.pointsLedger.count({
          where: {
            userId,
            actionType: q.actionType,
            createdAt: { gte: periodStart },
          },
        });
        return {
          id: q.id,
          title: q.title,
          description: q.description,
          actionType: q.actionType,
          targetCount: q.targetCount,
          rewardPoints: q.rewardPoints,
          currentCount: Math.min(count, q.targetCount),
          completed: count >= q.targetCount,
        };
      }),
    );

    return counts;
  },
};
