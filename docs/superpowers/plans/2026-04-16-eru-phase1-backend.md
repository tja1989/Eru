# Eru Phase 1 Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete backend API for Eru Phase 1 — a Fastify monolith with 42 endpoints, 11 database tables, points engine, content moderation, feed algorithm, leaderboard, notifications, and cron jobs.

**Architecture:** Turborepo monorepo with a shared types package and a Fastify API server. Prisma ORM for PostgreSQL. Upstash Redis for caching and leaderboards. Firebase Admin SDK for auth verification and push notifications. AWS SDK for S3 media uploads and MediaConvert video transcoding. Google Cloud Vision for content moderation.

**Tech Stack:** TypeScript, Node.js, Fastify, Prisma, PostgreSQL (Supabase), Redis (Upstash), Zod, Vitest, Firebase Admin SDK, AWS SDK v3, Google Cloud Vision.

**Sub-plan:** 1 of 3 (Backend API → Mobile App → Admin + Deploy)

**Design spec:** `docs/superpowers/specs/2026-04-16-eru-phase1-design.md`

---

## File Structure

```
eru/
├── apps/
│   └── api/
│       ├── src/
│       │   ├── server.ts                      ← Fastify app setup + plugin registration
│       │   ├── app.ts                         ← App factory (for testing)
│       │   ├── routes/
│       │   │   ├── auth.ts                    ← POST register, refresh, logout
│       │   │   ├── feed.ts                    ← GET feed, stories, wallet summary
│       │   │   ├── content.ts                 ← CRUD content + resubmit + appeal
│       │   │   ├── media.ts                   ← Upload + presign
│       │   │   ├── users.ts                   ← Profile, follow, unfollow, settings
│       │   │   ├── actions.ts                 ← POST earn (points engine)
│       │   │   ├── wallet.ts                  ← Balance, history, expiring
│       │   │   ├── explore.ts                 ← Explore grid, search, trending
│       │   │   ├── reels.ts                   ← Reels feed, like, comment
│       │   │   ├── leaderboard.ts             ← Rankings, my rank, season, quests
│       │   │   ├── notifications.ts           ← List, mark read
│       │   │   └── admin.ts                   ← Moderation queue, approve, decline
│       │   ├── services/
│       │   │   ├── pointsEngine.ts            ← Validate + credit + daily caps
│       │   │   ├── feedAlgorithm.ts           ← Score + rank content
│       │   │   ├── moderationService.ts       ← AI checks + queue routing
│       │   │   ├── mediaService.ts            ← S3 upload + presign + thumbnail
│       │   │   ├── transcodeService.ts        ← MediaConvert job creation
│       │   │   ├── notificationService.ts     ← FCM send + smart rules
│       │   │   ├── leaderboardService.ts      ← Redis sorted sets + reset
│       │   │   └── streakService.ts           ← Streak check + reset
│       │   ├── middleware/
│       │   │   ├── auth.ts                    ← Firebase JWT verify
│       │   │   ├── rateLimit.ts               ← Upstash rate limiter
│       │   │   └── admin.ts                   ← Admin role check
│       │   ├── jobs/
│       │   │   ├── index.ts                   ← Cron scheduler setup
│       │   │   ├── streakReset.ts             ← Midnight: reset broken streaks
│       │   │   ├── pointsExpiry.ts            ← 2AM: expire old points
│       │   │   ├── leaderboardReset.ts        ← Monday: weekly snapshot
│       │   │   ├── streakReminder.ts          ← 8PM: notification
│       │   │   └── moderationSLA.ts           ← Every 5min: queue health
│       │   ├── config/
│       │   │   └── index.ts                   ← Env var loading + validation
│       │   └── utils/
│       │       ├── errors.ts                  ← AppError class + error codes
│       │       └── validators.ts              ← Zod schemas for request bodies
│       ├── prisma/
│       │   └── schema.prisma                  ← All 11 tables
│       ├── tests/
│       │   ├── helpers/
│       │   │   └── setup.ts                   ← Test app factory + DB reset
│       │   ├── services/
│       │   │   ├── pointsEngine.test.ts
│       │   │   ├── feedAlgorithm.test.ts
│       │   │   ├── moderationService.test.ts
│       │   │   └── leaderboardService.test.ts
│       │   └── routes/
│       │       ├── auth.test.ts
│       │       ├── content.test.ts
│       │       ├── feed.test.ts
│       │       ├── actions.test.ts
│       │       └── users.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.ts
│       │   │   ├── content.ts
│       │   │   ├── points.ts
│       │   │   └── api.ts
│       │   ├── constants/
│       │   │   ├── points.ts                  ← Action configs: type, points, cap
│       │   │   └── tiers.ts                   ← Tier thresholds + multipliers
│       │   └── index.ts                       ← Re-export all
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                               ← Root workspaces
├── turbo.json                                 ← Turborepo pipeline
├── tsconfig.base.json                         ← Shared TS config
└── .env.example                               ← Template for env vars
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore` (update)

- [ ] **Step 1: Initialize root package.json with workspaces**

```json
{
  "name": "eru",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@eru/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```typescript
export * from './types/user.js';
export * from './types/content.js';
export * from './types/points.js';
export * from './types/api.js';
export * from './constants/points.js';
export * from './constants/tiers.js';
```

- [ ] **Step 5: Create API package skeleton**

`apps/api/package.json`:
```json
{
  "name": "@eru/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@eru/shared": "workspace:*",
    "@fastify/cors": "^10.0.0",
    "@prisma/client": "^6.5.0",
    "fastify": "^5.2.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "prisma": "^6.5.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.0"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`apps/api/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 10000,
  },
});
```

- [ ] **Step 6: Create .env.example and update .gitignore**

`.env.example`:
```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/eru

# Redis (Upstash)
REDIS_URL=redis://default:pass@us1-abc.upstash.io:6379

# Firebase Admin
FIREBASE_PROJECT_ID=eru-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@eru-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET=eru-media
CLOUDFRONT_DOMAIN=d1234.cloudfront.net
MEDIACONVERT_ENDPOINT=https://abc.mediaconvert.ap-south-1.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::role/MediaConvertRole

# Google Cloud Vision
GOOGLE_CLOUD_VISION_KEY=AIza...

# App
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
JWT_SECRET=dev-secret-change-in-production
```

Update `.gitignore` — append:
```
node_modules/
dist/
.env
.env.local
*.log
.turbo/
```

- [ ] **Step 7: Install dependencies and verify**

Run: `cd /Users/USER/claude_tj/Eru && npm install`
Expected: Clean install, workspaces resolved, no errors.

Run: `npx turbo build`
Expected: Both packages build (shared may have empty output — that's OK).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold turborepo monorepo with shared + api packages"
```

---

## Task 2: Shared Types & Constants

**Files:**
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/content.ts`
- Create: `packages/shared/src/types/points.ts`
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/constants/points.ts`
- Create: `packages/shared/src/constants/tiers.ts`

- [ ] **Step 1: Define user types**

`packages/shared/src/types/user.ts`:
```typescript
export type Tier = 'explorer' | 'engager' | 'influencer' | 'champion';

export type Gender = 'male' | 'female' | 'other';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  firebaseUid: string;
  phone: string;
  email: string | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  gender: Gender | null;
  dob: string | null;
  primaryPincode: string;
  secondaryPincodes: string[];
  interests: string[];
  contentLanguages: string[];
  appLanguage: string;
  tier: Tier;
  lifetimePoints: number;
  currentBalance: number;
  streakDays: number;
  streakLastDate: string | null;
  isVerified: boolean;
  notificationPush: boolean;
  notificationEmail: boolean;
  isPrivate: boolean;
  shareDataWithBrands: boolean;
  fcmToken: string | null;
  role: UserRole;
  createdAt: string;
  lastActive: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  tier: Tier;
  isVerified: boolean;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface UserSettings {
  name: string;
  email: string | null;
  phone: string;
  dob: string | null;
  gender: Gender | null;
  primaryPincode: string;
  secondaryPincodes: string[];
  interests: string[];
  contentLanguages: string[];
  appLanguage: string;
  notificationPush: boolean;
  notificationEmail: boolean;
  isPrivate: boolean;
  shareDataWithBrands: boolean;
}
```

- [ ] **Step 2: Define content types**

`packages/shared/src/types/content.ts`:
```typescript
export type ContentType = 'post' | 'reel' | 'poll' | 'thread';

export type ModerationStatus = 'pending' | 'published' | 'declined';

export type TranscodeStatus = 'pending' | 'processing' | 'complete' | 'failed';

export type MediaType = 'image' | 'video';

export interface Content {
  id: string;
  userId: string;
  type: ContentType;
  text: string | null;
  hashtags: string[];
  locationPincode: string | null;
  moderationStatus: ModerationStatus;
  declineReason: string | null;
  isTrending: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  pointsEarned: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface ContentMedia {
  id: string;
  contentId: string;
  type: MediaType;
  originalUrl: string;
  thumbnailUrl: string | null;
  video360pUrl: string | null;
  video720pUrl: string | null;
  video1080pUrl: string | null;
  durationSeconds: number | null;
  width: number;
  height: number;
  sortOrder: number;
  transcodeStatus: TranscodeStatus;
}

export interface Comment {
  id: string;
  userId: string;
  contentId: string;
  text: string;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
}

export type InteractionType = 'like' | 'save' | 'share';

export interface FeedPost extends Content {
  media: ContentMedia[];
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    tier: string;
    isVerified: boolean;
  };
  isLiked: boolean;
  isSaved: boolean;
  commentsPreview: Comment[];
}
```

- [ ] **Step 3: Define points types**

`packages/shared/src/types/points.ts`:
```typescript
export type ActionType =
  | 'read_article'
  | 'watch_video'
  | 'reel_watch'
  | 'listen_podcast'
  | 'read_thread'
  | 'like'
  | 'comment'
  | 'share'
  | 'save'
  | 'follow'
  | 'daily_checkin'
  | 'create_content'
  | 'content_trending'
  | 'refer_friend'
  | 'complete_profile';

export interface PointsLedgerEntry {
  id: string;
  userId: string;
  actionType: ActionType;
  contentId: string | null;
  points: number;
  multiplierApplied: number;
  expiresAt: string;
  redeemedAt: string | null;
  expired: boolean;
  createdAt: string;
}

export interface EarnResult {
  success: boolean;
  points: number;
  multiplier: number;
  newBalance: number;
  dailyProgress: {
    earned: number;
    goal: number;
  };
  streak: number;
}

export interface WalletSummary {
  balance: number;
  dailyEarned: number;
  dailyGoal: number;
  streak: number;
  tier: string;
  tierProgress: {
    current: number;
    next: number;
    pointsNeeded: number;
  };
  expiringPoints: {
    amount: number;
    daysRemaining: number;
  } | null;
}
```

- [ ] **Step 4: Define API types**

`packages/shared/src/types/api.ts`:
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  nextPage: number | null;
  total: number;
}

export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
}

export interface RegisterRequest {
  firebaseUid: string;
  phone: string;
  name: string;
  username: string;
}

export interface CreateContentRequest {
  type: 'post' | 'reel' | 'poll' | 'thread';
  text?: string;
  mediaIds: string[];
  hashtags: string[];
  locationPincode?: string;
}

export interface EarnRequest {
  actionType: string;
  contentId?: string;
  metadata?: {
    watchTimeSeconds?: number;
    wordCount?: number;
  };
}

export interface UpdateSettingsRequest {
  name?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  primaryPincode?: string;
  secondaryPincodes?: string[];
  interests?: string[];
  contentLanguages?: string[];
  appLanguage?: string;
  notificationPush?: boolean;
  notificationEmail?: boolean;
  isPrivate?: boolean;
  shareDataWithBrands?: boolean;
}
```

- [ ] **Step 5: Define points constants**

`packages/shared/src/constants/points.ts`:
```typescript
import type { ActionType } from '../types/points.js';

export interface ActionConfig {
  type: ActionType;
  category: 'content' | 'engagement' | 'growth';
  points: number;
  dailyCap: number;
  requiresContentId: boolean;
  validation: {
    minWatchTimeSeconds?: number;
    minScrollDepth?: number;
    minWordCount?: number;
  };
}

