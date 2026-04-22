import { prisma } from './prisma.js';

// ContentMedia.contentId is a non-nullable FK to Content. Before a user picks
// what to post, we still need a row to receive the S3 URL + dimensions — so
// /media/upload writes the ContentMedia row using this sentinel contentId,
// and /content/create later re-points it at the real Content row. The FK
// requires a real Content row with this exact UUID to exist; seeding it once
// on boot makes the API self-heal after any DB wipe.
export const PLACEHOLDER_CONTENT_ID = '00000000-0000-0000-0000-000000000000';
const PLACEHOLDER_USER_FIREBASE_UID = 'system-placeholder-media';

export async function ensurePlaceholderContent(): Promise<void> {
  const placeholderUser = await prisma.user.upsert({
    where: { firebaseUid: PLACEHOLDER_USER_FIREBASE_UID },
    update: {},
    create: {
      firebaseUid: PLACEHOLDER_USER_FIREBASE_UID,
      phone: '+910000000000',
      username: 'system_placeholder',
      name: 'System',
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
