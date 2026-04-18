import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';

function todayDate() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const spinService = {
  async canSpin(userId: string): Promise<boolean> {
    const existing = await prisma.spinResult.findUnique({
      where: { userId_spinDate: { userId, spinDate: todayDate() } },
    });
    return !existing;
  },

  async spin(userId: string) {
    const today = todayDate();
    const exists = await prisma.spinResult.findUnique({
      where: { userId_spinDate: { userId, spinDate: today } },
    });
    if (exists) throw Errors.conflict('You have already spun today');

    const pointsAwarded = Math.floor(Math.random() * 50) + 1;

    await prisma.$transaction([
      prisma.spinResult.create({
        data: { userId, spinDate: today, pointsAwarded },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { currentBalance: { increment: pointsAwarded } },
      }),
      prisma.pointsLedger.create({
        data: {
          userId,
          actionType: 'daily_spin',
          points: pointsAwarded,
          multiplierApplied: 1.0 as any,
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return { pointsAwarded };
  },
};