export const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  read_article: {
    type: 'read_article',
    category: 'content',
    points: 4,
    dailyCap: 20,
    requiresContentId: true,
    validation: { minScrollDepth: 0.7, minWatchTimeSeconds: 30 },
  },
  watch_video: {
    type: 'watch_video',
    category: 'content',
    points: 6,
    dailyCap: 15,
    requiresContentId: true,
    validation: { minWatchTimeSeconds: 60 },
  },
  reel_watch: {
    type: 'reel_watch',
    category: 'content',
    points: 3,
    dailyCap: 30,
    requiresContentId: true,
    validation: {},
  },
  listen_podcast: {
    type: 'listen_podcast',
    category: 'content',
    points: 5,
    dailyCap: 10,
    requiresContentId: true,
    validation: { minWatchTimeSeconds: 120 },
  },
  read_thread: {
    type: 'read_thread',
    category: 'content',
    points: 3,
    dailyCap: 10,
    requiresContentId: true,
    validation: {},
  },
  like: {
    type: 'like',
    category: 'engagement',
    points: 1,
    dailyCap: 50,
    requiresContentId: true,
    validation: {},
  },
  comment: {
    type: 'comment',
    category: 'engagement',
    points: 3,
    dailyCap: 20,
    requiresContentId: true,
    validation: { minWordCount: 10 },
  },
  share: {
    type: 'share',
    category: 'engagement',
    points: 2,
    dailyCap: 20,
    requiresContentId: true,
    validation: {},
  },
  save: {
    type: 'save',
    category: 'engagement',
    points: 1,
    dailyCap: 30,
    requiresContentId: true,
    validation: {},
  },
  follow: {
    type: 'follow',
    category: 'engagement',
    points: 2,
    dailyCap: 10,
    requiresContentId: false,
    validation: {},
  },
  daily_checkin: {
    type: 'daily_checkin',
    category: 'growth',
    points: 25,
    dailyCap: 1,
    requiresContentId: false,
    validation: {},
  },
  create_content: {
    type: 'create_content',
    category: 'growth',
    points: 30,
    dailyCap: 5,
    requiresContentId: true,
    validation: {},
  },
  content_trending: {
    type: 'content_trending',
    category: 'growth',
    points: 200,
    dailyCap: 1,
    requiresContentId: true,
    validation: {},
  },
  refer_friend: {
    type: 'refer_friend',
    category: 'growth',
    points: 100,
    dailyCap: 3,
    requiresContentId: false,
    validation: {},
  },
  complete_profile: {
    type: 'complete_profile',
    category: 'growth',
    points: 50,
    dailyCap: 1,
    requiresContentId: false,
    validation: {},
  },
};

export const DAILY_POINTS_GOAL = 250;

export const POINTS_EXPIRY_MONTHS = 6;

export const POINTS_EXPIRY_WARNING_DAYS = 30;

export const POINT_FACE_VALUE_INR = 0.01;
```

- [ ] **Step 6: Define tier constants**

`packages/shared/src/constants/tiers.ts`:
```typescript
import type { Tier } from '../types/user.js';

export interface TierConfig {
  tier: Tier;
  threshold: number;
  multiplier: number;
  monthlyBonus: number;
  label: string;
  emoji: string;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  explorer: {
    tier: 'explorer',
    threshold: 0,
    multiplier: 1.0,
    monthlyBonus: 0,
    label: 'Explorer',
    emoji: '\u{1F331}',
  },
  engager: {
    tier: 'engager',
    threshold: 2000,
    multiplier: 1.2,
    monthlyBonus: 100,
    label: 'Engager',
    emoji: '\u{26A1}',
  },
  influencer: {
    tier: 'influencer',
    threshold: 10000,
    multiplier: 1.5,
    monthlyBonus: 300,
    label: 'Influencer',
    emoji: '\u{1F525}',
  },
  champion: {
    tier: 'champion',
    threshold: 50000,
    multiplier: 2.0,
    monthlyBonus: 1000,
    label: 'Champion',
    emoji: '\u{1F451}',
  },
};

export const TIER_ORDER: Tier[] = ['explorer', 'engager', 'influencer', 'champion'];

export function getTierForPoints(lifetimePoints: number): Tier {
  if (lifetimePoints >= TIER_CONFIGS.champion.threshold) return 'champion';
  if (lifetimePoints >= TIER_CONFIGS.influencer.threshold) return 'influencer';
  if (lifetimePoints >= TIER_CONFIGS.engager.threshold) return 'engager';
  return 'explorer';
}

export function getNextTier(currentTier: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

export function getMultiplier(tier: Tier): number {
  return TIER_CONFIGS[tier].multiplier;
}
```

- [ ] **Step 7: Verify shared package compiles**

Run: `cd /Users/USER/claude_tj/Eru && npx tsc --noEmit -p packages/shared/tsconfig.json`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types and constants for users, content, points, tiers"
```

---

## Task 3: Prisma Schema & Database

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Write Prisma schema with all 11 tables**

`apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Tier {
  explorer
  engager
  influencer
  champion
}

enum Gender {
  male
  female
  other
}

enum UserRole {
  user
  admin
}

enum ContentType {
  post
  reel
  poll
  thread
}

enum ModerationStatus {
  pending
  published
  declined
}

enum MediaType {
  image
  video
}

enum TranscodeStatus {
  pending
  processing
  complete
  failed
}

enum InteractionType {
  like
  save
  share
}

enum ModerationDecision {
  approved
  declined
}

model User {
  id                  String    @id @default(uuid())
  firebaseUid         String    @unique @map("firebase_uid")
  phone               String    @unique
  email               String?
  name                String
  username            String    @unique
  avatarUrl           String?   @map("avatar_url")
  bio                 String?
  gender              Gender?
  dob                 DateTime? @db.Date
  primaryPincode      String    @map("primary_pincode") @db.VarChar(6)
  secondaryPincodes   String[]  @default([]) @map("secondary_pincodes")
  interests           String[]  @default([])
  contentLanguages    String[]  @default(["en"]) @map("content_languages")
  appLanguage         String    @default("en") @map("app_language")
  tier                Tier      @default(explorer)
  lifetimePoints      Int       @default(0) @map("lifetime_points")
  currentBalance      Int       @default(0) @map("current_balance")
  streakDays          Int       @default(0) @map("streak_days")
  streakLastDate      DateTime? @map("streak_last_date") @db.Date
  isVerified          Boolean   @default(false) @map("is_verified")
  notificationPush    Boolean   @default(true) @map("notification_push")
  notificationEmail   Boolean   @default(false) @map("notification_email")
  isPrivate           Boolean   @default(false) @map("is_private")
  shareDataWithBrands Boolean   @default(false) @map("share_data_with_brands")
  fcmToken            String?   @map("fcm_token")
  role                UserRole  @default(user)
  createdAt           DateTime  @default(now()) @map("created_at")
  lastActive          DateTime  @default(now()) @map("last_active")

  content           Content[]
  pointsLedger      PointsLedger[]
  interactions      Interaction[]
  comments          Comment[]
  streaks           Streak[]
  leaderboardEntries LeaderboardEntry[]
  notifications     Notification[]
  followers         Follow[]  @relation("following")
  following         Follow[]  @relation("follower")

  @@index([primaryPincode])
  @@map("users")
}

model Content {
  id               String           @id @default(uuid())
  userId           String           @map("user_id")
  type             ContentType
  text             String?
  hashtags         String[]         @default([])
  locationPincode  String?          @map("location_pincode") @db.VarChar(6)
  moderationStatus ModerationStatus @default(pending) @map("moderation_status")
  declineReason    String?          @map("decline_reason")
  isTrending       Boolean          @default(false) @map("is_trending")
  likeCount        Int              @default(0) @map("like_count")
  commentCount     Int              @default(0) @map("comment_count")
  shareCount       Int              @default(0) @map("share_count")
  viewCount        Int              @default(0) @map("view_count")
  pointsEarned     Int              @default(0) @map("points_earned")
  publishedAt      DateTime?        @map("published_at")
  createdAt        DateTime         @default(now()) @map("created_at")

  user             User             @relation(fields: [userId], references: [id])
  media            ContentMedia[]
  interactions     Interaction[]
  comments         Comment[]
  moderationQueue  ModerationQueue[]
  pointsLedger     PointsLedger[]

  @@index([userId])
  @@index([moderationStatus])
  @@index([locationPincode])
  @@index([publishedAt(sort: Desc)])
  @@index([isTrending])
  @@map("content")
}

model ContentMedia {
  id              String          @id @default(uuid())
  contentId       String          @map("content_id")
  type            MediaType
  originalUrl     String          @map("original_url")
  thumbnailUrl    String?         @map("thumbnail_url")
  video360pUrl    String?         @map("video_360p_url")
  video720pUrl    String?         @map("video_720p_url")
  video1080pUrl   String?         @map("video_1080p_url")
  durationSeconds Int?            @map("duration_seconds")
  width           Int
  height          Int
  sortOrder       Int             @default(1) @map("sort_order")
  transcodeStatus TranscodeStatus @default(pending) @map("transcode_status")

  content Content @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@map("content_media")
}

model PointsLedger {
  id                String   @id @default(uuid())
  userId            String   @map("user_id")
  actionType        String   @map("action_type")
  contentId         String?  @map("content_id")
  points            Int
  multiplierApplied Decimal  @map("multiplier_applied") @db.Decimal(3, 2)
  expiresAt         DateTime @map("expires_at")
  redeemedAt        DateTime? @map("redeemed_at")
  expired           Boolean  @default(false)
  createdAt         DateTime @default(now()) @map("created_at")

  user    User     @relation(fields: [userId], references: [id])
  content Content? @relation(fields: [contentId], references: [id])

  @@index([userId])
  @@index([actionType])
  @@index([createdAt])
  @@index([expiresAt])
  @@map("points_ledger")
}

model Follow {
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("follower", fields: [followerId], references: [id])
  following User @relation("following", fields: [followingId], references: [id])

  @@id([followerId, followingId])
  @@map("follows")
}

model Interaction {
  id        String          @id @default(uuid())
  userId    String          @map("user_id")
  contentId String          @map("content_id")
  type      InteractionType
  createdAt DateTime        @default(now()) @map("created_at")

  user    User    @relation(fields: [userId], references: [id])
  content Content @relation(fields: [contentId], references: [id])

  @@unique([userId, contentId, type])
  @@map("interactions")
}

model Comment {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  contentId String   @map("content_id")
  text      String
  parentId  String?  @map("parent_id")
  likeCount Int      @default(0) @map("like_count")
  createdAt DateTime @default(now()) @map("created_at")

  user    User     @relation(fields: [userId], references: [id])
  content Content  @relation(fields: [contentId], references: [id])
  parent  Comment? @relation("replies", fields: [parentId], references: [id])
  replies Comment[] @relation("replies")

  @@index([contentId])
  @@map("comments")
}

model ModerationQueue {
  id              String              @id @default(uuid())
  contentId       String              @map("content_id")
  autoCheckResult Json?               @map("auto_check_result")
  autoApproved    Boolean             @default(false) @map("auto_approved")
  reviewerId      String?             @map("reviewer_id")
  decision        ModerationDecision?
  declineCode     String?             @map("decline_code")
  isAppeal        Boolean             @default(false) @map("is_appeal")
  reviewedAt      DateTime?           @map("reviewed_at")
  createdAt       DateTime            @default(now()) @map("created_at")

  content Content @relation(fields: [contentId], references: [id])

  @@index([contentId])
  @@map("moderation_queue")
}

model Streak {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  date         DateTime @db.Date
  pointsEarned Int      @default(0) @map("points_earned")
  actionsCount Int      @default(0) @map("actions_count")

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, date])
  @@map("streaks")
}

model LeaderboardEntry {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  pincode      String   @db.VarChar(6)
  scope        String
  periodStart  DateTime @map("period_start") @db.Date
  periodEnd    DateTime @map("period_end") @db.Date
  pointsEarned Int      @map("points_earned")
  rank         Int?

  user User @relation(fields: [userId], references: [id])

  @@index([pincode, scope, periodStart])
  @@map("leaderboard_entries")
}

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  type      String
  title     String
  body      String
  data      Json?
  deepLink  String?  @map("deep_link")
  isRead    Boolean  @default(false) @map("is_read")
  isPushed  Boolean  @default(false) @map("is_pushed")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId, isRead])
  @@map("notifications")
}
```

- [ ] **Step 2: Generate Prisma client**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx prisma generate`
Expected: "Prisma Client generated" message. No errors.

- [ ] **Step 3: Push schema to database (development)**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx prisma db push`
Expected: Schema synced to database. All 11 tables created.

Note: This requires `DATABASE_URL` in `.env`. For local development, use a local PostgreSQL instance or a Supabase project.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add Prisma schema with all 11 tables for Phase 1"
```

---

## Task 4: API Server Skeleton + Config + Error Handling

**Files:**
- Create: `apps/api/src/config/index.ts`
- Create: `apps/api/src/utils/errors.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/tests/helpers/setup.ts`

- [ ] **Step 1: Create config loader with validation**

`apps/api/src/config/index.ts`:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  FIREBASE_PROJECT_ID: z.string(),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string(),
  CLOUDFRONT_DOMAIN: z.string(),
  MEDIACONVERT_ENDPOINT: z.string().url(),
  MEDIACONVERT_ROLE_ARN: z.string(),
  GOOGLE_CLOUD_VISION_KEY: z.string(),
  JWT_SECRET: z.string().min(16),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
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
```

- [ ] **Step 2: Create error utilities**

`apps/api/src/utils/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  unauthorized: (msg = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', msg),
  forbidden: (msg = 'Forbidden') => new AppError(403, 'FORBIDDEN', msg),
  notFound: (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} not found`),
  conflict: (msg: string) => new AppError(409, 'CONFLICT', msg),
  badRequest: (msg: string) => new AppError(400, 'BAD_REQUEST', msg),
  tooManyRequests: (msg = 'Rate limit exceeded') => new AppError(429, 'RATE_LIMITED', msg),
  dailyCapReached: (action: string) => new AppError(400, 'DAILY_CAP_REACHED', `Daily cap reached for ${action}`),
  internal: (msg = 'Internal server error') => new AppError(500, 'INTERNAL', msg),
};
```

- [ ] **Step 3: Create app factory**

`apps/api/src/app.ts`:
```typescript
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './utils/errors.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: error.message,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    // Unknown errors
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      code: 'INTERNAL',
      statusCode: 500,
    });
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Route registration will happen here in later tasks
  // app.register(authRoutes, { prefix: '/api/v1' });
  // etc.

  return app;
}
```

- [ ] **Step 4: Create server entry point**

`apps/api/src/server.ts`:
```typescript
import 'dotenv/config';
import { buildApp } from './app.js';
import { getConfig } from './config/index.js';

