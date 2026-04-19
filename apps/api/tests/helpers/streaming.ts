import { prisma } from '../../src/utils/prisma.js';

export const PLACEHOLDER_CONTENT_ID = '00000000-0000-0000-0000-000000000000';

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

/**
 * The /content/create endpoint links pre-uploaded media by `updateMany` against
 * `contentId = PLACEHOLDER_CONTENT_ID`. The FK on content_media.content_id requires
 * that placeholder row to actually exist before any media row can reference it.
 * Production seeds it once; tests recreate it after each cleanup.
 */
export async function ensurePlaceholderContent() {
  const placeholderUser = await prisma.user.upsert({
    where: { firebaseUid: 'dev-test-placeholder-mc' },
    update: {},
    create: {
      firebaseUid: 'dev-test-placeholder-mc',
      phone: '+919999999998',
      username: 'tplaceholdermc',
      name: 'Placeholder MC',
      primaryPincode: '000000',
    },
  });
  await prisma.content.upsert({
    where: { id: PLACEHOLDER_CONTENT_ID },
    update: {},
    create: {
      id: PLACEHOLDER_CONTENT_ID,
      userId: placeholderUser.id,
      type: 'post',
      text: 'placeholder',
      moderationStatus: 'pending',
    },
  });
}
