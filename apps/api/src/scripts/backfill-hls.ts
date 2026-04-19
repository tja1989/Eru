import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { triggerTranscode } from '../services/transcodeService.js';
import { extractS3Key } from '../utils/s3.js';

export interface HlsBackfillOptions {
  dryRun: boolean;
  limit: number;
  originalUrlFilter?: string;
}

export interface HlsBackfillReport {
  totalCandidates: number;
  triggered: number;
  skipped: number;
  errors: number;
}

export async function runHlsBackfill(opts: HlsBackfillOptions): Promise<HlsBackfillReport> {
  const where: Prisma.ContentMediaWhereInput = {
    type: 'video',
    hlsManifestUrl: null,
    NOT: { video720pUrl: null },
  };
  if (opts.originalUrlFilter) {
    where.originalUrl = { contains: opts.originalUrlFilter };
  }

  const candidates = await prisma.contentMedia.findMany({
    where,
    orderBy: { id: 'asc' },
  });

  const report: HlsBackfillReport = {
    totalCandidates: candidates.length,
    triggered: 0,
    skipped: 0,
    errors: 0,
  };

  if (opts.dryRun) {
    return report;
  }

  const slice = candidates.slice(0, opts.limit);
  for (const m of slice) {
    const s3Key = extractS3Key(m.originalUrl);
    if (!s3Key) {
      report.skipped += 1;
      continue;
    }
    try {
      await triggerTranscode(m.id, s3Key);
      report.triggered += 1;
    } catch (err) {
      console.error('[backfill-hls] trigger failed for', m.id, err);
      report.errors += 1;
    }
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = !process.argv.includes('--apply');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

  runHlsBackfill({ dryRun, limit })
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
