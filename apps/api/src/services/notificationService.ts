import { prisma } from '../utils/prisma.js';
import { getFirebaseAdmin } from '../utils/firebase.js';

const MAX_DAILY_PUSHES = 15;
const QUIET_HOURS_START = 22;
const QUIET_HOURS_END = 8;

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  deepLink?: string;
  priority?: 'high' | 'medium' | 'low';
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const { userId, type, title, body, data, deepLink, priority = 'medium' } = payload;

  // Always save the notification to the DB, regardless of push eligibility
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ?? null,
      deepLink: deepLink ?? null,
    },
  });

  // Fetch user to check push eligibility
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true, notificationPush: true },
  });

  // Gate 1: user must have an FCM token and push enabled
  if (!user?.fcmToken || !user.notificationPush) {
    return;
  }

  // Gate 2: quiet hours check (22:00 – 08:00 local server time, treated as UTC)
  const nowHour = new Date().getUTCHours();
  const isQuietHour =
    nowHour >= QUIET_HOURS_START || nowHour < QUIET_HOURS_END;
  if (isQuietHour && priority !== 'high') {
    return;
  }

  // Gate 3: daily push cap — count pushes sent today for this user
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const todayPushCount = await prisma.notification.count({
    where: {
      userId,
      isPushed: true,
      createdAt: { gte: startOfDay },
    },
  });

  if (todayPushCount >= MAX_DAILY_PUSHES && priority !== 'high') {
    return;
  }

  // All gates passed — send via Firebase Cloud Messaging
  try {
    const admin = getFirebaseAdmin();
    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
      data: {
        type,
        ...(deepLink ? { deepLink } : {}),
        ...(data
          ? Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)])
            )
          : {}),
      },
      android: { priority: priority === 'high' ? 'high' : 'normal' },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
        headers: {
          'apns-priority': priority === 'high' ? '10' : '5',
        },
      },
    });

    // Mark the saved notification as pushed
    await prisma.notification.update({
      where: { id: notification.id },
      data: { isPushed: true },
    });
  } catch (err) {
    // Log but don't throw — a failed push should never crash the caller
    console.error('[notificationService] FCM send failed:', err);
  }
}