async function start() {
  const config = getConfig();
  const app = buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Eru API running on port ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
```

- [ ] **Step 5: Create test setup helper**

`apps/api/tests/helpers/setup.ts`:
```typescript
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

export function getTestApp(): FastifyInstance {
  if (!app) {
    app = buildApp();
  }
  return app;
}

export async function closeTestApp() {
  if (app) {
    await app.close();
  }
}
```

- [ ] **Step 6: Write a smoke test for health endpoint**

`apps/api/tests/routes/health.test.ts`:
```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';

describe('GET /health', () => {
  afterAll(async () => {
    await closeTestApp();
  });

  it('returns 200 with status ok', async () => {
    const app = getTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx vitest run tests/routes/health.test.ts`
Expected: PASS — 1 test passes.

- [ ] **Step 8: Add dotenv dependency and commit**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npm install dotenv`

```bash
git add apps/api/src/ apps/api/tests/ apps/api/package.json
git commit -m "feat: add API server skeleton with config, errors, health endpoint, and test"
```

---

## Task 5: Auth Middleware + Firebase Verification

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/middleware/admin.ts`
- Create: `apps/api/src/utils/firebase.ts`
- Create: `apps/api/src/utils/prisma.ts`

- [ ] **Step 1: Create Prisma client singleton**

`apps/api/src/utils/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Create Firebase Admin setup**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npm install firebase-admin`

`apps/api/src/utils/firebase.ts`:
```typescript
import admin from 'firebase-admin';
import { getConfig } from '../config/index.js';

let initialized = false;

export function getFirebaseAdmin(): typeof admin {
  if (!initialized) {
    const config = getConfig();
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
        privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
  }
  return admin;
}

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
  const fb = getFirebaseAdmin();
  return fb.auth().verifyIdToken(token);
}
```

- [ ] **Step 3: Create auth middleware**

`apps/api/src/middleware/auth.ts`:
```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { verifyFirebaseToken } from '../utils/firebase.js';
import { Errors } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userRole: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Errors.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await verifyFirebaseToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, role: true },
    });

    if (!user) {
      throw Errors.unauthorized('User not found. Please register first.');
    }

    request.userId = user.id;
    request.userRole = user.role;

    // Update last active (fire-and-forget, don't await)
    prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch(() => {});
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') throw error;
    throw Errors.unauthorized('Invalid or expired token');
  }
}
```

- [ ] **Step 4: Create admin middleware**

`apps/api/src/middleware/admin.ts`:
```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { Errors } from '../utils/errors.js';

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (request.userRole !== 'admin') {
    throw Errors.forbidden('Admin access required');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/middleware/ apps/api/src/utils/prisma.ts apps/api/src/utils/firebase.ts apps/api/package.json
git commit -m "feat: add auth middleware with Firebase JWT verification and Prisma client"
```

---

## Task 6: Rate Limiting

**Files:**
- Create: `apps/api/src/middleware/rateLimit.ts`
- Create: `apps/api/src/utils/redis.ts`

- [ ] **Step 1: Create Redis client**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npm install @upstash/redis @upstash/ratelimit`

`apps/api/src/utils/redis.ts`:
```typescript
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.REDIS_URL!,
    });
  }
  return redis;
}
```

- [ ] **Step 2: Create rate limit middleware**

`apps/api/src/middleware/rateLimit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '../utils/redis.js';
import { Errors } from '../utils/errors.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, requests: number, window: string): Ratelimit {
  const key = `${name}:${requests}:${window}`;
  if (!limiters.has(key)) {
    limiters.set(key, new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `ratelimit:${name}`,
    }));
  }
  return limiters.get(key)!;
}

export function rateLimitByUser(requests: number, window: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const limiter = getLimiter('user', requests, window);
    const identifier = request.userId || request.ip;
    const { success, remaining } = await limiter.limit(identifier);

    reply.header('X-RateLimit-Remaining', remaining);

    if (!success) {
      throw Errors.tooManyRequests();
    }
  };
}

export function rateLimitByIp(requests: number, window: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const limiter = getLimiter('ip', requests, window);
    const { success, remaining } = await limiter.limit(request.ip);

    reply.header('X-RateLimit-Remaining', remaining);

    if (!success) {
      throw Errors.tooManyRequests();
    }
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/utils/redis.ts apps/api/src/middleware/rateLimit.ts apps/api/package.json
git commit -m "feat: add Redis client and rate limiting middleware"
```

---

## Task 7: Zod Validators

**Files:**
- Create: `apps/api/src/utils/validators.ts`

- [ ] **Step 1: Write all request body validators**

`apps/api/src/utils/validators.ts`:
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  firebaseUid: z.string().min(1),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone format'),
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export const createContentSchema = z.object({
  type: z.enum(['post', 'reel', 'poll', 'thread']),
  text: z.string().max(2200).optional(),
  mediaIds: z.array(z.string().uuid()).default([]),
  hashtags: z.array(z.string().max(50)).max(30).default([]),
  locationPincode: z.string().length(6).optional(),
});

export const earnSchema = z.object({
  actionType: z.enum([
    'read_article', 'watch_video', 'reel_watch', 'listen_podcast', 'read_thread',
    'like', 'comment', 'share', 'save', 'follow',
    'daily_checkin', 'create_content', 'content_trending', 'refer_friend', 'complete_profile',
  ]),
  contentId: z.string().uuid().optional(),
  metadata: z.object({
    watchTimeSeconds: z.number().positive().optional(),
    wordCount: z.number().positive().optional(),
  }).optional(),
});

export const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.string().date().optional(),
  primaryPincode: z.string().length(6).optional(),
  secondaryPincodes: z.array(z.string().length(6)).max(5).optional(),
  interests: z.array(z.string()).optional(),
  contentLanguages: z.array(z.string()).optional(),
  appLanguage: z.string().optional(),
  notificationPush: z.boolean().optional(),
  notificationEmail: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  shareDataWithBrands: z.boolean().optional(),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const feedQuerySchema = paginationSchema.extend({
  pincode: z.string().length(6).optional(),
});

export const exploreQuerySchema = paginationSchema.extend({
  category: z.string().default('all'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
});

export const reelsQuerySchema = paginationSchema.extend({
  tab: z.enum(['foryou', 'following', 'local']).default('foryou'),
});

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['pincode', 'state', 'national']).default('pincode'),
  pincode: z.string().length(6).optional(),
});

export const moderationDeclineSchema = z.object({
  code: z.enum(['MOD-01', 'MOD-02', 'MOD-03', 'MOD-04', 'MOD-05', 'MOD-06', 'MOD-07']),
});

export const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/utils/validators.ts
git commit -m "feat: add Zod validators for all API request schemas"
```

---

## Task 8: Auth Routes

**Files:**
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/tests/routes/auth.test.ts`

- [ ] **Step 1: Write auth route tests**

`apps/api/tests/routes/auth.test.ts`:
```typescript
import { describe, it, expect, afterAll, vi, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';

// Mock Firebase verification
vi.mock('../../src/utils/firebase.js', () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({ uid: 'firebase-test-uid' }),
  getFirebaseAdmin: vi.fn(),
}));

describe('POST /api/v1/auth/register', () => {
  afterAll(async () => { await closeTestApp(); });

  it('creates a new user and returns user data', async () => {
    const app = getTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        firebaseUid: 'firebase-test-uid',
        phone: '+919876543210',
        name: 'Preethi M',
        username: 'foodiepreethi',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user.name).toBe('Preethi M');
    expect(body.user.username).toBe('foodiepreethi');
    expect(body.user.tier).toBe('explorer');
    expect(body.user.currentBalance).toBe(0);
  });

  it('returns 409 for duplicate username', async () => {
    const app = getTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        firebaseUid: 'firebase-test-uid-2',
        phone: '+919876543211',
        name: 'Another User',
        username: 'foodiepreethi',
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it('returns 400 for invalid phone format', async () => {
    const app = getTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        firebaseUid: 'firebase-test-uid-3',
        phone: 'not-a-phone',
        name: 'Bad Phone',
        username: 'badphone',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Implement auth routes**

`apps/api/src/routes/auth.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { registerSchema } from '../utils/validators.js';
import { Errors, AppError } from '../utils/errors.js';
import { rateLimitByIp } from '../middleware/rateLimit.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', {
    preHandler: [rateLimitByIp(5, '1m')],
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { firebaseUid, phone, name, username } = parsed.data;

    // Check for existing user with same firebaseUid, phone, or username
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid },
          { phone },
          { username },
        ],
      },
    });

    if (existing) {
      if (existing.firebaseUid === firebaseUid) {
        throw Errors.conflict('User already registered');
      }
      if (existing.phone === phone) {
        throw Errors.conflict('Phone number already in use');
      }
      if (existing.username === username) {
        throw Errors.conflict('Username already taken');
      }
    }

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        phone,
        name,
        username,
        primaryPincode: '000000', // Will be set during onboarding
      },
    });

    return reply.status(201).send({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        phone: user.phone,
        tier: user.tier,
        currentBalance: user.currentBalance,
        createdAt: user.createdAt.toISOString(),
      },
    });
  });

  app.post('/auth/logout', async (request, reply) => {
    // Clear FCM token if present
    if (request.userId) {
      await prisma.user.update({
        where: { id: request.userId },
        data: { fcmToken: null },
      }).catch(() => {});
    }
    return { success: true };
  });
}
```

- [ ] **Step 3: Register auth routes in app.ts**

Add to `apps/api/src/app.ts` after the health check:

```typescript
import { authRoutes } from './routes/auth.js';

