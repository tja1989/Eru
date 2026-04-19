import { describe, it, expect } from 'vitest';
import { pickVideoUrl } from './media';

describe('pickVideoUrl', () => {
  it('returns undefined for null/undefined', () => {
    expect(pickVideoUrl(null)).toBeUndefined();
    expect(pickVideoUrl(undefined)).toBeUndefined();
  });

  it('returns originalUrl when no variants present', () => {
    expect(pickVideoUrl({ originalUrl: 'https://cdn/original.mp4' })).toBe('https://cdn/original.mp4');
  });

  it('prefers video360pUrl over originalUrl', () => {
    expect(pickVideoUrl({
      originalUrl: 'https://cdn/original.mp4',
      video360pUrl: 'https://cdn/360.mp4',
    })).toBe('https://cdn/360.mp4');
  });

  it('prefers video720pUrl over 360p', () => {
    expect(pickVideoUrl({
      originalUrl: 'https://cdn/original.mp4',
      video360pUrl: 'https://cdn/360.mp4',
      video720pUrl: 'https://cdn/720.mp4',
    })).toBe('https://cdn/720.mp4');
  });

  it('prefers hlsManifestUrl over 720p', () => {
    expect(pickVideoUrl({
      originalUrl: 'https://cdn/original.mp4',
      video720pUrl: 'https://cdn/720.mp4',
      hlsManifestUrl: 'https://cdn/master.m3u8',
    })).toBe('https://cdn/master.m3u8');
  });

  it('ignores 1080p by default (wifi-only rung, decided per-caller)', () => {
    expect(pickVideoUrl({
      video720pUrl: 'https://cdn/720.mp4',
      video1080pUrl: 'https://cdn/1080.mp4',
    })).toBe('https://cdn/720.mp4');
  });

  it('returns 1080p when explicitly allowed', () => {
    expect(pickVideoUrl(
      { video720pUrl: 'https://cdn/720.mp4', video1080pUrl: 'https://cdn/1080.mp4' },
      { allow1080p: true },
    )).toBe('https://cdn/1080.mp4');
  });
});
