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
  let phoneNumber: string | null = null;
  try {
    const allowDev = process.env.ALLOW_DEV_TOKENS === 'true';
    if (allowDev && token.startsWith('dev-')) {
      firebaseUid = token;
    } else {
      const decoded = await verifyFirebaseToken(token);
      firebaseUid = decoded.uid;
      // Firebase Phone Auth tokens carry the verified E.164 number in the
      // `phone_number` claim; other providers (email, Google) omit it.
      phoneNumber = (decoded as any).phone_number ?? null;
    }
  } catch {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true, role: true, deletedAt: true },
  });

  // Silent provider migration: if we got a fresh Firebase UID but an Eru user
  // already exists for this verified phone number (created earlier via the
  // dev-token path, or via a prior Firebase project), adopt that existing
  // account and update its firebaseUid. Safe because Firebase Phone Auth has
  // already proved the caller controls the phone number — the phone IS the
  // identity. Without this, swapping auth providers strands the user's data.
  if (!user && phoneNumber) {
    const byPhone = await prisma.user.findUnique({
      where: { phone: phoneNumber },
      select: { id: true, role: true, deletedAt: true },
    });
    if (byPhone && byPhone.deletedAt === null) {
      await prisma.user.update({
        where: { id: byPhone.id },
        data: { firebaseUid },
      });
      user = byPhone;
    }
  }

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