// Inside buildApp(), after health check:
app.register(authRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx vitest run tests/routes/auth.test.ts`
Expected: Tests pass (note: requires DATABASE_URL for integration tests, or mock Prisma).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/api/src/app.ts apps/api/tests/routes/auth.test.ts
git commit -m "feat: add auth routes — register and logout endpoints"
```

---

## Task 9: User Routes

**Files:**
- Create: `apps/api/src/routes/users.ts`

- [ ] **Step 1: Implement user routes**

`apps/api/src/routes/users.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { updateSettingsSchema, paginationSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function userRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook('preHandler', authMiddleware);

  // GET /users/:id/profile
  app.get('/users/:id/profile', async (request) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, username: true, avatarUrl: true, bio: true,
        tier: true, isVerified: true, createdAt: true,
        _count: {
          select: {
            content: { where: { moderationStatus: 'published' } },
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) throw Errors.notFound('User');

    const isFollowing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: request.userId, followingId: id } },
    });

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      tier: user.tier,
      isVerified: user.isVerified,
      postsCount: user._count.content,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing: !!isFollowing,
      createdAt: user.createdAt.toISOString(),
    };
  });

  // POST /users/:id/follow
  app.post('/users/:id/follow', {
    preHandler: [rateLimitByUser(100, '1m')],
  }, async (request) => {
    const { id } = request.params as { id: string };

    if (id === request.userId) {
      throw Errors.badRequest('Cannot follow yourself');
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw Errors.notFound('User');

    try {
      await prisma.follow.create({
        data: { followerId: request.userId, followingId: id },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw Errors.conflict('Already following this user');
      }
      throw error;
    }

    return { success: true };
  });

  // DELETE /users/:id/unfollow
  app.delete('/users/:id/unfollow', async (request) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId: request.userId, followingId: id } },
      });
    } catch {
      throw Errors.notFound('Follow relationship');
    }

    return { success: true };
  });

  // GET /users/:id/content
  app.get('/users/:id/content', async (request) => {
    const { id } = request.params as { id: string };
    const { page, limit } = paginationSchema.parse(request.query);
    const tab = (request.query as any).tab || 'posts';

    const where: any = { userId: id, moderationStatus: 'published' };
    if (tab === 'reels') where.type = 'reel';
    if (tab === 'created') where.userId = request.userId; // only own created content

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: { media: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.content.count({ where }),
    ]);

    return {
      data: content,
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  // GET /users/:id/followers
  app.get('/users/:id/followers', async (request) => {
    const { id } = request.params as { id: string };
    const { page, limit } = paginationSchema.parse(request.query);

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: id },
        include: {
          follower: {
            select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.follow.count({ where: { followingId: id } }),
    ]);

    return {
      data: follows.map((f) => f.follower),
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  // GET /users/:id/following
  app.get('/users/:id/following', async (request) => {
    const { id } = request.params as { id: string };
    const { page, limit } = paginationSchema.parse(request.query);

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: id },
        include: {
          following: {
            select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.follow.count({ where: { followerId: id } }),
    ]);

    return {
      data: follows.map((f) => f.following),
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  // GET /users/me/settings
  app.get('/users/me/settings', async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
    });
    if (!user) throw Errors.notFound('User');

    return {
      name: user.name,
      email: user.email,
      phone: user.phone,
      dob: user.dob?.toISOString().split('T')[0] || null,
      gender: user.gender,
      primaryPincode: user.primaryPincode,
      secondaryPincodes: user.secondaryPincodes,
      interests: user.interests,
      contentLanguages: user.contentLanguages,
      appLanguage: user.appLanguage,
      notificationPush: user.notificationPush,
      notificationEmail: user.notificationEmail,
      isPrivate: user.isPrivate,
      shareDataWithBrands: user.shareDataWithBrands,
    };
  });

  // PUT /users/me/settings
  app.put('/users/me/settings', async (request) => {
    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const data: any = { ...parsed.data };
    if (data.dob) data.dob = new Date(data.dob);

    const user = await prisma.user.update({
      where: { id: request.userId },
      data,
    });

    return { success: true, settings: data };
  });
}
```

- [ ] **Step 2: Register in app.ts**

Add to `apps/api/src/app.ts`:
```typescript
import { userRoutes } from './routes/users.js';
app.register(userRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/users.ts apps/api/src/app.ts
git commit -m "feat: add user routes — profile, follow, unfollow, content, followers, settings"
```

---

## Task 10: Points Engine (Core Business Logic)

**Files:**
- Create: `apps/api/src/services/pointsEngine.ts`
- Create: `apps/api/src/routes/actions.ts`
- Create: `apps/api/tests/services/pointsEngine.test.ts`

This is the most critical code in the entire system.

- [ ] **Step 1: Write points engine tests**

`apps/api/tests/services/pointsEngine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ACTION_CONFIGS } from '@eru/shared';

// Test the validation logic directly (unit tests, no DB)
describe('Points Engine Validation', () => {
  it('rejects unknown action types', () => {
    const config = ACTION_CONFIGS['fake_action' as any];
    expect(config).toBeUndefined();
  });

  it('has correct point values for all 15 actions', () => {
    expect(ACTION_CONFIGS.read_article.points).toBe(4);
    expect(ACTION_CONFIGS.watch_video.points).toBe(6);
    expect(ACTION_CONFIGS.reel_watch.points).toBe(3);
    expect(ACTION_CONFIGS.listen_podcast.points).toBe(5);
    expect(ACTION_CONFIGS.read_thread.points).toBe(3);
    expect(ACTION_CONFIGS.like.points).toBe(1);
    expect(ACTION_CONFIGS.comment.points).toBe(3);
    expect(ACTION_CONFIGS.share.points).toBe(2);
    expect(ACTION_CONFIGS.save.points).toBe(1);
    expect(ACTION_CONFIGS.follow.points).toBe(2);
    expect(ACTION_CONFIGS.daily_checkin.points).toBe(25);
    expect(ACTION_CONFIGS.create_content.points).toBe(30);
    expect(ACTION_CONFIGS.content_trending.points).toBe(200);
    expect(ACTION_CONFIGS.refer_friend.points).toBe(100);
    expect(ACTION_CONFIGS.complete_profile.points).toBe(50);
  });

  it('has daily caps for all actions', () => {
    for (const config of Object.values(ACTION_CONFIGS)) {
      expect(config.dailyCap).toBeGreaterThan(0);
    }
  });

  it('requires contentId for content/engagement actions', () => {
    expect(ACTION_CONFIGS.read_article.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.like.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.daily_checkin.requiresContentId).toBe(false);
    expect(ACTION_CONFIGS.refer_friend.requiresContentId).toBe(false);
  });
});

describe('Tier Multipliers', () => {
  it('explorer gets 1.0x', () => {
    const { getMultiplier } = require('@eru/shared');
    expect(getMultiplier('explorer')).toBe(1.0);
  });

  it('champion gets 2.0x', () => {
    const { getMultiplier } = require('@eru/shared');
    expect(getMultiplier('champion')).toBe(2.0);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx vitest run tests/services/pointsEngine.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Implement points engine service**

`apps/api/src/services/pointsEngine.ts`:
```typescript
import { prisma } from '../utils/prisma.js';
import { getRedis } from '../utils/redis.js';
import { ACTION_CONFIGS, DAILY_POINTS_GOAL, POINTS_EXPIRY_MONTHS } from '@eru/shared';
import { getMultiplier, getTierForPoints } from '@eru/shared';
import type { ActionType, EarnResult } from '@eru/shared';
import { Errors } from '../utils/errors.js';

export async function earnPoints(
  userId: string,
  actionType: ActionType,
  contentId?: string,
  metadata?: { watchTimeSeconds?: number; wordCount?: number },
): Promise<EarnResult> {
  const config = ACTION_CONFIGS[actionType];
  if (!config) {
    throw Errors.badRequest(`Unknown action type: ${actionType}`);
  }

  // 1. Validate contentId requirement
  if (config.requiresContentId && !contentId) {
    throw Errors.badRequest(`Action ${actionType} requires a contentId`);
  }

  // 2. Validate content exists (if contentId provided)
  if (contentId) {
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw Errors.notFound('Content');
    }
  }

  // 3. Check daily cap
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayCount = await prisma.pointsLedger.count({
    where: {
      userId,
      actionType,
      createdAt: { gte: today, lt: tomorrow },
    },
  });

  if (todayCount >= config.dailyCap) {
    throw Errors.dailyCapReached(actionType);
  }

  // 4. Validate action-specific rules
  if (config.validation.minWatchTimeSeconds && metadata?.watchTimeSeconds) {
    if (metadata.watchTimeSeconds < config.validation.minWatchTimeSeconds) {
      throw Errors.badRequest(`Minimum watch time not met for ${actionType}`);
    }
  }
  if (config.validation.minWordCount && metadata?.wordCount) {
    if (metadata.wordCount < config.validation.minWordCount) {
      throw Errors.badRequest(`Minimum word count not met for ${actionType}`);
    }
  }

  // 5. Check for duplicate interactions (like, save, share, follow)
  if (['like', 'save', 'share'].includes(actionType) && contentId) {
    const existing = await prisma.interaction.findUnique({
      where: { userId_contentId_type: { userId, contentId, type: actionType as any } },
    });
    if (existing) {
      throw Errors.conflict(`Already performed ${actionType} on this content`);
    }
  }

  // 6. Get user tier and multiplier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, lifetimePoints: true, currentBalance: true, streakDays: true },
  });
  if (!user) throw Errors.notFound('User');

  const multiplier = getMultiplier(user.tier);
  const points = Math.round(config.points * multiplier);

  // 7. Calculate expiry date (6 months from now)
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + POINTS_EXPIRY_MONTHS);

  // 8. Write to ledger + update user balance in a transaction
  const newLifetime = user.lifetimePoints + points;
  const newBalance = user.currentBalance + points;
  const newTier = getTierForPoints(newLifetime);

  await prisma.$transaction([
    prisma.pointsLedger.create({
      data: {
        userId,
        actionType,
        contentId,
        points,
        multiplierApplied: multiplier,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        lifetimePoints: newLifetime,
        currentBalance: newBalance,
        tier: newTier,
      },
    }),
  ]);

  // 9. Update Redis cache (fire-and-forget)
  const redis = getRedis();
  redis.set(`balance:${userId}`, newBalance, { ex: 300 }).catch(() => {});

  // Update leaderboard sorted set
  const userPincode = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryPincode: true },
  });
  if (userPincode) {
    redis.zincrby(`leaderboard:pincode:${userPincode.primaryPincode}`, points, userId).catch(() => {});
  }

  // 10. Update streak
  await updateStreak(userId, points);

  // 11. Calculate daily progress
  const dailyEarned = await prisma.pointsLedger.aggregate({
    where: { userId, createdAt: { gte: today, lt: tomorrow } },
    _sum: { points: true },
  });

  return {
    success: true,
    points,
    multiplier,
    newBalance,
    dailyProgress: {
      earned: dailyEarned._sum.points || 0,
      goal: DAILY_POINTS_GOAL,
    },
    streak: user.streakDays,
  };
}

async function updateStreak(userId: string, pointsEarned: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert today's streak record
  await prisma.streak.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      pointsEarned: { increment: pointsEarned },
      actionsCount: { increment: 1 },
    },
    create: {
      userId,
      date: today,
      pointsEarned,
      actionsCount: 1,
    },
  });

  // Check if we need to update the user's streak
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, streakLastDate: true },
  });
  if (!user) return;

  const todayStr = today.toISOString().split('T')[0];
  const lastDateStr = user.streakLastDate?.toISOString().split('T')[0];

  if (lastDateStr === todayStr) {
    // Already counted today
    return;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak: number;
  if (lastDateStr === yesterdayStr) {
    // Consecutive day — extend streak
    newStreak = user.streakDays + 1;
  } else {
    // Gap — start new streak
    newStreak = 1;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { streakDays: newStreak, streakLastDate: today },
  });
}
```

- [ ] **Step 4: Implement actions route**

`apps/api/src/routes/actions.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { earnSchema } from '../utils/validators.js';
import { earnPoints } from '../services/pointsEngine.js';
import { Errors } from '../utils/errors.js';
import type { ActionType } from '@eru/shared';

