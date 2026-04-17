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

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid },
          { phone },
          { username },
        ],
      },
    });

    if (existing) {
      if (existing.firebaseUid === firebaseUid) throw Errors.conflict('User already registered');
      if (existing.phone === phone) throw Errors.conflict('Phone number already in use');
      if (existing.username === username) throw Errors.conflict('Username already taken');
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
