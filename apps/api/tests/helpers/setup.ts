import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | undefined;

export function getTestApp(): FastifyInstance {
  if (!app) {
    app = buildApp();
  }
  return app;
}

export async function closeTestApp() {
  if (app) {
    await app.close();
    app = undefined;
  }
}
