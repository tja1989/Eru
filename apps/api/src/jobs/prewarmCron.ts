import cron from 'node-cron';
import { runPrewarm, DEFAULT_EDGES } from '../scripts/prewarm-trending.js';

export function registerPrewarmCron() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const report = await runPrewarm({ limit: 20, edges: DEFAULT_EDGES });
      console.log('[cron/prewarm] report', report);
    } catch (err) {
      console.error('[cron/prewarm] failed', err);
    }
  });
}
