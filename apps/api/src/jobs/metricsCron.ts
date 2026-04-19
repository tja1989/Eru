import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';
import { emitGauge } from '../utils/metrics.js';

export function registerMetricsCron(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const [pending, failed] = await Promise.all([
        prisma.contentMedia.count({ where: { type: 'video', transcodeStatus: 'processing' } }),
        prisma.contentMedia.count({ where: { type: 'video', transcodeStatus: 'failed' } }),
      ]);
      emitGauge('transcode_pending', pending);
      emitGauge('transcode_failed', failed);
    } catch (err) {
      console.error('[cron/metrics] failed', err);
    }
  });
}
