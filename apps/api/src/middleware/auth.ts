import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { verifyFirebaseToken } from '../utils/firebase.js';
import { Errors } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userRole: string;
  }
}

export interface ResolvedUser {
  id: string;
  role: string;
}

/**
 * Verify a bearer token and return the matching active user.
 * Returns `null` for invalid / unknown / deleted tokens — never throws.
 *
 * Used by both `authMiddleware` (REST) and the Socket.io gateway (WS), so the
 * "dev-test-* fast path" + "Firebase verify" + "deleted = treat as missing"
 * rules live in exactly one place.
 */
export async function resolveUserFromToken(token: string): Promise<ResolvedUser | null> {
  if (!token) return null;

  let firebaseUid: string;
  try {
    const allowDev = process.env.ALLOW_DEV_TOKENS === 'true';
    if (allowDev && token.startsWith('dev-')) {
      firebaseUid = token;
    } else {
      const decoded = await verifyFirebaseToken(token);
      firebaseUid = decoded.uid;
    }
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true, role: true, deletedAt: true },
  });

  if (!user || user.deletedAt !== null) return null;
  return { id: user.id, role: user.role };
}

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Errors.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const user = await resolveUserFromToken(token);
  if (!user) {
    throw Errors.unauthorized('Invalid or expired token');
  }

  request.userId = user.id;
  request.userRole = user.role;

  prisma.user.update({
    where: { id: user.id },
    data: { lastActive: new Date() },
  }).catch(() => {});
}
