import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import { registerSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { rateLimitByIp } from '../middleware/rateLimit.js';

// Server-side placeholder username generator. The real handle is picked by
// the user on the Personalize screen via PATCH /users/me. Format: `pending_`
// followed by 10 hex chars — the validator's reserved-prefix refine rejects
// any user-chosen handle that starts with `pending_`, keeping this namespace
// internal. Collision-safe by retry; uniqueness is enforced at the DB level.
async function generatePlaceholderUsername(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const candidate = `pending_${crypto.randomBytes(5).toString('hex')}`;
    const clash = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  throw new Error('Could not generate unique placeholder username after 8 tries');
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', {
    preHandler: [rateLimitByIp(5, '1 m')],
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { firebaseUid, phone, name } = parsed.data;

    // firebaseUid already in use but for a different phone — genuine duplicate.
    const byUid = await prisma.user.findUnique({ where: { firebaseUid } });
    if (byUid) throw Errors.conflict('User already registered');

    // Phone already in use — adopt the existing record instead of failing.
    // Covers the "changed auth provider" case: a user who first registered via
    // the dev-token bypass and is now signing in via Firebase with a fresh
    // UID. Firebase Phone Auth has verified the phone, so the caller is the
    // account owner. Critical: do NOT overwrite an existing real username
    // with a fresh placeholder — that would erase a handle the user already
    // picked. Just refresh firebaseUid and name; preserve username and the
    // needsHandleChoice flag.
    const byPhone = await prisma.user.findUnique({ where: { phone } });
    if (byPhone) {
      const updated = await prisma.user.update({
        where: { id: byPhone.id },
        data: { firebaseUid, name },
      });
      return reply.status(200).send({
        user: {
          id: updated.id,
          name: updated.name,
          username: updated.username,
          phone: updated.phone,
          tier: updated.tier,
          currentBalance: updated.currentBalance,
          needsHandleChoice: updated.needsHandleChoice,
          createdAt: updated.createdAt.toISOString(),
        },
      });
    }

    const placeholder = await generatePlaceholderUsername();
    const user = await prisma.user.create({
      data: {
        firebaseUid,
        phone,
        name,
        username: placeholder,
        primaryPincode: '000000',
        needsHandleChoice: true,
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
        needsHandleChoice: user.needsHandleChoice,
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
