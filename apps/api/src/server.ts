import 'dotenv/config';
import { buildApp } from './app.js';
import { getConfig } from './config/index.js';
import { startCronJobs } from './jobs/index.js';

async function start() {
  const config = getConfig();
  const app = buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Eru API running on port ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  if (config.NODE_ENV !== 'test') {
    startCronJobs();
  }
}

start();
