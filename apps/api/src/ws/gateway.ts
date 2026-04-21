import type { Server as HttpServer } from 'http';
import { Server as IoServer, type Socket } from 'socket.io';
import { resolveUserFromToken } from '../middleware/auth.js';

let io: IoServer | null = null;

/**
 * Attach a Socket.io gateway to an existing http.Server.
 *
 * Auth: every connection's `handshake.auth.token` is resolved via the same
 * `resolveUserFromToken` helper that REST routes use, so dev-test-* tokens
 * work in test environments without Firebase. Each authenticated socket joins
 * a `user:<id>` room — `emitToUser(userId, ...)` targets that room.
 *
 * Path: `/ws` (separate from `/api/v1/...` REST routes).
 */
export function initGateway(httpServer: HttpServer): IoServer {
  io = new IoServer(httpServer, {
    cors: { origin: true, credentials: true },
    path: '/ws',
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId: string | undefined = (socket.data as { userId?: string }).userId;
    if (userId) {
      void socket.join(`user:${userId}`);
    }
  });

  return io;
}

/**
 * Socket-level auth middleware. Exported so unit tests can drive it without
 * spinning up an http server.
 */
export async function authenticateSocket(
  socket: Pick<Socket, 'handshake' | 'data'>,
  next: (err?: Error) => void,
) {
  const token = socket.handshake?.auth?.token as string | undefined;
  const user = await resolveUserFromToken(token ?? '');
  if (!user) return next(new Error('auth: invalid token'));
  (socket.data as { userId?: string }).userId = user.id;
  next();
}

/**
 * Send a payload to all of a user's currently-connected sockets.
 * No-op when the gateway hasn't been initialized (e.g., during tests that
 * never started the server).
 */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

/**
 * For tests / cleanup. Resets the singleton so the next call to initGateway
 * starts from a clean state.
 */
export function resetGatewayForTests(): void {
  io?.close();
  io = null;
}
