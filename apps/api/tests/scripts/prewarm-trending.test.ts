import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/trendingService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/trendingService.js')>();
  return {
    ...actual,
    getTopReels: vi.fn(),
  };
});

const { runPrewarm, DEFAULT_EDGES } = await import('../../src/scripts/prewarm-trending.js');
const trendingService = await import('../../src/services/trendingService.js');

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('prewarm-trending script', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    vi.mocked(trendingService.getTopReels).mockReset();
  });

  it('issues a HEAD request per (reel × edge × manifest)', async () => {
    vi.mocked(trendingService.getTopReels).mockResolvedValue([
      {
        id: 'r1',
        hlsManifestUrl: 'https://cdn.eru.test/transcoded/r1/master.m3u8',
        variantManifests: [
          'https://cdn.eru.test/transcoded/r1/240p.m3u8',
          'https://cdn.eru.test/transcoded/r1/720p.m3u8',
        ],
        score: 1000,
      },
    ]);

    const report = await runPrewarm({ limit: 1, edges: ['Mumbai', 'Chennai'] });

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls.every((c) => (c[1] as RequestInit).method === 'HEAD')).toBe(true);
    expect(report.reelsWarmed).toBe(1);
    expect(report.totalRequests).toBe(6);
  });

  it('uses Eru-Prewarm/1.0 user-agent so analytics can exclude', async () => {
    vi.mocked(trendingService.getTopReels).mockResolvedValue([
      { id: 'r1', hlsManifestUrl: 'https://cdn.eru.test/r1/master.m3u8', variantManifests: [], score: 1000 },
    ]);

    await runPrewarm({ limit: 1, edges: ['Mumbai'] });

    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit;
      expect((init.headers as Record<string, string>)['User-Agent']).toBe('Eru-Prewarm/1.0');
    }
  });

  it('continues on edge failures and records them', async () => {
    vi.mocked(trendingService.getTopReels).mockResolvedValue([
      { id: 'r1', hlsManifestUrl: 'https://cdn.eru.test/r1/master.m3u8', variantManifests: [], score: 1000 },
    ]);
    fetchMock.mockRejectedValueOnce(new Error('net down'));
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const report = await runPrewarm({ limit: 1, edges: ['Mumbai', 'Chennai'] });
    expect(report.errors).toBe(1);
    expect(report.totalRequests).toBe(2);
  });

  it('respects limit', async () => {
    vi.mocked(trendingService.getTopReels).mockResolvedValue([
      { id: 'r1', hlsManifestUrl: 'https://a/master.m3u8', variantManifests: [], score: 1 },
    ]);

    await runPrewarm({ limit: 1, edges: DEFAULT_EDGES });

    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => String(u).startsWith('https://a'))).toBe(true);
  });
});