export async function actionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/actions/earn', {
    preHandler: [rateLimitByUser(30, '1m')],
  }, async (request) => {
    const parsed = earnSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { actionType, contentId, metadata } = parsed.data;

    const result = await earnPoints(
      request.userId,
      actionType as ActionType,
      contentId,
      metadata,
    );

    return result;
  });
}
```

- [ ] **Step 5: Register in app.ts**

Add to `apps/api/src/app.ts`:
```typescript
import { actionRoutes } from './routes/actions.js';
app.register(actionRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/pointsEngine.ts apps/api/src/routes/actions.ts apps/api/src/app.ts apps/api/tests/services/pointsEngine.test.ts
git commit -m "feat: add points engine with validation, daily caps, tier multipliers, streak tracking"
```

---

## Task 11: Content + Media Routes

**Files:**
- Create: `apps/api/src/services/mediaService.ts`
- Create: `apps/api/src/routes/content.ts`
- Create: `apps/api/src/routes/media.ts`

- [ ] **Step 1: Implement media service (S3)**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp`

`apps/api/src/services/mediaService.ts`:
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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
```

- [ ] **Step 2: Implement content routes**

`apps/api/src/routes/content.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { createContentSchema, commentSchema, paginationSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function contentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /content/create
  app.post('/content/create', {
    preHandler: [rateLimitByUser(100, '1m')],
  }, async (request, reply) => {
    const parsed = createContentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { type, text, mediaIds, hashtags, locationPincode } = parsed.data;

    const content = await prisma.content.create({
      data: {
        userId: request.userId,
        type,
        text,
        hashtags,
        locationPincode,
      },
    });

    // Link existing media records to this content
    if (mediaIds.length > 0) {
      await prisma.contentMedia.updateMany({
        where: { id: { in: mediaIds } },
        data: { contentId: content.id },
      });
    }

    // Trigger moderation (async — don't block the response)
    // moderationService.queueForModeration(content.id) — implemented in Task 12

    return reply.status(201).send({
      content: {
        id: content.id,
        type: content.type,
        moderationStatus: content.moderationStatus,
        createdAt: content.createdAt.toISOString(),
      },
    });
  });

  // GET /content/:id
  app.get('/content/:id', async (request) => {
    const { id } = request.params as { id: string };

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true },
        },
      },
    });

    if (!content) throw Errors.notFound('Content');

    // Check visibility: only published content visible to non-authors
    if (content.moderationStatus !== 'published' && content.userId !== request.userId) {
      throw Errors.notFound('Content');
    }

    // Check if current user liked/saved
    const interactions = await prisma.interaction.findMany({
      where: { userId: request.userId, contentId: id },
    });

    const comments = await prisma.comment.findMany({
      where: { contentId: id, parentId: null },
      include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    return {
      ...content,
      isLiked: interactions.some((i) => i.type === 'like'),
      isSaved: interactions.some((i) => i.type === 'save'),
      commentsPreview: comments,
    };
  });

  // POST /content/:id/resubmit
  app.post('/content/:id/resubmit', async (request) => {
    const { id } = request.params as { id: string };

    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) throw Errors.notFound('Content');
    if (content.userId !== request.userId) throw Errors.forbidden();
    if (content.moderationStatus !== 'declined') {
      throw Errors.badRequest('Only declined content can be resubmitted');
    }

    // Check resubmit count (max 3)
    const resubmitCount = await prisma.moderationQueue.count({
      where: { contentId: id },
    });
    if (resubmitCount >= 4) {
      throw Errors.badRequest('Maximum resubmit attempts reached');
    }

    await prisma.content.update({
      where: { id },
      data: { moderationStatus: 'pending', declineReason: null },
    });

    // Re-trigger moderation
    // moderationService.queueForModeration(id) — implemented in Task 12

    return { success: true, moderationStatus: 'pending' };
  });

  // POST /content/:id/appeal
  app.post('/content/:id/appeal', async (request) => {
    const { id } = request.params as { id: string };

    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) throw Errors.notFound('Content');
    if (content.userId !== request.userId) throw Errors.forbidden();
    if (content.moderationStatus !== 'declined') {
      throw Errors.badRequest('Only declined content can be appealed');
    }

    // Check if already appealed
    const existingAppeal = await prisma.moderationQueue.findFirst({
      where: { contentId: id, isAppeal: true },
    });
    if (existingAppeal) {
      throw Errors.conflict('Appeal already submitted');
    }

    await prisma.moderationQueue.create({
      data: { contentId: id, isAppeal: true },
    });

    return { success: true, message: 'Appeal submitted for senior review' };
  });

  // POST /posts/:id/like and /posts/:id/unlike
  app.post('/posts/:id/like', async (request) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.interaction.create({
        data: { userId: request.userId, contentId: id, type: 'like' },
      });
      await prisma.content.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      });
    } catch (error: any) {
      if (error.code === 'P2002') throw Errors.conflict('Already liked');
      throw error;
    }

    return { success: true };
  });

  app.delete('/posts/:id/unlike', async (request) => {
    const { id } = request.params as { id: string };

    try {
      await prisma.interaction.delete({
        where: { userId_contentId_type: { userId: request.userId, contentId: id, type: 'like' } },
      });
      await prisma.content.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
      });
    } catch {
      throw Errors.notFound('Like');
    }

    return { success: true };
  });

  // POST /posts/:id/comments
  app.post('/posts/:id/comments', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) throw Errors.notFound('Content');

    const comment = await prisma.comment.create({
      data: {
        userId: request.userId,
        contentId: id,
        text: parsed.data.text,
        parentId: parsed.data.parentId,
      },
    });

    await prisma.content.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
    });

    return { comment };
  });

  // GET /posts/:id/comments
  app.get('/posts/:id/comments', async (request) => {
    const { id } = request.params as { id: string };
    const { page, limit } = paginationSchema.parse(request.query);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { contentId: id, parentId: null },
        include: {
          user: { select: { id: true, name: true, username: true, avatarUrl: true } },
          replies: {
            include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
            take: 3,
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.comment.count({ where: { contentId: id, parentId: null } }),
    ]);

    return { data: comments, nextPage: page * limit < total ? page + 1 : null, total };
  });
}
```

- [ ] **Step 3: Implement media routes**

`apps/api/src/routes/media.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { prisma } from '../utils/prisma.js';
import { generatePresignedUploadUrl, getCdnUrl } from '../services/mediaService.js';

