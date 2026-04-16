import vision from '@google-cloud/vision';
import { prisma } from '../utils/prisma.js';
import { earnPoints } from './pointsEngine.js';

// Map Google Vision likelihood strings to numeric risk scores (0 = safe, 1 = dangerous)
const likelihoodToScore: Record<string, number> = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 0.05,
  UNLIKELY: 0.15,
  POSSIBLE: 0.5,
  LIKELY: 0.8,
  VERY_LIKELY: 0.95,
};

// Auto-approve only when AI confidence is this high (1 - maxRiskScore >= 0.95)
const AUTO_APPROVE_THRESHOLD = 0.95;

/**
 * Calls Google Cloud Vision SafeSearch on a single image URL.
 * Returns an object with risk scores (0–1) for each SafeSearch category.
 * On failure, returns scores that force human review (never auto-approve on error).
 */
async function runVisionCheck(
  imageUrl: string,
): Promise<{ adult: number; violence: number; racy: number; spoof: number; medical: number }> {
  try {
    const client = new vision.ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_CLOUD_VISION_KEY,
    });

    const [result] = await client.safeSearchDetection(imageUrl);
    const safe = result.safeSearchAnnotation;

    if (!safe) {
      // No annotation returned — route to human review
      return { adult: 0.5, violence: 0.5, racy: 0.5, spoof: 0.5, medical: 0.5 };
    }

    return {
      adult: likelihoodToScore[safe.adult ?? 'UNKNOWN'] ?? 0,
      violence: likelihoodToScore[safe.violence ?? 'UNKNOWN'] ?? 0,
      racy: likelihoodToScore[safe.racy ?? 'UNKNOWN'] ?? 0,
      spoof: likelihoodToScore[safe.spoof ?? 'UNKNOWN'] ?? 0,
      medical: likelihoodToScore[safe.medical ?? 'UNKNOWN'] ?? 0,
    };
  } catch {
    // Vision API failure — return mid-range scores so we route to a human, never auto-approve
    return { adult: 0.5, violence: 0.5, racy: 0.5, spoof: 0.5, medical: 0.5 };
  }
}

/**
 * Lightweight text spam detector.
 * Returns a single risk score (0–1) based on:
 *   - Caps ratio (all-caps text is spammy)
 *   - URL count (too many links = spam)
 *   - Character repetition (aaaaaa = spam)
 */
function runTextCheck(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  const scores: number[] = [];

  // 1. Caps ratio — more than 60% uppercase is flagged
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 10) {
    const capsRatio = (text.replace(/[^A-Z]/g, '').length) / letters.length;
    if (capsRatio > 0.6) scores.push(0.7);
    else if (capsRatio > 0.4) scores.push(0.3);
  }

  // 2. URL count — more than 3 URLs in a post is suspicious
  const urlCount = (text.match(/https?:\/\//gi) ?? []).length;
  if (urlCount > 5) scores.push(0.9);
  else if (urlCount > 3) scores.push(0.6);
  else if (urlCount > 1) scores.push(0.2);

  // 3. Repeated character runs (e.g. "aaaaaaa", "!!!!!!")
  const repetitionMatch = text.match(/(.)\1{6,}/g);
  if (repetitionMatch && repetitionMatch.length > 2) scores.push(0.7);
  else if (repetitionMatch && repetitionMatch.length > 0) scores.push(0.3);

  return scores.length > 0 ? Math.max(...scores) : 0;
}

/**
 * Runs all AI/text checks on a piece of content, then either auto-approves
 * (if confidence >= 95%) or routes it to the human moderation queue.
 *
 * Think of this like a security scanner at an airport:
 *   - Most bags pass automatically
 *   - Suspicious ones get flagged for a human agent to inspect
 */
export async function queueForModeration(contentId: string): Promise<void> {
  // 1. Fetch content with its associated media
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { media: true },
  });

  if (!content) return;

  // 2. Run vision checks on each image in parallel
  const imageMedia = content.media.filter((m) => m.type === 'image');
  const visionResults = await Promise.all(
    imageMedia.map((m) => runVisionCheck(m.originalUrl)),
  );

  // 3. Compute the single worst vision risk score across all images
  const allVisionScores = visionResults.flatMap((r) =>
    Object.values(r),
  );
  const maxVisionScore = allVisionScores.length > 0 ? Math.max(...allVisionScores) : 0;

  // 4. Run text spam check
  const textScore = runTextCheck(content.text ?? '');

  // 5. Overall confidence = 1 minus the worst risk score seen
  const maxRiskScore = Math.max(maxVisionScore, textScore);
  const confidence = 1 - maxRiskScore;

  const autoCheckResult = {
    visionScores: visionResults,
    textScore,
    maxRiskScore,
    confidence,
  };

  // 6. Find the pending moderation queue entry for this content
  const queueEntry = await prisma.moderationQueue.findFirst({
    where: { contentId, decision: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!queueEntry) return;

  if (confidence >= AUTO_APPROVE_THRESHOLD) {
    // AUTO-APPROVE: update the queue entry, publish content, and credit points
    await prisma.$transaction([
      prisma.moderationQueue.update({
        where: { id: queueEntry.id },
        data: {
          autoCheckResult,
          autoApproved: true,
          decision: 'approved',
          reviewedAt: new Date(),
        },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: {
          moderationStatus: 'published',
          publishedAt: new Date(),
        },
      }),
    ]);

    // Credit creator with +30 pts for publishing content (fire-and-forget on error)
    earnPoints(content.userId, 'create_content', contentId).catch(() => {});
  } else {
    // ROUTE TO HUMAN: store the AI scores so the reviewer can see them
    await prisma.moderationQueue.update({
      where: { id: queueEntry.id },
      data: {
        autoCheckResult,
        autoApproved: false,
      },
    });
  }
}

/**
 * Admin approves a moderation queue entry.
 * Sets content to 'published', records reviewer, credits creator +30 pts.
 */
export async function approveContent(queueId: string, reviewerId: string): Promise<void> {
  const queueEntry = await prisma.moderationQueue.findUnique({
    where: { id: queueId },
    include: { content: true },
  });

  if (!queueEntry) throw new Error('Queue entry not found');
  if (queueEntry.decision !== null) throw new Error('Already reviewed');

  await prisma.$transaction([
    prisma.moderationQueue.update({
      where: { id: queueId },
      data: {
        decision: 'approved',
        reviewerId,
        reviewedAt: new Date(),
      },
    }),
    prisma.content.update({
      where: { id: queueEntry.contentId },
      data: {
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    }),
  ]);

  // Credit creator +30 pts
  earnPoints(queueEntry.content.userId, 'create_content', queueEntry.contentId).catch(() => {});
}

/**
 * Admin declines a moderation queue entry with a reason code.
 * Sets content to 'declined' and stores the decline code.
 */
export async function declineContent(
  queueId: string,
  reviewerId: string,
  declineCode: string,
): Promise<void> {
  const queueEntry = await prisma.moderationQueue.findUnique({
    where: { id: queueId },
  });

  if (!queueEntry) throw new Error('Queue entry not found');
  if (queueEntry.decision !== null) throw new Error('Already reviewed');

  await prisma.$transaction([
    prisma.moderationQueue.update({
      where: { id: queueId },
      data: {
        decision: 'declined',
        declineCode,
        reviewerId,
        reviewedAt: new Date(),
      },
    }),
    prisma.content.update({
      where: { id: queueEntry.contentId },
      data: {
        moderationStatus: 'declined',
        declineReason: declineCode,
      },
    }),
  ]);
}
