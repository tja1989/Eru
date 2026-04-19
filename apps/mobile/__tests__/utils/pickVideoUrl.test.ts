import { pickVideoUrl } from '@eru/shared';

describe('mobile imports pickVideoUrl from @eru/shared', () => {
  it('exposes pickVideoUrl as a function', () => {
    expect(typeof pickVideoUrl).toBe('function');
  });

  it('prefers video720pUrl over originalUrl', () => {
    expect(
      pickVideoUrl({ originalUrl: 'https://cdn/orig.mov', video720pUrl: 'https://cdn/720.mp4' }),
    ).toBe('https://cdn/720.mp4');
  });
});
