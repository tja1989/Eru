import { prisma } from '../../src/utils/prisma.js';
import { PLACEHOLDER_CONTENT_ID, ensurePlaceholderContent } from '../../src/utils/placeholderContent.js';

export { PLACEHOLDER_CONTENT_ID, ensurePlaceholderContent };

export function fakeMediaConvertCompletionEvent(mediaId: string, outputPrefix: string) {
  return {
    version: '0',
    id: 'test-event-id',
    'detail-type': 'MediaConvert Job State Change',
    source: 'aws.mediaconvert',
    account: '000000000000',
    time: new Date().toISOString(),
    region: 'ap-south-1',
    resources: ['arn:aws:mediaconvert:ap-south-1:000000000000:jobs/test'],
    detail: {
      status: 'COMPLETE',
      userMetadata: { mediaId },
      outputGroupDetails: [{
        outputDetails: [
          { outputFilePaths: [`s3://bucket/${outputPrefix}_360p.mp4`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}_720p.mp4`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}_1080p.mp4`] },
        ],
      }],
    },
  };
}

export function fakeMediaConvertHlsCompletionEvent(mediaId: string, outputPrefix: string) {
  return {
    version: '0',
    id: 'test-event-id',
    'detail-type': 'MediaConvert Job State Change',
    source: 'aws.mediaconvert',
    account: '000000000000',
    time: new Date().toISOString(),
    region: 'ap-south-1',
    resources: ['arn:aws:mediaconvert:ap-south-1:000000000000:jobs/test'],
    detail: {
      status: 'COMPLETE',
      userMetadata: { mediaId },
      outputGroupDetails: [{
        type: 'HLS_GROUP',
        playlistFilePaths: [`s3://bucket/${outputPrefix}/master.m3u8`],
        outputDetails: [
          { outputFilePaths: [`s3://bucket/${outputPrefix}/240p.m3u8`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}/360p.m3u8`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}/540p.m3u8`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}/720p.m3u8`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}/1080p.m3u8`] },
        ],
      }],
    },
  };
}

export function fakeMediaConvertFailureEvent(mediaId: string, errorCode: string) {
  return {
    version: '0',
    id: 'test-event-id',
    'detail-type': 'MediaConvert Job State Change',
    source: 'aws.mediaconvert',
    account: '000000000000',
    time: new Date().toISOString(),
    region: 'ap-south-1',
    resources: ['arn:aws:mediaconvert:ap-south-1:000000000000:jobs/test'],
    detail: {
      status: 'ERROR',
      errorCode,
      userMetadata: { mediaId },
    },
  };
}

export async function seedPendingVideoMedia(opts: { contentId: string; suffix?: string }) {
  const suffix = opts.suffix ?? 'abc';
  return prisma.contentMedia.create({
    data: {
      contentId: opts.contentId,
      type: 'video',
      originalUrl: `https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-${suffix}.mov`,
      width: 1080,
      height: 1920,
      transcodeStatus: 'processing',
    },
  });
}

export async function cleanupOrphanTestMedia() {
  await prisma.contentMedia.deleteMany({
    where: {
      contentId: PLACEHOLDER_CONTENT_ID,
      originalUrl: { contains: '/originals/dev-test-' },
    },
  });
}

