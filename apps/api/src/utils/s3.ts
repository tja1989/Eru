const S3_PREFIX_REGEX = /^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)$/;
const CLOUDFRONT_PREFIX_REGEX = /^https:\/\/[^/]+\/(.+)$/;

export function extractS3Key(url: string): string | null {
  const s3Match = url.match(S3_PREFIX_REGEX);
  if (s3Match) return s3Match[1];
  const cfMatch = url.match(CLOUDFRONT_PREFIX_REGEX);
  return cfMatch?.[1] ?? null;
}
