import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { prisma } from '../utils/prisma.js';

let client: MediaConvertClient | null = null;

function getClient(): MediaConvertClient {
  if (!client) {
    const config: { region?: string; endpoint?: string } = {
      region: process.env.AWS_REGION,
    };
    // v3 SDK auto-discovers endpoint per account; override only if provided
    if (process.env.MEDIACONVERT_ENDPOINT) {
      config.endpoint = process.env.MEDIACONVERT_ENDPOINT;
    }
    client = new MediaConvertClient(config);
  }
  return client;
}

export async function triggerTranscode(mediaId: string, s3Key: string): Promise<void> {
  if (!process.env.MEDIACONVERT_ROLE_ARN) {
    await prisma.contentMedia.update({
      where: { id: mediaId },
      data: { transcodeStatus: 'complete' },
    });
    return;
  }

  const bucket = process.env.S3_BUCKET!;
  const baseName = s3Key.replace(/^originals\//, '').replace(/\.[^/.]+$/, '');
  const outputPrefix = `transcoded/${baseName}/`;

  const command = new CreateJobCommand({
    Role: process.env.MEDIACONVERT_ROLE_ARN,
    Settings: {
      Inputs: [{
        FileInput: `s3://${bucket}/${s3Key}`,
        AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
      }],
      OutputGroups: [{
        Name: 'HLS',
        OutputGroupSettings: {
          Type: 'HLS_GROUP_SETTINGS',
          HlsGroupSettings: {
            Destination: `s3://${bucket}/${outputPrefix}`,
            SegmentLength: 4,
            MinSegmentLength: 0,
            ManifestCompression: 'NONE',
            ManifestDurationFormat: 'INTEGER',
            StreamInfResolution: 'INCLUDE',
            DirectoryStructure: 'SINGLE_DIRECTORY',
            CodecSpecification: 'RFC_4281',
            ProgramDateTime: 'EXCLUDE',
          },
        },
        Outputs: [
          // BASELINE profile on the low rungs so cheap / older Androids
          // (the devices most likely to ABR down to these) can decode them
          // without falling back to the original. HIGH profile on 540p+ for
          // better compression on modern devices.
          createHlsOutput('_240p', 426, 240, 400_000, 'BASELINE'),
          createHlsOutput('_360p', 640, 360, 800_000, 'BASELINE'),
          createHlsOutput('_540p', 960, 540, 1_400_000, 'HIGH'),
          createHlsOutput('_720p', 1280, 720, 2_500_000, 'HIGH'),
          createHlsOutput('_1080p', 1920, 1080, 5_000_000, 'HIGH'),
        ],
      }],
    },
    UserMetadata: { mediaId },
  });

  try {
    await getClient().send(command);
    await prisma.contentMedia.update({
      where: { id: mediaId },
      data: { transcodeStatus: 'processing' },
    });
  } catch (err) {
    console.warn('MediaConvert unavailable, skipping transcode for media', mediaId, err instanceof Error ? err.message : err);
    await prisma.contentMedia.update({
      where: { id: mediaId },
      data: { transcodeStatus: 'complete' },
    });
  }
}

type H264Profile = 'BASELINE' | 'MAIN' | 'HIGH';

function createHlsOutput(
  suffix: string,
  width: number,
  height: number,
  bitrate: number,
  profile: H264Profile = 'MAIN',
) {
  return {
    NameModifier: suffix,
    ContainerSettings: {
      Container: 'M3U8' as const,
      M3u8Settings: {
        AudioFramesPerPes: 4,
        Scte35Source: 'NONE' as const,
        PcrControl: 'PCR_EVERY_PES_PACKET' as const,
      },
    },
    VideoDescription: {
      Width: width,
      Height: height,
      CodecSettings: {
        Codec: 'H_264' as const,
        H264Settings: {
          RateControlMode: 'CBR' as const,
          Bitrate: bitrate,
          MaxBitrate: bitrate,
          GopSize: 96,
          GopSizeUnits: 'FRAMES' as const,
          CodecProfile: profile,
        },
      },
    },
    AudioDescriptions: [{
      AudioSourceName: 'Audio Selector 1',
      CodecSettings: {
        Codec: 'AAC' as const,
        AacSettings: { Bitrate: 128000, CodingMode: 'CODING_MODE_2_0' as const, SampleRate: 48000 },
      },
    }],
    OutputSettings: {
      HlsSettings: { SegmentModifier: '' },
    },
  };
}

export async function handleTranscodeComplete(
  mediaId: string,
  outputKeys: {
    hlsManifest: string;
    p240?: string;
    p360: string;
    p540?: string;
    p720: string;
    p1080: string;
  },
): Promise<void> {
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  const toUrl = (k?: string) => (k ? `https://${cdnDomain}/${k}` : undefined);

  await prisma.contentMedia.update({
    where: { id: mediaId },
    data: {
      transcodeStatus: 'complete',
      hlsManifestUrl: toUrl(outputKeys.hlsManifest),
      video240pUrl: toUrl(outputKeys.p240),
      video360pUrl: toUrl(outputKeys.p360),
      video540pUrl: toUrl(outputKeys.p540),
      video720pUrl: toUrl(outputKeys.p720),
      video1080pUrl: toUrl(outputKeys.p1080),
    },
  });
}

export async function handleTranscodeFailed(mediaId: string): Promise<void> {
  await prisma.contentMedia.update({
    where: { id: mediaId },
    data: { transcodeStatus: 'failed' },
  });
}
