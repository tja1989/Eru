import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { leaderboardQuerySchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { getLeaderboard, getUserRank } from '../services/leaderboardService.js';

export async function leaderboardRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // -------------------------------------------------------------------------
  // GET /leaderboard — top N users for a given scope and pincode
  // -------------------------------------------------------------------------
  app.get('/leaderboard', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = leaderboardQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { scope, pincode } = parsed.data;

    // If pincode not provided, fall back to the authenticated user's pincode
    let resolvedPincode = pincode;
    if (!resolvedPincode) {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { primaryPincode: true },
      });
      if (!user) throw Errors.notFound('User');
      resolvedPincode = user.primaryPincode;
    }

    const rankings = await getLeaderboard(resolvedPincode, scope);

    return { rankings, scope, pincode: resolvedPincode };
  });

  // -------------------------------------------------------------------------
  // GET /leaderboard/me — the current user's rank and score
  // -------------------------------------------------------------------------
  app.get('/leaderboard/me', async (request) => {
    const userId = request.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryPincode: true },
    });

    if (!user) throw Errors.notFound('User');

    // Default scope is pincode — the most local leaderboard
    const scope = 'pincode';
    const result = await getUserRank(userId, user.primaryPincode, scope);

    return { ...result, scope, pincode: user.primaryPincode };
  });

  // -------------------------------------------------------------------------
  // GET /season/current — current season (quarterly) with countdown
  // -------------------------------------------------------------------------
  app.get('/season/current', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Determine which quarter we're in (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
    const quarter = Math.floor(month / 3) + 1;

    const quarterStartMonth = (quarter - 1) * 3; // 0-indexed month
    const quarterEndMonth = quarter * 3 - 1;      // 0-indexed month

    const seasonStart = new Date(year, quarterStartMonth, 1);
    const seasonEnd = new Date(year, quarterEndMonth + 1, 0, 23, 59, 59, 999); // Last day of quarter

    const msUntilEnd = seasonEnd.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msUntilEnd / (1000 * 60 * 60 * 24));

    const seasonName = `Q${quarter} ${year}`;

    return {
      name: seasonName,
      quarter,
      year,
      startDate: seasonStart.toISOString(),
      endDate: seasonEnd.toISOString(),
      daysRemaining: Math.max(0, daysRemaining),
    };
  });

}
