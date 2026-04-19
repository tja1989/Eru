import { describe, it, expect, vi, beforeEach } from 'vitest';

const scheduleMock = vi.fn();
vi.mock('node-cron', () => ({
  default: { schedule: scheduleMock },
  schedule: scheduleMock,
}));

vi.mock('../../src/scripts/prewarm-trending.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/scripts/prewarm-trending.js')>();
  return {
    ...actual,
    runPrewarm: vi.fn().mockResolvedValue({ reelsWarmed: 0, totalRequests: 0, errors: 0 }),
  };
});

const { registerPrewarmCron } = await import('../../src/jobs/prewarmCron.js');
const prewarmModule = await import('../../src/scripts/prewarm-trending.js');

describe('registerPrewarmCron', () => {
  beforeEach(() => {
    scheduleMock.mockReset();
    vi.mocked(prewarmModule.runPrewarm).mockReset();
    vi.mocked(prewarmModule.runPrewarm).mockResolvedValue({ reelsWarmed: 20, totalRequests: 200, errors: 0 });
  });

  it('schedules every 5 minutes', () => {
    registerPrewarmCron();
    expect(scheduleMock).toHaveBeenCalled();
    const [expr] = scheduleMock.mock.calls[0];
    expect(expr).toBe('*/5 * * * *');
  });

  it('the scheduled callback calls runPrewarm with default limit=20 and DEFAULT_EDGES', async () => {
    registerPrewarmCron();
    const [, callback] = scheduleMock.mock.calls[scheduleMock.mock.calls.length - 1];
    await callback();
    expect(prewarmModule.runPrewarm).toHaveBeenCalledWith({ limit: 20, edges: prewarmModule.DEFAULT_EDGES });
  });
});
