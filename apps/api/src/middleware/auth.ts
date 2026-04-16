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

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Errors.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await verifyFirebaseToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, role: true },
    });

    if (!user) {
      throw Errors.unauthorized('User not found. Please register first.');
    }

    request.userId = user.id;
    request.userRole = user.role;

    prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch(() => {});
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') throw error;
    throw Errors.unauthorized('Invalid or expired token');
  }
}
