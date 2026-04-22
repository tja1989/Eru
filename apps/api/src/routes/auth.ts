import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { registerSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { rateLimitByIp } from '../middleware/rateLimit.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', {
    preHandler: [rateLimitByIp(5, '1 m')],
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { firebaseUid, phone, name, username } = parsed.data;

    // Username collision — always a hard conflict.
    const byUsername = await prisma.user.findUnique({ where: { username } });
    if (byUsername && byUsername.phone !== phone) {
      throw Errors.conflict('Username already taken');
    }

    // firebaseUid already in use but for a different phone — genuine duplicate.
    const byUid = await prisma.user.findUnique({ where: { firebaseUid } });
    if (byUid) throw Errors.conflict('User already registered');

    // Phone already in use — adopt the existing record instead of failing.
    // Covers the "changed auth provider" case: a user who first registered via
    // the dev-token bypass and is now signing in via Firebase with a fresh
    // UID. Firebase Phone Auth has verified the phone, so the caller is the
    // account owner. We update firebaseUid + let them re-assert name/username.
    const byPhone = await prisma.user.findUnique({ where: { phone } });
    if (byPhone) {
      const updated = await prisma.user.update({
        where: { id: byPhone.id },
        data: { firebaseUid, name, username },
      });
      return reply.status(200).send({
        user: {
          id: updated.id,
          name: updated.name,
          username: updated.username,
          phone: updated.phone,
          tier: updated.tier,
          currentBalance: updated.currentBalance,
          createdAt: updated.createdAt.toISOString(),
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        phone,
        name,
        username,
        primaryPincode: '000000',
      },
    });

    return reply.status(201).send({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        tier: user.tier,
        currentBalance: user.currentBalance,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  app.post('/auth/logout', async (request, reply) => {
    if (request.userId) {
      await prisma.user.update({
        where: { id: request.userId },
        data: { fcmToken: null },
      }).catch(() => {});
    }
    return { success: true };
  });
}