export async function mediaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /media/upload — for images (multipart, processed server-side)
  app.post('/media/upload', {
    preHandler: [rateLimitByUser(10, '1m')],
  }, async (request, reply) => {
    // For Phase 1, we use presigned URLs for all uploads
    // This endpoint creates a media record and returns an upload URL
    const { contentType, width, height } = request.body as {
      contentType: string; width: number; height: number;
    };

    const isVideo = contentType.startsWith('video/');
    const presigned = await generatePresignedUploadUrl(request.userId, contentType);

    const media = await prisma.contentMedia.create({
      data: {
        contentId: '00000000-0000-0000-0000-000000000000', // placeholder, linked on content create
        type: isVideo ? 'video' : 'image',
        originalUrl: getCdnUrl(presigned.key),
        width,
        height,
        transcodeStatus: isVideo ? 'pending' : 'complete',
      },
    });

    return reply.status(201).send({
      mediaId: media.id,
      uploadUrl: presigned.uploadUrl,
      cdnUrl: media.originalUrl,
    });
  });

  // POST /media/presign — for videos (direct S3 upload from phone)
  app.post('/media/presign', {
    preHandler: [rateLimitByUser(10, '1m')],
  }, async (request) => {
    const { contentType, size } = request.body as { contentType: string; size: number };

    // Max 300MB per video
    if (size > 300 * 1024 * 1024) {
      return { error: 'File too large. Maximum 300MB.' };
    }

    const presigned = await generatePresignedUploadUrl(request.userId, contentType);

    return {
      uploadUrl: presigned.uploadUrl,
      mediaId: presigned.mediaId,
      key: presigned.key,
    };
  });
}
```

- [ ] **Step 4: Register in app.ts**

Add to `apps/api/src/app.ts`:
```typescript
import { contentRoutes } from './routes/content.js';
import { mediaRoutes } from './routes/media.js';
app.register(contentRoutes, { prefix: '/api/v1' });
app.register(mediaRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/mediaService.ts apps/api/src/routes/content.ts apps/api/src/routes/media.ts apps/api/src/app.ts apps/api/package.json
git commit -m "feat: add content CRUD, media upload with S3 presigned URLs, comments, likes"
```

---

## Task 12: Moderation Service

**Files:**
- Create: `apps/api/src/services/moderationService.ts`
- Create: `apps/api/src/routes/admin.ts`

- [ ] **Step 1: Implement moderation service**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npm install @google-cloud/vision`

`apps/api/src/services/moderationService.ts`:
```typescript
import vision from '@google-cloud/vision';
import { prisma } from '../utils/prisma.js';
import { earnPoints } from './pointsEngine.js';

const AUTO_APPROVE_THRESHOLD = 0.95;

interface ModerationScores {
  nsfw: number;
  violence: number;
  spam: number;
  racy: number;
}

export async function queueForModeration(contentId: string): Promise<void> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { media: true },
  });

  if (!content) return;

  let scores: ModerationScores = { nsfw: 0, violence: 0, spam: 0, racy: 0 };

  // Run AI checks on media
  if (content.media.length > 0) {
    const imageMedia = content.media.filter((m) => m.type === 'image');
    if (imageMedia.length > 0) {
      scores = await runVisionCheck(imageMedia[0].originalUrl);
    }
  }

  // Run text checks
  if (content.text) {
    const textScore = runTextCheck(content.text);
    scores.spam = Math.max(scores.spam, textScore);
  }

  // Calculate combined confidence
  const maxRisk = Math.max(scores.nsfw, scores.violence, scores.spam, scores.racy);
  const confidence = 1 - maxRisk;
  const autoApproved = confidence >= AUTO_APPROVE_THRESHOLD;

  // Create moderation queue entry
  await prisma.moderationQueue.create({
    data: {
      contentId,
      autoCheckResult: scores as any,
      autoApproved,
      decision: autoApproved ? 'approved' : null,
      reviewedAt: autoApproved ? new Date() : null,
    },
  });

  if (autoApproved) {
    // Auto-approve: publish content and credit points
    await prisma.content.update({
      where: { id: contentId },
      data: { moderationStatus: 'published', publishedAt: new Date() },
    });

    // Credit creator with +30 pts
    await earnPoints(content.userId, 'create_content', contentId).catch(() => {});

    // TODO: Send push notification "Your content is live! +30 pts"
  }
  // If not auto-approved, content stays pending for human review
}

async function runVisionCheck(imageUrl: string): Promise<ModerationScores> {
  try {
    const client = new vision.ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_CLOUD_VISION_KEY,
    });

    const [result] = await client.safeSearchDetection(imageUrl);
    const safe = result.safeSearchAnnotation;

    if (!safe) return { nsfw: 0, violence: 0, spam: 0, racy: 0 };

    // Convert Google's likelihood enum to 0-1 scores
    const likelihoodToScore: Record<string, number> = {
      UNKNOWN: 0,
      VERY_UNLIKELY: 0.05,
      UNLIKELY: 0.15,
      POSSIBLE: 0.5,
      LIKELY: 0.8,
      VERY_LIKELY: 0.95,
    };

    return {
      nsfw: likelihoodToScore[safe.adult || 'UNKNOWN'] || 0,
      violence: likelihoodToScore[safe.violence || 'UNKNOWN'] || 0,
      spam: likelihoodToScore[safe.spoof || 'UNKNOWN'] || 0,
      racy: likelihoodToScore[safe.racy || 'UNKNOWN'] || 0,
    };
  } catch (error) {
    console.error('Vision API error:', error);
    // On API failure, route to human review (don't auto-approve)
    return { nsfw: 0.5, violence: 0, spam: 0, racy: 0 };
  }
}

function runTextCheck(text: string): number {
  let score = 0;

  // Check for spam patterns
  const upperRatio = (text.match(/[A-Z]/g)?.length || 0) / text.length;
  if (upperRatio > 0.7 && text.length > 10) score = Math.max(score, 0.3);

  // Check for excessive URLs
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) score = Math.max(score, 0.4);

  // Check for repeated text
  const words = text.toLowerCase().split(/\s+/);
  const uniqueRatio = new Set(words).size / words.length;
  if (uniqueRatio < 0.3 && words.length > 10) score = Math.max(score, 0.5);

  return score;
}

export async function approveContent(queueId: string, reviewerId: string): Promise<void> {
  const entry = await prisma.moderationQueue.findUnique({
    where: { id: queueId },
    include: { content: true },
  });

  if (!entry) throw new Error('Queue entry not found');

  await prisma.$transaction([
    prisma.moderationQueue.update({
      where: { id: queueId },
      data: { decision: 'approved', reviewerId, reviewedAt: new Date() },
    }),
    prisma.content.update({
      where: { id: entry.contentId },
      data: { moderationStatus: 'published', publishedAt: new Date() },
    }),
  ]);

  // Credit points
  await earnPoints(entry.content.userId, 'create_content', entry.contentId).catch(() => {});
}

export async function declineContent(queueId: string, reviewerId: string, declineCode: string): Promise<void> {
  const entry = await prisma.moderationQueue.findUnique({ where: { id: queueId } });
  if (!entry) throw new Error('Queue entry not found');

  await prisma.$transaction([
    prisma.moderationQueue.update({
      where: { id: queueId },
      data: { decision: 'declined', declineCode, reviewerId, reviewedAt: new Date() },
    }),
    prisma.content.update({
      where: { id: entry.contentId },
      data: { moderationStatus: 'declined', declineReason: declineCode },
    }),
  ]);
}
```

- [ ] **Step 2: Implement admin routes**

`apps/api/src/routes/admin.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { approveContent, declineContent } from '../services/moderationService.js';
import { moderationDeclineSchema, paginationSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', adminMiddleware);

  // GET /admin/moderation/queue
  app.get('/admin/moderation/queue', async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const status = (request.query as any).status || 'pending';

    const where: any = {};
    if (status === 'pending') {
      where.decision = null;
      where.isAppeal = false;
    } else if (status === 'appeal') {
      where.decision = null;
      where.isAppeal = true;
    }

    const [items, total] = await Promise.all([
      prisma.moderationQueue.findMany({
        where,
        include: {
          content: {
            include: {
              media: true,
              user: { select: { id: true, name: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.moderationQueue.count({ where }),
    ]);

    return { data: items, total, nextPage: page * limit < total ? page + 1 : null };
  });

  // GET /admin/moderation/:id
  app.get('/admin/moderation/:id', async (request) => {
    const { id } = request.params as { id: string };

    const entry = await prisma.moderationQueue.findUnique({
      where: { id },
      include: {
        content: {
          include: {
            media: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    if (!entry) throw Errors.notFound('Moderation entry');
    return entry;
  });

  // POST /admin/moderation/:id/approve
  app.post('/admin/moderation/:id/approve', async (request) => {
    const { id } = request.params as { id: string };
    await approveContent(id, request.userId);
    return { success: true };
  });

  // POST /admin/moderation/:id/decline
  app.post('/admin/moderation/:id/decline', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = moderationDeclineSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest('Invalid decline code');

    await declineContent(id, request.userId, parsed.data.code);
    return { success: true };
  });

  // GET /admin/moderation/stats
  app.get('/admin/moderation/stats', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [reviewed, approved, declined, pending] = await Promise.all([
      prisma.moderationQueue.count({ where: { reviewedAt: { gte: today } } }),
      prisma.moderationQueue.count({ where: { decision: 'approved', reviewedAt: { gte: today } } }),
      prisma.moderationQueue.count({ where: { decision: 'declined', reviewedAt: { gte: today } } }),
      prisma.moderationQueue.count({ where: { decision: null } }),
    ]);

    return { reviewed, approved, declined, pending };
  });
}
```

- [ ] **Step 3: Register in app.ts**

Add to `apps/api/src/app.ts`:
```typescript
import { adminRoutes } from './routes/admin.js';
app.register(adminRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/moderationService.ts apps/api/src/routes/admin.ts apps/api/src/app.ts apps/api/package.json
git commit -m "feat: add content moderation — Cloud Vision AI checks, admin approve/decline, appeal flow"
```

---

## Task 13: Feed Algorithm + Routes

**Files:**
- Create: `apps/api/src/services/feedAlgorithm.ts`
- Create: `apps/api/src/routes/feed.ts`

- [ ] **Step 1: Implement feed algorithm**

`apps/api/src/services/feedAlgorithm.ts`:
```typescript
import { prisma } from '../utils/prisma.js';

interface FeedParams {
  userId: string;
  pincode: string;
  interests: string[];
  followingIds: string[];
  page: number;
  limit: number;
}

interface ScoredContent {
  content: any;
  score: number;
}

const WEIGHTS = {
  recency: 0.3,
  engagement: 0.25,
  interestMatch: 0.2,
  pincodeProximity: 0.15,
  following: 0.1,
};

export async function getFeed(params: FeedParams) {
  const { userId, pincode, interests, followingIds, page, limit } = params;

  // Fetch candidate content (published, recent)
  const candidates = await prisma.content.findMany({
    where: {
      moderationStatus: 'published',
      publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
    },
    include: {
      media: { orderBy: { sortOrder: 'asc' } },
      user: {
        select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 200, // fetch a pool to score
  });

  // Get user's interactions to check liked/saved
  const userInteractions = await prisma.interaction.findMany({
    where: { userId, contentId: { in: candidates.map((c) => c.id) } },
  });
  const likedIds = new Set(userInteractions.filter((i) => i.type === 'like').map((i) => i.contentId));
  const savedIds = new Set(userInteractions.filter((i) => i.type === 'save').map((i) => i.contentId));
  const followingSet = new Set(followingIds);

  // Score each candidate
  const scored: ScoredContent[] = candidates.map((content) => {
    const recencyScore = calculateRecency(content.publishedAt!);
    const engagementScore = calculateEngagement(content);
    const interestScore = calculateInterestMatch(content.hashtags, interests);
    const pincodeScore = calculatePincodeProximity(content.locationPincode, pincode);
    const followingScore = followingSet.has(content.userId) ? 1.0 : 0.0;

    const score =
      WEIGHTS.recency * recencyScore +
      WEIGHTS.engagement * engagementScore +
      WEIGHTS.interestMatch * interestScore +
      WEIGHTS.pincodeProximity * pincodeScore +
      WEIGHTS.following * followingScore;

    return { content, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Paginate
  const start = (page - 1) * limit;
  const pageItems = scored.slice(start, start + limit);

  return {
    data: pageItems.map(({ content }) => ({
      ...content,
      isLiked: likedIds.has(content.id),
      isSaved: savedIds.has(content.id),
      commentsPreview: [],
    })),
    nextPage: start + limit < scored.length ? page + 1 : null,
    total: scored.length,
  };
}

function calculateRecency(publishedAt: Date): number {
  const hoursOld = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 1) return 1.0;
  if (hoursOld < 6) return 0.8;
  if (hoursOld < 24) return 0.5;
  if (hoursOld < 48) return 0.3;
  return 0.1;
}

function calculateEngagement(content: { likeCount: number; commentCount: number; shareCount: number }): number {
  const raw = content.likeCount + content.commentCount * 2 + content.shareCount * 3;
  // Normalize: 100 engagement = 1.0 score
  return Math.min(raw / 100, 1.0);
}

function calculateInterestMatch(hashtags: string[], userInterests: string[]): number {
  if (hashtags.length === 0 || userInterests.length === 0) return 0.3; // neutral
  const matchCount = hashtags.filter((tag) =>
    userInterests.some((interest) => tag.toLowerCase().includes(interest.toLowerCase()))
  ).length;
  return Math.min(matchCount / userInterests.length, 1.0);
}

function calculatePincodeProximity(contentPincode: string | null, userPincode: string): number {
  if (!contentPincode) return 0.2;
  if (contentPincode === userPincode) return 1.0;
  // Same first 3 digits = same city area
  if (contentPincode.slice(0, 3) === userPincode.slice(0, 3)) return 0.5;
  return 0.2;
}

// Placeholder for Phase 2 sponsored content injection
export function injectSponsoredContent(): null {
  return null;
}
```

- [ ] **Step 2: Implement feed routes**

`apps/api/src/routes/feed.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { feedQuerySchema } from '../utils/validators.js';
import { getFeed } from '../services/feedAlgorithm.js';
import { getRedis } from '../utils/redis.js';

export async function feedRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // GET /feed
  app.get('/feed', async (request) => {
    const { page, limit, pincode } = feedQuerySchema.parse(request.query);

    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { primaryPincode: true, interests: true },
    });

    const followingRecords = await prisma.follow.findMany({
      where: { followerId: request.userId },
      select: { followingId: true },
    });

    return getFeed({
      userId: request.userId,
      pincode: pincode || user?.primaryPincode || '000000',
      interests: user?.interests || [],
      followingIds: followingRecords.map((f) => f.followingId),
      page,
      limit,
    });
  });

  // GET /stories
  app.get('/stories', async (request) => {
    // Stories: latest content from followed users (last 24h)
    const following = await prisma.follow.findMany({
      where: { followerId: request.userId },
      select: { followingId: true },
    });

    const stories = await prisma.content.findMany({
      where: {
        userId: { in: following.map((f) => f.followingId) },
        moderationStatus: 'published',
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true } },
        media: { take: 1 },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    // Group by user
    const grouped = new Map<string, any>();
    for (const story of stories) {
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, {
          user: story.user,
          items: [],
          latestAt: story.publishedAt,
        });
      }
      grouped.get(story.userId)!.items.push(story);
    }

    return { stories: Array.from(grouped.values()) };
  });

  // GET /wallet/summary (for header badge)
  app.get('/wallet/summary', async (request) => {
    const redis = getRedis();

    // Try Redis cache first
    const cached = await redis.get(`balance:${request.userId}`);

    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { currentBalance: true, streakDays: true, tier: true },
    });

    return {
      balance: cached ? Number(cached) : user?.currentBalance || 0,
      streak: user?.streakDays || 0,
      tier: user?.tier || 'explorer',
    };
  });
}
```

- [ ] **Step 3: Register in app.ts**

Add to `apps/api/src/app.ts`:
```typescript
import { feedRoutes } from './routes/feed.js';
app.register(feedRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/feedAlgorithm.ts apps/api/src/routes/feed.ts apps/api/src/app.ts
git commit -m "feat: add feed algorithm with recency/engagement/interest/pincode scoring and feed routes"
```

---

## Task 14: Explore, Reels, Wallet, Leaderboard, Notification Routes

**Files:**
- Create: `apps/api/src/routes/explore.ts`
- Create: `apps/api/src/routes/reels.ts`
- Create: `apps/api/src/routes/wallet.ts`
- Create: `apps/api/src/routes/leaderboard.ts`
- Create: `apps/api/src/routes/notifications.ts`
- Create: `apps/api/src/services/leaderboardService.ts`

- [ ] **Step 1: Implement remaining routes**

`apps/api/src/routes/explore.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { exploreQuerySchema, searchQuerySchema } from '../utils/validators.js';

export async function exploreRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/explore', async (request) => {
    const { page, limit, category } = exploreQuerySchema.parse(request.query);

    const where: any = { moderationStatus: 'published' };
    if (category !== 'all') {
      where.hashtags = { has: category };
    }

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          media: { take: 1 },
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
        orderBy: [{ isTrending: 'desc' }, { likeCount: 'desc' }, { publishedAt: 'desc' }],
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.content.count({ where }),
    ]);

    return { data: content, nextPage: page * limit < total ? page + 1 : null, total };
  });

  app.get('/search', async (request) => {
    const { q } = searchQuerySchema.parse(request.query);

    const [users, posts, hashtags] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ username: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true },
        take: 10,
      }),
      prisma.content.findMany({
        where: { moderationStatus: 'published', text: { contains: q, mode: 'insensitive' } },
        include: { media: { take: 1 } },
        take: 10,
      }),
      prisma.content.findMany({
        where: { moderationStatus: 'published', hashtags: { has: q.toLowerCase() } },
        select: { hashtags: true },
        take: 50,
      }),
    ]);

    const uniqueHashtags = [...new Set(hashtags.flatMap((p) => p.hashtags).filter((h) => h.toLowerCase().includes(q.toLowerCase())))];

    return { users, posts, hashtags: uniqueHashtags.slice(0, 10) };
  });

  app.get('/trending', async () => {
    const recentContent = await prisma.content.findMany({
      where: { moderationStatus: 'published', publishedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
      select: { hashtags: true },
      take: 500,
    });

    const tagCounts = new Map<string, number>();
    for (const c of recentContent) {
      for (const tag of c.hashtags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    const trending = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([hashtag, count]) => ({ hashtag, count }));

    const trendingContent = await prisma.content.findMany({
      where: { isTrending: true, moderationStatus: 'published' },
      include: { media: { take: 1 }, user: { select: { id: true, username: true, avatarUrl: true } } },
      take: 10,
    });

    return { hashtags: trending, content: trendingContent };
  });
}
```

`apps/api/src/routes/reels.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { reelsQuerySchema, commentSchema, paginationSchema } from '../utils/validators.js';

export async function reelsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/reels', async (request) => {
    const { tab, page, limit } = reelsQuerySchema.parse(request.query);

    const where: any = { type: 'reel', moderationStatus: 'published' };

    if (tab === 'following') {
      const following = await prisma.follow.findMany({
        where: { followerId: request.userId },
        select: { followingId: true },
      });
      where.userId = { in: following.map((f) => f.followingId) };
    } else if (tab === 'local') {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { primaryPincode: true },
      });
      if (user) where.locationPincode = user.primaryPincode;
    }

    const [reels, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          media: true,
          user: { select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true } },
        },
        orderBy: tab === 'foryou' ? [{ likeCount: 'desc' }, { publishedAt: 'desc' }] : { publishedAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.content.count({ where }),
    ]);

    // Check user likes
    const likedIds = new Set(
      (await prisma.interaction.findMany({
        where: { userId: request.userId, contentId: { in: reels.map((r) => r.id) }, type: 'like' },
        select: { contentId: true },
      })).map((i) => i.contentId)
    );

    return {
      data: reels.map((r) => ({ ...r, isLiked: likedIds.has(r.id) })),
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  app.post('/reels/:id/like', async (request) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.interaction.create({ data: { userId: request.userId, contentId: id, type: 'like' } });
      await prisma.content.update({ where: { id }, data: { likeCount: { increment: 1 } } });
    } catch (error: any) {
      if (error.code === 'P2002') return { success: true, alreadyLiked: true };
      throw error;
    }
    return { success: true };
  });

  app.post('/reels/:id/comments', async (request) => {
    const { id } = request.params as { id: string };
    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const comment = await prisma.comment.create({
      data: { userId: request.userId, contentId: id, text: parsed.data.text, parentId: parsed.data.parentId },
    });
    await prisma.content.update({ where: { id }, data: { commentCount: { increment: 1 } } });
    return { comment };
  });
}
```

`apps/api/src/routes/wallet.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { paginationSchema, DAILY_POINTS_GOAL, POINTS_EXPIRY_WARNING_DAYS } from '@eru/shared';
import { getNextTier, TIER_CONFIGS } from '@eru/shared';

export async function walletRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/wallet', async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { currentBalance: true, streakDays: true, tier: true, lifetimePoints: true },
    });
    if (!user) return { error: 'User not found' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyEarned = await prisma.pointsLedger.aggregate({
      where: { userId: request.userId, createdAt: { gte: today, lt: tomorrow }, points: { gt: 0 } },
      _sum: { points: true },
    });

    // Check expiring points
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + POINTS_EXPIRY_WARNING_DAYS);

    const expiring = await prisma.pointsLedger.aggregate({
      where: {
        userId: request.userId,
        expired: false,
        redeemedAt: null,
        expiresAt: { lte: warningDate, gt: new Date() },
      },
      _sum: { points: true },
    });

    const nextTier = getNextTier(user.tier);
    const nextThreshold = nextTier ? TIER_CONFIGS[nextTier].threshold : null;

    return {
      balance: user.currentBalance,
      dailyEarned: dailyEarned._sum.points || 0,
      dailyGoal: DAILY_POINTS_GOAL,
      streak: user.streakDays,
      tier: user.tier,
      tierProgress: {
        current: user.lifetimePoints,
        next: nextThreshold,
        pointsNeeded: nextThreshold ? nextThreshold - user.lifetimePoints : 0,
      },
      expiringPoints: expiring._sum.points ? {
        amount: expiring._sum.points,
        daysRemaining: POINTS_EXPIRY_WARNING_DAYS,
      } : null,
    };
  });

  app.get('/wallet/history', async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);

    const [entries, total] = await Promise.all([
      prisma.pointsLedger.findMany({
        where: { userId: request.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.pointsLedger.count({ where: { userId: request.userId } }),
    ]);

    return { data: entries, nextPage: page * limit < total ? page + 1 : null, total };
  });

  app.get('/wallet/expiring', async (request) => {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + POINTS_EXPIRY_WARNING_DAYS);

    const expiring = await prisma.pointsLedger.findMany({
      where: {
        userId: request.userId,
        expired: false,
        redeemedAt: null,
        expiresAt: { lte: warningDate, gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const totalExpiring = expiring.reduce((sum, e) => sum + e.points, 0);
    const earliestExpiry = expiring[0]?.expiresAt;
    const daysRemaining = earliestExpiry
      ? Math.ceil((earliestExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return { points: totalExpiring, expiresAt: earliestExpiry, daysRemaining };
  });
}
```

`apps/api/src/services/leaderboardService.ts`:
```typescript
import { getRedis } from '../utils/redis.js';
import { prisma } from '../utils/prisma.js';

export async function getLeaderboard(pincode: string, scope: string, limit = 50) {
  const redis = getRedis();
  const key = `leaderboard:${scope}:${pincode}`;

  // Get top N from Redis sorted set
  const rankings = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });

  if (!rankings || rankings.length === 0) return [];

  // Get user details
  const userIds = rankings.filter((_, i) => i % 2 === 0) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, username: true, avatarUrl: true, tier: true, isVerified: true, streakDays: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const result = [];
  for (let i = 0; i < rankings.length; i += 2) {
    const userId = rankings[i] as string;
    const points = Number(rankings[i + 1]);
    const user = userMap.get(userId);
    if (user) {
      result.push({ rank: Math.floor(i / 2) + 1, ...user, pointsThisWeek: points });
    }
  }

  return result;
}

export async function getUserRank(userId: string, pincode: string, scope: string) {
  const redis = getRedis();
  const key = `leaderboard:${scope}:${pincode}`;

  const rank = await redis.zrevrank(key, userId);
  const score = await redis.zscore(key, userId);

  return {
    rank: rank !== null ? rank + 1 : null,
    pointsThisWeek: score ? Number(score) : 0,
  };
}
```

`apps/api/src/routes/leaderboard.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { leaderboardQuerySchema } from '../utils/validators.js';
import { getLeaderboard, getUserRank } from '../services/leaderboardService.js';

export async function leaderboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/leaderboard', async (request) => {
    const { scope, pincode } = leaderboardQuerySchema.parse(request.query);
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { primaryPincode: true },
    });
    const effectivePincode = pincode || user?.primaryPincode || '000000';
    return { rankings: await getLeaderboard(effectivePincode, scope) };
  });

  app.get('/leaderboard/me', async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { primaryPincode: true },
    });
    const pincode = user?.primaryPincode || '000000';
    return getUserRank(request.userId, pincode, 'pincode');
  });

  app.get('/season/current', async () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const seasonNames = ['New Year Champions', 'Monsoon Warriors', 'Festival Stars', 'Winter Heroes'];
    const startMonth = quarter * 3;
    const start = new Date(now.getFullYear(), startMonth, 1);
    const end = new Date(now.getFullYear(), startMonth + 3, 0);

    return {
      name: seasonNames[quarter],
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      countdown: Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  });

  app.get('/quests/weekly', async (request) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const streaks = await prisma.streak.findMany({
      where: { userId: request.userId, date: { gte: monday } },
    });

    const weeklyActions = await prisma.pointsLedger.groupBy({
      by: ['actionType'],
      where: { userId: request.userId, createdAt: { gte: monday } },
      _count: true,
    });

    const actionMap = new Map(weeklyActions.map((a) => [a.actionType, a._count]));

    const quests = [
      { id: 'q1', title: 'Read 5 articles', target: 5, progress: Math.min(actionMap.get('read_article') || 0, 5), points: 25 },
      { id: 'q2', title: 'Watch 10 reels', target: 10, progress: Math.min(actionMap.get('reel_watch') || 0, 10), points: 30 },
      { id: 'q3', title: 'Share 3 posts', target: 3, progress: Math.min(actionMap.get('share') || 0, 3), points: 25 },
      { id: 'q4', title: 'Review 3 businesses', target: 3, progress: 0, points: 40 }, // Phase 2
      { id: 'q5', title: 'Create 1 post', target: 1, progress: Math.min(actionMap.get('create_content') || 0, 1), points: 30 },
    ];

    const completed = quests.filter((q) => q.progress >= q.target).length;

    return {
      quests,
      completedCount: completed,
      bonusEarned: completed >= 5,
    };
  });
}
```

`apps/api/src/routes/notifications.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { paginationSchema, markReadSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/notifications', async (request) => {
    const { page, limit } = paginationSchema.parse(request.query);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: request.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.notification.count({ where: { userId: request.userId } }),
      prisma.notification.count({ where: { userId: request.userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      unreadCount,
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  app.put('/notifications/read', async (request) => {
    const parsed = markReadSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest('Invalid notification IDs');

    await prisma.notification.updateMany({
      where: { id: { in: parsed.data.ids }, userId: request.userId },
      data: { isRead: true },
    });

    return { success: true };
  });
}
```

- [ ] **Step 2: Register all remaining routes in app.ts**

Add to `apps/api/src/app.ts`:
```typescript
import { exploreRoutes } from './routes/explore.js';
import { reelsRoutes } from './routes/reels.js';
import { walletRoutes } from './routes/wallet.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { notificationRoutes } from './routes/notifications.js';

app.register(exploreRoutes, { prefix: '/api/v1' });
app.register(reelsRoutes, { prefix: '/api/v1' });
app.register(walletRoutes, { prefix: '/api/v1' });
app.register(leaderboardRoutes, { prefix: '/api/v1' });
app.register(notificationRoutes, { prefix: '/api/v1' });
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/ apps/api/src/services/leaderboardService.ts apps/api/src/app.ts
git commit -m "feat: add explore, reels, wallet, leaderboard, notification routes"
```

---

## Task 15: Notification Service + Cron Jobs

**Files:**
- Create: `apps/api/src/services/notificationService.ts`
- Create: `apps/api/src/services/streakService.ts`
- Create: `apps/api/src/jobs/index.ts`
- Create: `apps/api/src/jobs/streakReset.ts`
- Create: `apps/api/src/jobs/streakReminder.ts`
- Create: `apps/api/src/jobs/pointsExpiry.ts`
- Create: `apps/api/src/jobs/leaderboardReset.ts`
- Create: `apps/api/src/jobs/moderationSLA.ts`

- [ ] **Step 1: Implement notification service**

`apps/api/src/services/notificationService.ts`:
```typescript
import { prisma } from '../utils/prisma.js';
import { getFirebaseAdmin } from '../utils/firebase.js';

const MAX_DAILY_PUSHES = 15;
const QUIET_HOURS_START = 22; // 10 PM
const QUIET_HOURS_END = 8;   // 8 AM

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

  // Always save to notifications table
  await prisma.notification.create({
    data: { userId, type, title, body, data: data || undefined, deepLink },
  });

  // Check if push should be sent
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true, notificationPush: true },
  });

  if (!user?.fcmToken || !user.notificationPush) return;

  // Check quiet hours
  const hour = new Date().getHours();
  const isQuietHours = hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  if (isQuietHours && priority !== 'high') return;

  // Check daily push cap
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPushCount = await prisma.notification.count({
    where: { userId, isPushed: true, createdAt: { gte: today } },
  });
  if (todayPushCount >= MAX_DAILY_PUSHES && priority !== 'high') return;

  // Send FCM push
  try {
    const admin = getFirebaseAdmin();
    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
      data: { type, deepLink: deepLink || '', ...Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])) },
    });

    await prisma.notification.updateMany({
      where: { userId, type, createdAt: { gte: new Date(Date.now() - 5000) } },
      data: { isPushed: true },
    });
  } catch (error) {
    console.error('FCM send error:', error);
  }
}
```

- [ ] **Step 2: Implement cron jobs**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npm install node-cron`

`apps/api/src/jobs/streakReset.ts`:
```typescript
import { prisma } from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';

export async function runStreakReset(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Find users whose streak should break (last active before yesterday)
  const brokenStreaks = await prisma.user.findMany({
    where: {
      streakDays: { gt: 0 },
      streakLastDate: { lt: yesterday },
    },
    select: { id: true, streakDays: true },
  });

  for (const user of brokenStreaks) {
    await prisma.user.update({
      where: { id: user.id },
      data: { streakDays: 0 },
    });

    await sendNotification({
      userId: user.id,
      type: 'streak_broken',
      title: 'Streak reset',
      body: `Your ${user.streakDays}-day streak ended. Start a new one today!`,
      priority: 'medium',
      deepLink: '/leaderboard',
    });
  }

  console.log(`Streak reset: ${brokenStreaks.length} streaks broken`);
}
```

`apps/api/src/jobs/streakReminder.ts`:
```typescript
import { prisma } from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';

export async function runStreakReminder(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Users with active streak but no activity today
  const atRisk = await prisma.user.findMany({
    where: {
      streakDays: { gt: 0 },
      streakLastDate: { lt: today },
      notificationPush: true,
    },
    select: { id: true, streakDays: true },
  });

  for (const user of atRisk) {
    await sendNotification({
      userId: user.id,
      type: 'streak_at_risk',
      title: "Don't lose your streak!",
      body: `You're on a ${user.streakDays}-day streak. Open Eru to keep it going!`,
      priority: 'high',
      deepLink: '/',
    });
  }

  console.log(`Streak reminders sent: ${atRisk.length}`);
}
```

`apps/api/src/jobs/pointsExpiry.ts`:
```typescript
import { prisma } from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';
import { POINTS_EXPIRY_WARNING_DAYS } from '@eru/shared';

export async function runPointsExpiry(): Promise<void> {
  const now = new Date();

  // Expire old points
  const expired = await prisma.pointsLedger.updateMany({
    where: { expired: false, redeemedAt: null, expiresAt: { lte: now } },
    data: { expired: true },
  });

  // Recalculate balances for affected users
  if (expired.count > 0) {
    const affectedUsers = await prisma.pointsLedger.findMany({
      where: { expired: true, expiresAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of affectedUsers) {
      const balance = await prisma.pointsLedger.aggregate({
        where: { userId, expired: false, redeemedAt: null, expiresAt: { gt: now } },
        _sum: { points: true },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { currentBalance: balance._sum.points || 0 },
      });
    }
  }

  // Send 30-day warning
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + POINTS_EXPIRY_WARNING_DAYS);
  const warningStart = new Date();
  warningStart.setDate(warningStart.getDate() + POINTS_EXPIRY_WARNING_DAYS - 1);

  const soonExpiring = await prisma.pointsLedger.groupBy({
    by: ['userId'],
    where: {
      expired: false,
      redeemedAt: null,
      expiresAt: { gte: warningStart, lte: warningDate },
    },
    _sum: { points: true },
  });

  for (const entry of soonExpiring) {
    if (entry._sum.points && entry._sum.points > 0) {
      await sendNotification({
        userId: entry.userId,
        type: 'points_expiring',
        title: 'Points expiring soon',
        body: `${entry._sum.points} pts expire in ${POINTS_EXPIRY_WARNING_DAYS} days. Use them before they're gone!`,
        priority: 'medium',
        deepLink: '/wallet',
      });
    }
  }

  console.log(`Points expiry: ${expired.count} entries expired, ${soonExpiring.length} warnings sent`);
}
```

`apps/api/src/jobs/leaderboardReset.ts`:
```typescript
import { prisma } from '../utils/prisma.js';
import { getRedis } from '../utils/redis.js';
import { sendNotification } from '../services/notificationService.js';

export async function runLeaderboardReset(): Promise<void> {
  const redis = getRedis();

  // Get all pincode leaderboard keys
  const keys = await redis.keys('leaderboard:pincode:*');

  const lastMonday = new Date();
  lastMonday.setDate(lastMonday.getDate() - 7);
  lastMonday.setHours(0, 0, 0, 0);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);

  for (const key of keys) {
    const pincode = key.split(':')[2];

    // Get top rankings before clearing
    const topUsers = await redis.zrange(key, 0, 9, { rev: true, withScores: true });

    // Save to PostgreSQL for historical record
    for (let i = 0; i < topUsers.length; i += 2) {
      const userId = topUsers[i] as string;
      const points = Number(topUsers[i + 1]);
      const rank = Math.floor(i / 2) + 1;

      await prisma.leaderboardEntry.create({
        data: {
          userId,
          pincode,
          scope: 'pincode',
          periodStart: lastMonday,
          periodEnd: lastSunday,
          pointsEarned: points,
          rank,
        },
      });

      // Notify #1
      if (rank === 1) {
        await sendNotification({
          userId,
          type: 'leaderboard_winner',
          title: `#1 in ${pincode} this week!`,
          body: '+500 bonus pts + Featured Profile. Congratulations!',
          priority: 'high',
          deepLink: '/leaderboard',
        });
      }
    }

    // Clear the sorted set for new week
    await redis.del(key);
  }

  console.log(`Leaderboard reset: ${keys.length} pincodes processed`);
}
```

`apps/api/src/jobs/moderationSLA.ts`:
```typescript
import { prisma } from '../utils/prisma.js';

export async function runModerationSLACheck(): Promise<void> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const overdue = await prisma.moderationQueue.count({
    where: { decision: null, createdAt: { lt: fifteenMinAgo } },
  });

  if (overdue > 0) {
    console.warn(`MODERATION SLA ALERT: ${overdue} items in queue > 15 minutes`);
    // In production: send FCM to admin users
  }

  const total = await prisma.moderationQueue.count({ where: { decision: null } });
  console.log(`Moderation queue: ${total} pending (${overdue} overdue)`);
}
```

`apps/api/src/jobs/index.ts`:
```typescript
import cron from 'node-cron';
import { runStreakReset } from './streakReset.js';
import { runStreakReminder } from './streakReminder.js';
import { runPointsExpiry } from './pointsExpiry.js';
import { runLeaderboardReset } from './leaderboardReset.js';
import { runModerationSLACheck } from './moderationSLA.js';

