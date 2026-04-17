import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string(),
  CLOUDFRONT_DOMAIN: z.string(),
  MEDIACONVERT_ENDPOINT: z.string().url().optional(),
  MEDIACONVERT_ROLE_ARN: z.string().optional(),
  GOOGLE_CLOUD_VISION_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  ALLOW_DEV_TOKENS: z.enum(['true', 'false']).default('false'),
});

function loadConfig() {
  // Treat empty strings as undefined so optional fields can be left blank in .env
  const cleaned = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }
  return parsed.data;
}

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}
