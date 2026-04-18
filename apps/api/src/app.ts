import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
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
import { offerRoutes } from './routes/offers.js';
import { questsRoutes } from './routes/quests.js';
import { rewardRoutes } from './routes/rewards.js';
import { spinRoutes } from './routes/spin.js';
import { badgesRoutes } from './routes/badges.js';
import { businessRoutes } from './routes/business.js';
import { messagesRoutes } from './routes/messages.js';
import { sponsorshipRoutes } from './routes/sponsorship.js';
import { storiesRoutes } from './routes/stories.js';

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
    const fastifyError = error as FastifyError;
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: fastifyError.message,
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

  // Root welcome page — shown when someone visits the bare URL
  app.get('/', async (_request, reply) => {
    reply.type('text/html').send(`<!DOCTYPE html>
<html><head><title>Eru API</title><meta charset="utf-8">
<style>body{font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:80px auto;padding:24px;color:#262626;line-height:1.6}h1{font-style:italic;font-family:Georgia,serif;color:#E8792B;font-size:42px;margin:0}p{color:#737373}a{color:#0095F6;text-decoration:none}a:hover{text-decoration:underline}.list{background:#FAFAFA;padding:16px 24px;border-radius:12px;margin-top:24px}</style>
</head><body>
<h1>Eru</h1>
<p>India's super content app where consumers earn rewards, creators earn money, and brands earn customers.</p>
<div class="list">
<p><strong>This is the API server.</strong> Install the Eru mobile app to use the product.</p>
<p>For operators: <a href="/admin/">Moderation Panel</a> &middot; <a href="/health">Health Check</a></p>
</div>
</body></html>`);
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
  app.register(offerRoutes, { prefix: '/api/v1' });
  app.register(questsRoutes, { prefix: '/api/v1' });
  app.register(rewardRoutes, { prefix: '/api/v1' });
  app.register(spinRoutes, { prefix: '/api/v1' });
  app.register(badgesRoutes, { prefix: '/api/v1' });
  app.register(businessRoutes, { prefix: '/api/v1' });
  app.register(messagesRoutes, { prefix: '/api/v1' });
  app.register(sponsorshipRoutes, { prefix: '/api/v1' });
  app.register(storiesRoutes, { prefix: '/api/v1' });

  app.register(fastifyStatic, {
    root: join(__dirname, 'admin-panel'),
    prefix: '/admin/',
    decorateReply: false,
  });

  return app;
}