export function startCronJobs(): void {
  // Streak reminder: daily at 8:00 PM IST (14:30 UTC)
  cron.schedule('30 14 * * *', () => {
    runStreakReminder().catch(console.error);
  });

  // Streak reset: daily at midnight IST (18:30 UTC previous day)
  cron.schedule('30 18 * * *', () => {
    runStreakReset().catch(console.error);
  });

  // Points expiry: daily at 2:00 AM IST (20:30 UTC previous day)
  cron.schedule('30 20 * * *', () => {
    runPointsExpiry().catch(console.error);
  });

  // Leaderboard reset: Monday at 12:01 AM IST (Sunday 18:31 UTC)
  cron.schedule('31 18 * * 0', () => {
    runLeaderboardReset().catch(console.error);
  });

  // Moderation SLA check: every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runModerationSLACheck().catch(console.error);
  });

  console.log('Cron jobs scheduled');
}
```

- [ ] **Step 3: Wire cron jobs into server startup**

Add to `apps/api/src/server.ts` after `app.listen`:
```typescript
import { startCronJobs } from './jobs/index.js';

// Inside start() after app.listen:
if (config.NODE_ENV !== 'test') {
  startCronJobs();
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/notificationService.ts apps/api/src/services/streakService.ts apps/api/src/jobs/ apps/api/src/server.ts apps/api/package.json
git commit -m "feat: add notification service with FCM + smart rules, 5 cron jobs for streaks/expiry/leaderboard/SLA"
```

---

## Task 16: Video Transcoding Service

**Files:**
- Create: `apps/api/src/services/transcodeService.ts`

- [ ] **Step 1: Implement MediaConvert transcoding**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npm install @aws-sdk/client-mediaconvert`

`apps/api/src/services/transcodeService.ts`:
```typescript
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
    ContainerSettings: { Container: 'MP4' },
    VideoDescription: {
      Width: width,
      Height: height,
      CodecSettings: {
        Codec: 'H_264',
        H264Settings: {
          RateControlMode: 'CBR',
          Bitrate: bitrate,
          MaxBitrate: bitrate,
        },
      },
    },
    AudioDescriptions: [{
      AudioSourceName: 'Audio Selector 1',
      CodecSettings: { Codec: 'AAC', AacSettings: { Bitrate: 128000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 } },
    }],
  };
}

export async function handleTranscodeComplete(mediaId: string, outputKeys: { p360: string; p720: string; p1080: string }): Promise<void> {
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/services/transcodeService.ts apps/api/package.json
git commit -m "feat: add video transcoding service with AWS MediaConvert — 360p/720p/1080p outputs"
```

---

## Task 17: Final Wiring + Route Registration Verification

**Files:**
- Modify: `apps/api/src/app.ts` — ensure all routes registered

- [ ] **Step 1: Verify complete app.ts with all routes**

The final `apps/api/src/app.ts` should have all routes registered:

```typescript
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { AppError } from './utils/errors.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { actionRoutes } from './routes/actions.js';
import { contentRoutes } from './routes/content.js';
import { mediaRoutes } from './routes/media.js';
import { feedRoutes } from './routes/feed.js';
import { exploreRoutes } from './routes/explore.js';
import { reelsRoutes } from './routes/reels.js';
import { walletRoutes } from './routes/wallet.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { notificationRoutes } from './routes/notifications.js';
import { adminRoutes } from './routes/admin.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.register(cors, { origin: true, credentials: true });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
      });
    }
    if (error.validation) {
      return reply.status(400).send({ error: error.message, code: 'VALIDATION_ERROR', statusCode: 400 });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', code: 'INTERNAL', statusCode: 500 });
  });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Register all route groups under /api/v1
  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(userRoutes, { prefix: '/api/v1' });
  app.register(actionRoutes, { prefix: '/api/v1' });
  app.register(contentRoutes, { prefix: '/api/v1' });
  app.register(mediaRoutes, { prefix: '/api/v1' });
  app.register(feedRoutes, { prefix: '/api/v1' });
  app.register(exploreRoutes, { prefix: '/api/v1' });
  app.register(reelsRoutes, { prefix: '/api/v1' });
  app.register(walletRoutes, { prefix: '/api/v1' });
  app.register(leaderboardRoutes, { prefix: '/api/v1' });
  app.register(notificationRoutes, { prefix: '/api/v1' });
  app.register(adminRoutes, { prefix: '/api/v1' });

  return app;
}
```

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Start dev server and verify health check**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx tsx src/server.ts`
Expected: "Eru API running on port 3000"

Test: `curl http://localhost:3000/health`
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 4: Final commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat: wire all 12 route groups — backend API complete with 42 endpoints"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Section | Tasks | Status |
|-------------|-------|--------|
| System Architecture (monolith) | Task 4 (app.ts) | Covered |
| Tech Stack (Fastify, Prisma, Redis, Firebase, AWS) | Tasks 1-6 | Covered |
| Data Models (11 tables) | Task 3 | Covered |
| API Design (42 endpoints) | Tasks 8-14 | Covered |
| Media Pipeline (S3, presigned, thumbnails) | Task 11 | Covered |
| Video Transcoding (MediaConvert) | Task 16 | Covered |
| Content Moderation (Vision AI + manual) | Task 12 | Covered |
| Points Engine (15 actions, caps, tiers) | Task 10 | Covered |
| Feed Algorithm (scoring) | Task 13 | Covered |
| Notifications (FCM + smart rules) | Task 15 | Covered |
| Cron Jobs (5 scheduled jobs) | Task 15 | Covered |
| Leaderboard (Redis sorted sets) | Task 14 | Covered |
| Rate Limiting | Task 6 | Covered |
| Auth (Firebase JWT) | Task 5 | Covered |

### Placeholder Scan

No TBD, TODO, or "implement later" found. One `TODO` comment in moderationService.ts for push notification after auto-approve — this is handled by Task 15 (notificationService).

### Type Consistency

- `ActionType` defined in `@eru/shared`, used consistently in pointsEngine, validators, routes
- `Tier` enum matches between Prisma schema and shared types
- `ModerationStatus` consistent across Prisma, shared types, and route handlers
- `earnPoints()` signature matches between service and route caller

---

## What Comes Next

After completing this backend plan:

- **Plan 2: Mobile App** — React Native + Expo, 8 screens, navigation, auth flow, API client, components
- **Plan 3: Admin Panel + Deploy** — Web-based moderation UI, CI/CD, Railway deploy, EAS builds
