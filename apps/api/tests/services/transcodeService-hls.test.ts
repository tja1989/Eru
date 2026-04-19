import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/client-mediaconvert', () => {
  const send = vi.fn().mockResolvedValue({ Job: { Id: 'test-job-id' } });
  return {
    MediaConvertClient: vi.fn().mockImplementation(() => ({ send })),
    CreateJobCommand: vi.fn().mockImplementation((input) => ({ input })),
    __send: send,
  };
});

vi.mock('../../src/utils/prisma.js', () => ({
  prisma: {
    contentMedia: { update: vi.fn().mockResolvedValue({}) },
  },
}));

const { triggerTranscode, handleTranscodeComplete } = await import('../../src/services/transcodeService.js');

describe('triggerTranscode — HLS output', () => {
  beforeEach(async () => {
    process.env.MEDIACONVERT_ROLE_ARN = 'arn:aws:iam::0:role/test';
    process.env.S3_BUCKET = 'test-bucket';
    process.env.AWS_REGION = 'ap-south-1';
    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    sdk.__send.mockClear();
  });

  it('emits an HLS_GROUP_SETTINGS job with 5 output rungs (240/360/540/720/1080)', async () => {
    await triggerTranscode('media-abc', 'originals/dev-test-hls.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const settings = call.input.Settings;
    const hlsGroup = settings.OutputGroups[0];

    expect(hlsGroup.OutputGroupSettings.Type).toBe('HLS_GROUP_SETTINGS');
    expect(hlsGroup.OutputGroupSettings.HlsGroupSettings.SegmentLength).toBe(4);

    const rungs = hlsGroup.Outputs.map((o: { NameModifier: string }) => o.NameModifier);
    expect(rungs).toEqual(['_240p', '_360p', '_540p', '_720p', '_1080p']);
  });

  it('uses M3U8 container on each rung', async () => {
    await triggerTranscode('media-def', 'originals/dev-test-hls2.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const outputs = call.input.Settings.OutputGroups[0].Outputs;
    for (const o of outputs) {
      expect(o.ContainerSettings.Container).toBe('M3U8');
    }
  });

  it('bitrate ladder matches ladder decision', async () => {
    await triggerTranscode('media-ghi', 'originals/dev-test-hls3.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const outputs = call.input.Settings.OutputGroups[0].Outputs;
    const bitrates = outputs.map((o: { VideoDescription: { CodecSettings: { H264Settings: { Bitrate: number } } } }) =>
      o.VideoDescription.CodecSettings.H264Settings.Bitrate);
    expect(bitrates).toEqual([400_000, 800_000, 1_400_000, 2_500_000, 5_000_000]);
  });

  it('uses BASELINE profile on low rungs (240/360) and HIGH on the rest', async () => {
    await triggerTranscode('media-prof', 'originals/dev-test-hls-prof.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const outputs = call.input.Settings.OutputGroups[0].Outputs;
    const profiles = outputs.map((o: { VideoDescription: { CodecSettings: { H264Settings: { CodecProfile: string } } } }) =>
      o.VideoDescription.CodecSettings.H264Settings.CodecProfile);
    expect(profiles).toEqual(['BASELINE', 'BASELINE', 'HIGH', 'HIGH', 'HIGH']);
  });

  it('destination is under transcoded/<baseName>/ prefix', async () => {
    await triggerTranscode('media-jkl', 'originals/dev-test-hls4.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const dest = call.input.Settings.OutputGroups[0].OutputGroupSettings.HlsGroupSettings.Destination;
    expect(dest).toBe('s3://test-bucket/transcoded/dev-test-hls4/');
  });
});

describe('handleTranscodeComplete — HLS', () => {
  it('sets hlsManifestUrl + every rung URL when given an HLS payload', async () => {
    const prismaModule = await import('../../src/utils/prisma.js');
    const updateSpy = prismaModule.prisma.contentMedia.update as unknown as ReturnType<typeof vi.fn>;
    updateSpy.mockClear();
    process.env.CLOUDFRONT_DOMAIN = 'cdn.eru.test';

    await handleTranscodeComplete('media-xyz', {
      hlsManifest: 'transcoded/abc/master.m3u8',
      p240: 'transcoded/abc/240p.m3u8',
      p360: 'transcoded/abc/360p.m3u8',
      p540: 'transcoded/abc/540p.m3u8',
      p720: 'transcoded/abc/720p.m3u8',
      p1080: 'transcoded/abc/1080p.m3u8',
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'media-xyz' },
      data: {
        transcodeStatus: 'complete',
        hlsManifestUrl: 'https://cdn.eru.test/transcoded/abc/master.m3u8',
        video240pUrl: 'https://cdn.eru.test/transcoded/abc/240p.m3u8',
        video360pUrl: 'https://cdn.eru.test/transcoded/abc/360p.m3u8',
        video540pUrl: 'https://cdn.eru.test/transcoded/abc/540p.m3u8',
        video720pUrl: 'https://cdn.eru.test/transcoded/abc/720p.m3u8',
        video1080pUrl: 'https://cdn.eru.test/transcoded/abc/1080p.m3u8',
      },
    });
  });

  it('omits hlsManifestUrl when called via legacy MP4 branch (empty hlsManifest)', async () => {
    const prismaModule = await import('../../src/utils/prisma.js');
    const updateSpy = prismaModule.prisma.contentMedia.update as unknown as ReturnType<typeof vi.fn>;
    updateSpy.mockClear();
    process.env.CLOUDFRONT_DOMAIN = 'cdn.eru.test';

    await handleTranscodeComplete('media-legacy', {
      hlsManifest: '',
      p360: 'transcoded/legacy/legacy_360p.mp4',
      p720: 'transcoded/legacy/legacy_720p.mp4',
      p1080: 'transcoded/legacy/legacy_1080p.mp4',
    });

    const args = updateSpy.mock.calls[0][0];
    expect(args.data.hlsManifestUrl).toBeUndefined();
    expect(args.data.video720pUrl).toBe('https://cdn.eru.test/transcoded/legacy/legacy_720p.mp4');
  });
});
