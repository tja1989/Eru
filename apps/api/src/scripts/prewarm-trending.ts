import { getTopReels } from '../services/trendingService.js';

export const DEFAULT_EDGES = ['Mumbai', 'Hyderabad', 'Chennai', 'Bangalore', 'Delhi', 'Kolkata'];

export interface PrewarmOptions {
  limit: number;
  edges: string[];
}

export interface PrewarmReport {
  reelsWarmed: number;
  totalRequests: number;
  errors: number;
}

export async function runPrewarm(opts: PrewarmOptions): Promise<PrewarmReport> {
  const reels = await getTopReels(opts.limit);
  const report: PrewarmReport = {
    reelsWarmed: 0,
    totalRequests: 0,
    errors: 0,
  };

  for (const reel of reels) {
    const urls = [reel.hlsManifestUrl, ...reel.variantManifests];
    for (const edge of opts.edges) {
      for (const url of urls) {
        try {
          await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Eru-Prewarm/1.0',
              'X-Eru-Prewarm-Edge': edge,
            },
          });
          report.totalRequests += 1;
        } catch {
          report.errors += 1;
          report.totalRequests += 1;
        }
      }
    }
    report.reelsWarmed += 1;
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;
  runPrewarm({ limit, edges: DEFAULT_EDGES })
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
