import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

let s3: S3Client | null = null;

function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({ region: process.env.AWS_REGION });
  }
  return s3;
}

export async function uploadToS3(
  buffer: Buffer,
  userId: string,
  folder: string,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = `users/${userId}/${folder}/${filename}`;
  await getS3().send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
}

export async function generatePresignedUploadUrl(
  userId: string,
  contentType: string,
): Promise<{ uploadUrl: string; mediaId: string; key: string }> {
  const mediaId = randomUUID();
  const ext = contentType.includes('mp4') ? 'mp4' : contentType.includes('mov') ? 'mov' : 'mp4';
  const key = `users/${userId}/originals/${mediaId}.${ext}`;
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: 3600 });
  return { uploadUrl, mediaId, key };
}

export function getCdnUrl(key: string): string {
  return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
}
