import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { prisma } from '../utils/prisma.js';

let client: MediaConvertClient | null = null;

function getClient(): MediaConvertClient {
  if (!client) {
    client = new MediaConvertClient({
      region: process.env.AWS_REGION,
      endpoint: process.env.MEDIACONVERT_ENDPOINT,
    });
  }
  return client;
}

export async function triggerTranscode(mediaId: string, s3Key: string): Promise<void> {
  const bucket = process.env.S3_BUCKET!;
  const baseName = s3Key.replace(/\.[^/.]+$/, '');
  const outputPrefix = baseName.replace('originals/', 'transcoded/');

  const command = new CreateJobCommand({
    Role: process.env.MEDIACONVERT_ROLE_ARN,
    Settings: {
      Inputs: [{
        FileInput: `s3://${bucket}/${s3Key}`,
        AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
      }],
      OutputGroups: [{
        Name: 'File Group',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: { Destination: `s3://${bucket}/${outputPrefix}` },
        },
        Outputs: [
          createOutput('_360p', 640, 360, 800000),
          createOutput('_720p', 1280, 720, 2500000),
          createOutput('_1080p', 1920, 1080, 5000000),
        ],
      }],
    },
    UserMetadata: { mediaId },
  });

  await getClient().send(command);
  await prisma.contentMedia.update({
    where: { id: mediaId },
    data: { transcodeStatus: 'processing' },
  });
}

function createOutput(suffix: string, width: number, height: number, bitrate: number) {
  return {
    NameModifier: suffix,
    ContainerSettings: { Container: 'MP4' as const },
    VideoDescription: {
      Width: width,
      Height: height,
      CodecSettings: {
        Codec: 'H_264' as const,
        H264Settings: {
          RateControlMode: 'CBR' as const,
          Bitrate: bitrate,
          MaxBitrate: bitrate,
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
  };
}

export async function handleTranscodeComplete(
  mediaId: string,
  outputKeys: { p360: string; p720: string; p1080: string },
): Promise<void> {
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  await prisma.contentMedia.update({
    where: { id: mediaId },
    data: {
      transcodeStatus: 'complete',
      video360pUrl: `https://${cdnDomain}/${outputKeys.p360}`,
      video720pUrl: `https://${cdnDomain}/${outputKeys.p720}`,
      video1080pUrl: `https://${cdnDomain}/${outputKeys.p1080}`,
    },
  });
}

export async function handleTranscodeFailed(mediaId: string): Promise<void> {
  await prisma.contentMedia.update({
    where: { id: mediaId },
    data: { transcodeStatus: 'failed' },
  });
}
