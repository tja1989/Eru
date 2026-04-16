import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AppError } from './utils/errors.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { actionRoutes } from './routes/actions.js';
import { contentRoutes } from './routes/content.js';
import { mediaRoutes } from './routes/media.js';
import { adminRoutes } from './routes/admin.js';
import { feedRoutes } from './routes/feed.js';
import { exploreRoutes } from './routes/explore.js';
import { reelsRoutes } from './routes/reels.js';
import { walletRoutes } from './routes/wallet.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { notificationRoutes } from './routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.register(cors, { origin: true, credentials: true });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
      });
    }
    if (error.validation) {
      return reply.status(400).send({
        error: error.message,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      code: 'INTERNAL',
      statusCode: 500,
    });
  });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(userRoutes, { prefix: '/api/v1' });
  app.register(actionRoutes, { prefix: '/api/v1' });
  app.register(contentRoutes, { prefix: '/api/v1' });
  app.register(mediaRoutes, { prefix: '/api/v1' });
  app.register(adminRoutes, { prefix: '/api/v1' });
  app.register(feedRoutes, { prefix: '/api/v1' });
  app.register(exploreRoutes, { prefix: '/api/v1' });
  app.register(reelsRoutes, { prefix: '/api/v1' });
  app.register(walletRoutes, { prefix: '/api/v1' });
  app.register(leaderboardRoutes, { prefix: '/api/v1' });
  app.register(notificationRoutes, { prefix: '/api/v1' });

  app.register(fastifyStatic, {
    root: join(__dirname, 'admin-panel'),
    prefix: '/admin/',
    decorateReply: false,
  });

  return app;
}
