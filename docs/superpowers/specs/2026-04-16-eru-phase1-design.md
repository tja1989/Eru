# Eru Phase 1 — Design Specification

**Content + Feed MVP for Kerala Pilot**

| Field | Value |
|-------|-------|
| Date | 2026-04-16 |
| Status | Approved |
| Author | TJ + Claude Code |
| Scope | Phase 1: Content + Feed (8 screens, 15 earning actions) |
| Target | 500 beta users in 3 pincodes, Ernakulam, Kerala |

---

## Table of Contents

1. [Decisions Summary](#1-decisions-summary)
2. [Phasing Strategy](#2-phasing-strategy)
3. [System Architecture](#3-system-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Data Models](#5-data-models)
6. [API Design](#6-api-design)
7. [Media Pipeline & Video Streaming](#7-media-pipeline--video-streaming)
8. [Content Moderation Pipeline](#8-content-moderation-pipeline)
9. [Notifications & Realtime](#9-notifications--realtime)
10. [Project Structure](#10-project-structure)
11. [Deployment](#11-deployment)
12. [Cost Estimation](#12-cost-estimation)
13. [Phase 2 & 3 Sketch](#13-phase-2--3-sketch)
14. [Risks & Mitigations](#14-risks--mitigations)

---

## 1. Decisions Summary

All decisions made during brainstorming, locked in with user approval:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MVP priority | Content + Feed first | The feed is the gravity that holds everything else together. Without daily engagement, no business will advertise. |
| Build order | Phase 1 (Feed) → Phase 2 (Ads+Rewards) → Phase 3 (Creator×Biz) | Each phase adds value on top of the previous. Revenue comes in Phase 2. |
| Scale approach | Hybrid — simple monolith app, scalable managed data layer | Instagram launched as a monolith. Product must survive real users before scale matters. But media (S3+CDN) must be cloud-native from Day 1. |
| Platform | React Native + Expo (native mobile app) | APK can be shared directly for beta testing. Full native capabilities for camera, video, push. Future App Store/Play Store ready. |
| Video scope | Reels (60s) + longer video (up to 5 min) | Need to test whether Kerala audience prefers short or long format. Requires adaptive bitrate streaming. |
| Auth | Firebase Auth: Phone OTP + Google Sign-In | Industry standard for India. Firebase free tier covers pilot. Both methods familiar to Indian users. |
| Phase 1 screens | 8 screens (6 full + 2 lite) | Home Feed, Create Post, My Content, Profile, Explore, Reels (full). Wallet and Leaderboard (lite — no redemption or full gamification yet). |
| Earning actions | 15 of 25 active at launch | Content (5) + Engagement (5) + Growth (5). Commerce (5) and Surveys (5) activate in Phase 2 with businesses. |
| Content moderation | AI auto-approve + human review from Day 1 | Google Cloud Vision + spam classifier. >95% confidence auto-approves. Flagged content goes to manual queue. Pipeline battle-tested before scale. |
| Cold start strategy | Invite 20-30 local creators + team seed content | Local Ernakulam food/travel/lifestyle creators fill the feed before consumers join. Authentic, local content from Day 1. |
| Architecture approach | Expo + Node.js/Fastify API + Managed Services | Full control over API and business logic. Every infrastructure piece (DB, cache, storage, auth, CDN) is managed. Industry-standard stack for future hires. |
| Team | Claude Code builds, TJ monitors and learns | Architecture must be simple, well-documented, and maintainable. Heavy reliance on managed services. Technical consultants available for critical decisions. |

---

## 2. Phasing Strategy

```
Phase 1: Content + Feed               Phase 2: Business Ads + Rewards      Phase 3: Creator×Business
(THIS SPEC)                            (future spec)                        (future spec)
─────────────────────                  ──────────────────────               ─────────────────────

8 screens                              +4 screens                           +1 screen
15 earning actions                     +10 earning actions (25 total)       Sponsored UGC marketplace
Feed, Reels, Create, Profile           Redeem Store, My Rewards             Creator×Biz screen
Explore, My Content, Settings          Full Wallet, Full Leaderboard        Tag → Boost → Earn flow
Lite Wallet, Lite Leaderboard          Spin Wheel, Full Quests              Influencer Discovery
Points earn (no spend yet)             Points spend (redemption)            Commission system
AI + Human moderation                  Business campaigns in feed           Business Dashboard (9 screens)
Pincode leaderboard                    QR redemption at stores
Creator cohort seeds feed              200+ redemption partners
500 beta users                         4.2L MAU target
```

### Phase 1 Screen List

| # | Screen | Type | Access |
|---|--------|------|--------|
| 1 | Home Feed | Full | Tab 1 |
| 2 | Create Post | Full | Tab 3 (center) |
| 3 | My Content (Moderation Tracker) | Full | Profile → stack |
| 4 | Profile | Full | Tab 5 |
| 5 | Explore | Full | Tab 2 |
| 6 | Reels | Full | Tab 4 |
| 7 | Wallet | Lite (earn history only, no redemption) | Home → points badge |
| 8 | Leaderboard | Lite (pincode ranking + streaks, no spin/full quests) | Profile → stack |
| — | Settings / Profile Details | Full | Profile → gear icon |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S PHONE (Expo)                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐ │
│  │ Feed │ │Create│ │Reels │ │Explor│ │Profil│ │Wallet│ │Leader │ │
│  │      │ │ Post │ │      │ │  e   │ │  e   │ │(lite)│ │(lite) │ │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └───┬───┘ │
│     └────────┴────────┴────────┴────────┴────────┴─────────┘     │
│                            HTTPS                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│              NODE.JS API (Fastify monolith on Railway)             │
│                                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │  Feed    │ │ Content  │ │  Points  │ │   Auth   │             │
│  │ Service  │ │ Moderate │ │  Engine  │ │Middleware │             │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘             │
│       │            │            │             │                    │
│  ┌────┴────┐ ┌─────┴────┐ ┌────┴─────┐ ┌────┴─────┐             │
│  │Leaderbd │ │  Media   │ │  User    │ │ Notific- │             │
│  │ Service │ │ Service  │ │ Service  │ │  ations  │             │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘             │
└───────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
   ┌─────────┐ ┌───────┐ ┌───────┐ ┌─────────┐ ┌──────────┐
   │Supabase │ │Upstash│ │AWS S3 │ │Firebase │ │  Google  │
   │PostgreSQL│ │ Redis │ │  +CDN │ │Auth+FCM │ │Cloud     │
   │         │ │       │ │       │ │         │ │Vision    │
   └─────────┘ └───────┘ └───────┘ └─────────┘ └──────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │AWS MediaConvert│
                     └────────────────┘
```

### Component Responsibilities

| Component | Role | Failure Impact |
|-----------|------|---------------|
| Expo App | Mobile UI — shows feed, lets users create, displays points | Users can't use Eru |
| Fastify API (Railway) | All business logic — receives requests, processes, responds | Nothing works — all features down |
| Supabase PostgreSQL | Permanent data — users, content, points ledger, everything | All data lost — catastrophic |
| Upstash Redis | Fast cache — points balance, leaderboard, sessions, rate limits | App feels slow, leaderboard breaks |
| AWS S3 + CloudFront | Media storage + CDN delivery | No images or videos load |
| Firebase Auth | Login — phone OTP + Google Sign-In, JWT tokens | Nobody can log in |
| Firebase FCM | Push notifications | Users miss updates |
| Google Cloud Vision | Content moderation AI — NSFW, violence, spam detection | Inappropriate content could go live |
| AWS MediaConvert | Video transcoding — creates 360p/720p/1080p versions | Videos buffer on slow connections |

---

## 4. Tech Stack

| Layer | Technology | Why this choice |
|-------|-----------|----------------|
| **Mobile App** | React Native + Expo (Expo Router) | Cross-platform from one codebase. Expo speeds development. File-based routing. OTA updates. |
| **State Management** | Zustand | Simpler than Redux. ~10 lines per store. Sufficient for points/auth/feed state. |
| **Navigation** | Expo Router (file-based) | File = screen. No separate navigation config. Matches Next.js patterns. |
| **Backend API** | Node.js + Fastify | 2-3x faster than Express. Built-in schema validation. Strong TypeScript support. |
| **Database** | Supabase PostgreSQL (managed) | Relational DB perfect for points ledger, leaderboards, complex queries. Free tier for pilot. |
| **Cache** | Upstash Redis (managed, serverless) | Points balance cache, leaderboard sorted sets, rate limiting, sessions. Pay-per-request pricing. |
| **Object Storage** | AWS S3 | User uploads — photos, videos, avatars. Industry standard, cheap at scale. |
| **CDN** | AWS CloudFront | Delivers media fast via edge locations in India. 1TB free first year. |
| **Video Transcoding** | AWS MediaConvert | Converts uploads to 360p/720p/1080p. Pay per minute. No servers to manage. |
| **Auth** | Firebase Auth | Phone OTP + Google Sign-In. Free tier: 10K verifications/month. Best React Native integration. |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Free, unlimited. Works on Android + iOS. Reliable delivery in India. |
| **Content Moderation** | Google Cloud Vision + custom spam classifier | NSFW/violence/spam detection. 1K free API calls/month. Custom classifier runs on API server. |
| **Analytics** | Mixpanel or Amplitude | Event tracking for all 15 earning actions. Free tier covers pilot. |
| **Monorepo** | Turborepo | Manages mobile + API in one repo. Shared types and constants. Parallel builds. |
| **Deployment (API)** | Railway | Auto-deploy on git push. $5/month. HTTPS included. Auto-scaling. |
| **Deployment (Mobile)** | Expo EAS Build | Cloud builds APK/IPA. 30 free builds/month. OTA updates for JS changes. |
| **Input Validation** | Zod | Runtime type checking for API inputs. Shared between client and server. |

---

## 5. Data Models

### 11 Tables for Phase 1

#### 5.1 `users`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Unique user ID |
| firebase_uid | varchar | No | Firebase Auth UID — links to Firebase |
| phone | varchar | No | Phone number with country code |
| email | varchar | Yes | Optional, for Google sign-in users |
| name | varchar | No | Display name |
| username | varchar (unique) | No | @handle for tagging and search |
| avatar_url | varchar | Yes | S3 URL to profile photo |
| bio | text | Yes | Short self-description |
| gender | enum(male, female, other) | Yes | For Phase 2 audience insights |
| dob | date | Yes | Date of birth |
| primary_pincode | varchar(6) | No | Main postal code — core of Eru |
| secondary_pincodes | varchar[] | No (default []) | Up to 5 additional pincodes |
| interests | varchar[] | No (default []) | Content interests (food, travel, tech, etc.) |
| content_languages | varchar[] | No (default ['en']) | Languages for content |
| app_language | varchar | No (default 'en') | UI language |
| tier | enum(explorer, engager, influencer, champion) | No (default explorer) | Current tier |
| lifetime_points | integer | No (default 0) | Total ever earned (only increases) — determines tier |
| current_balance | integer | No (default 0) | Spendable points now (cached, derived from ledger) |
| streak_days | integer | No (default 0) | Consecutive active days |
| streak_last_date | date | Yes | Last day streak was counted |
| is_verified | boolean | No (default false) | Verified badge |
| notification_push | boolean | No (default true) | Push notification preference |
| notification_email | boolean | No (default false) | Email digest preference |
| is_private | boolean | No (default false) | Private account toggle |
| share_data_with_brands | boolean | No (default false) | DPDPA consent for anonymous data sharing |
| fcm_token | varchar | Yes | Firebase Cloud Messaging device token |
| role | enum(user, admin) | No (default user) | For moderation panel access |
| created_at | timestamptz | No | Registration time |
| last_active | timestamptz | No | Last app open |

**Indexes:** `firebase_uid` (unique), `username` (unique), `primary_pincode`, `phone` (unique).

#### 5.2 `content`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Unique content ID |
| user_id | UUID (FK → users) | No | Creator |
| type | enum(post, reel, poll, thread) | No | Content type |
| text | text | Yes | Caption or body |
| hashtags | varchar[] | No (default []) | Tags |
| location_pincode | varchar(6) | Yes | Content location |
| moderation_status | enum(pending, published, declined) | No (default pending) | Visibility control |
| decline_reason | varchar | Yes | MOD-01 through MOD-07 |
| is_trending | boolean | No (default false) | System-flagged trending |
| like_count | integer | No (default 0) | Denormalized for speed |
| comment_count | integer | No (default 0) | Denormalized |
| share_count | integer | No (default 0) | Denormalized |
| view_count | integer | No (default 0) | Total views |
| points_earned | integer | No (default 0) | Total pts earned from this content |
| published_at | timestamptz | Yes | When moderation approved |
| created_at | timestamptz | No | Submission time |

**Indexes:** `user_id`, `moderation_status`, `location_pincode`, `published_at DESC`, `is_trending`.

#### 5.3 `content_media`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Media item ID |
| content_id | UUID (FK → content) | No | Parent content |
| type | enum(image, video) | No | Media type |
| original_url | varchar | No | S3 link to original upload |
| thumbnail_url | varchar | Yes | Compressed preview |
| video_360p_url | varchar | Yes | Low-res stream |
| video_720p_url | varchar | Yes | Medium-res stream |
| video_1080p_url | varchar | Yes | High-res stream |
| duration_seconds | integer | Yes | Video length |
| width | integer | No | Pixel width |
| height | integer | No | Pixel height |
| sort_order | integer | No (default 1) | Position in carousel |
| transcode_status | enum(pending, processing, complete, failed) | No (default pending) | Video processing state |

#### 5.4 `points_ledger`

The most critical table — immutable transaction log.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Ledger entry ID |
| user_id | UUID (FK → users) | No | Whose points |
| action_type | varchar | No | One of 15 earning action types |
| content_id | UUID (FK → content) | Yes | Triggering content (null for check-in, referral) |
| points | integer | No | Amount (positive = earn, negative = spend) |
| multiplier_applied | decimal(3,2) | No | Tier multiplier at time of earning |
| expires_at | timestamptz | No | 6 months from earn date |
| redeemed_at | timestamptz | Yes | When spent (null if not redeemed) |
| expired | boolean | No (default false) | True if nightly cron expired these points |
| created_at | timestamptz | No | Event time |

**Balance calculation:** `SUM(points) WHERE user_id = X AND redeemed_at IS NULL AND expired = false AND expires_at > NOW()`

**Indexes:** `user_id`, `action_type`, `created_at`, `expires_at WHERE expired = false`.

#### 5.5 `follows`

| Column | Type | Description |
|--------|------|-------------|
| follower_id | UUID (FK → users) | Who is following |
| following_id | UUID (FK → users) | Who they follow |
| created_at | timestamptz | When |

**Primary key:** `(follower_id, following_id)`.

#### 5.6 `interactions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Interaction ID |
| user_id | UUID (FK → users) | Who |
| content_id | UUID (FK → content) | On what |
| type | enum(like, save, share) | Action type |
| created_at | timestamptz | When |

**Unique constraint:** `(user_id, content_id, type)`.

#### 5.7 `comments`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Comment ID |
| user_id | UUID (FK → users) | No | Author |
| content_id | UUID (FK → content) | No | On which content |
| text | text | No | Comment text |
| parent_id | UUID (FK → comments) | Yes | For threaded replies |
| like_count | integer | No (default 0) | Denormalized |
| created_at | timestamptz | No | When |

#### 5.8 `moderation_queue`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Queue entry ID |
| content_id | UUID (FK → content) | No | Content under review |
| auto_check_result | jsonb | Yes | AI confidence scores |
| auto_approved | boolean | No (default false) | AI auto-approved? |
| reviewer_id | varchar | Yes | Human moderator ID |
| decision | enum(approved, declined) | Yes | Final decision |
| decline_code | varchar | Yes | MOD-01 through MOD-07 |
| is_appeal | boolean | No (default false) | Appeal of previous decline |
| reviewed_at | timestamptz | Yes | Decision time |
| created_at | timestamptz | No | Queue entry time |

#### 5.9 `streaks`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Entry ID |
| user_id | UUID (FK → users) | Whose streak |
| date | date | Calendar date |
| points_earned | integer | Total points that day |
| actions_count | integer | Actions performed |

**Unique constraint:** `(user_id, date)` — one row per user per day.

#### 5.10 `leaderboard_entries`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Entry ID |
| user_id | UUID (FK → users) | No | Who |
| pincode | varchar(6) | No | Which leaderboard |
| scope | enum(pincode, state, national) | No | Scope level |
| period_start | date | No | Monday of week |
| period_end | date | No | Sunday of week |
| points_earned | integer | No | Points in this period |
| rank | integer | Yes | Filled at period end |

Live leaderboard runs on Redis sorted sets. This table is the historical archive.

#### 5.11 `notifications`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID (PK) | No | Notification ID |
| user_id | UUID (FK → users) | No | Recipient |
| type | varchar | No | Event type (content_approved, new_follower, etc.) |
| title | varchar | No | Display title |
| body | text | No | Display body |
| data | jsonb | Yes | Structured payload (contentId, points, etc.) |
| deep_link | varchar | Yes | Navigation target on tap |
| is_read | boolean | No (default false) | Seen by user |
| is_pushed | boolean | No (default false) | FCM push sent |
| created_at | timestamptz | No | When |

---

## 6. API Design

### Route Structure

```
/api/v1/
├── /auth            (3 endpoints)
├── /feed            (3 endpoints)
├── /content         (5 endpoints)
├── /media           (2 endpoints)
├── /users           (8 endpoints)
├── /actions         (1 endpoint — handles all 15 action types)
├── /wallet          (3 endpoints)
├── /explore         (3 endpoints)
├── /reels           (3 endpoints)
├── /leaderboard     (4 endpoints)
├── /notifications   (2 endpoints)
└── /admin           (5 endpoints)
Total: 42 endpoints
```

### Authentication

All endpoints (except `/auth/register`) require a Firebase JWT in the `Authorization: Bearer <token>` header. The auth middleware:
1. Extracts the JWT token
2. Verifies with Firebase Admin SDK
3. Looks up user in PostgreSQL by `firebase_uid`
4. Attaches user object to request context

### Rate Limiting

| Endpoint Group | Limit | Implementation |
|---------------|-------|---------------|
| General API | 100 req/min per user | Upstash Redis rate limiter |
| `/actions/earn` | 30 req/min per user | Stricter — fraud prevention |
| `/media/upload` | 10 req/min per user | Storage abuse prevention |
| `/auth/*` | 5 req/min per IP | Brute force prevention |

### Endpoint Catalog

#### Auth

| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/auth/register` | `{firebase_uid, phone, name}` | `{user, token}` | Creates user row |
| POST | `/auth/refresh` | `{refreshToken}` | `{accessToken}` | Refresh JWT |
| POST | `/auth/logout` | — | `{success}` | Invalidate session |

#### Feed

| Method | Endpoint | Params | Response | Notes |
|--------|----------|--------|----------|-------|
| GET | `/feed` | `?page=1&limit=20&pincode=682016` | `{posts[], nextPage}` | Paginated feed with algorithm scoring |
| GET | `/stories` | — | `{stories[]}` | Stories with seen/unseen state |
| GET | `/wallet/summary` | — | `{balance, streak, tier}` | For points badge in header |

#### Content

| Method | Endpoint | Body/Params | Response | Notes |
|--------|----------|-------------|----------|-------|
| POST | `/content/create` | `{type, text, mediaIds[], hashtags[], locationPincode, businessTag?}` | `{content, moderationStatus}` | Enters moderation queue |
| GET | `/content/{id}` | — | `{content, media[], comments[]}` | Full content detail |
| PUT | `/content/{id}` | `{text, hashtags[]}` | `{content}` | Edit (only pending/declined) |
| POST | `/content/{id}/resubmit` | `{mediaIds[]?}` | `{content}` | Re-enter moderation |
| POST | `/content/{id}/appeal` | `{reason}` | `{appeal}` | Appeal decline to senior reviewer |

#### Media

| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/media/upload` | Multipart file | `{mediaId, url, thumbnailUrl}` | For images |
| POST | `/media/presign` | `{type, size, contentType}` | `{uploadUrl, mediaId}` | For videos — presigned S3 URL |

#### Users

| Method | Endpoint | Body/Params | Response | Notes |
|--------|----------|-------------|----------|-------|
| GET | `/users/{id}/profile` | — | `{user, stats, badges}` | Public profile |
| POST | `/users/{id}/follow` | — | `{success}` | +2 pts for follower |
| DELETE | `/users/{id}/unfollow` | — | `{success}` | |
| GET | `/users/{id}/content` | `?tab=posts\|reels\|created\|saved&page=1` | `{content[], nextPage}` | Content grid |
| GET | `/users/{id}/followers` | `?page=1` | `{users[], nextPage}` | Follower list |
| GET | `/users/{id}/following` | `?page=1` | `{users[], nextPage}` | Following list |
| GET | `/users/me/settings` | — | `{settings}` | Full profile settings |
| PUT | `/users/me/settings` | `{name?, bio?, interests?[], ...}` | `{settings}` | Update settings |

#### Actions (Points Engine)

| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/actions/earn` | `{actionType, contentId?, metadata?}` | `{success, points, multiplier, newBalance, dailyProgress, streak}` | THE critical endpoint. Server validates, checks caps, applies multiplier, writes ledger, updates cache. |

##### Validation Rules Per Action Type

| actionType | Validation | Points | Daily Cap |
|------------|-----------|--------|-----------|
| read_article | Scroll depth >70% AND time >30s | 4 | 20 (80 pts) |
| watch_video | Watch time >60s (heartbeat) | 6 | 15 (90 pts) |
| reel_watch | Full reel completion | 3 | 30 (90 pts) |
| listen_podcast | Play time >2min | 5 | 10 (50 pts) |
| read_thread | Scroll to end | 3 | 10 (30 pts) |
| like | Content exists, not already liked | 1 | 50 (50 pts) |
| comment | Word count >=10, not duplicate | 3 | 20 (60 pts) |
| share | Share intent fired | 2 | 20 (40 pts) |
| save | Content exists, not already saved | 1 | 30 (30 pts) |
| follow | User exists, not already following | 2 | 10 (20 pts) |
| daily_checkin | First open today | 25 | 1 (25 pts) |
| create_content | Content passed moderation | 30 | 5 (150 pts) |
| content_trending | System-flagged (not user-triggered) | 200 | 1 (200 pts) |
| refer_friend | Referee active 7+ days | 100 | 3 (300 pts) |
| complete_profile | All fields filled | 50 | 1 (50 pts) |

#### Wallet

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/wallet` | — | `{balance, dailyEarned, dailyGoal, streak, tier, tierProgress, expiringPoints}` |
| GET | `/wallet/history` | `?page=1&limit=20` | `{events[], nextPage}` |
| GET | `/wallet/expiring` | — | `{points, expiresAt, daysRemaining}` |

#### Explore

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/explore` | `?category=food&page=1` | `{tiles[], nextPage}` |
| GET | `/search` | `?q=kochi` | `{users[], posts[], hashtags[]}` |
| GET | `/trending` | — | `{hashtags[], content[]}` |

#### Reels

| Method | Endpoint | Params/Body | Response |
|--------|----------|-------------|----------|
| GET | `/reels` | `?tab=foryou\|following\|local&page=1` | `{reels[], nextPage}` |
| POST | `/reels/{id}/like` | — | `{success}` |
| POST | `/reels/{id}/comments` | `{text}` | `{comment}` |

#### Leaderboard

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/leaderboard` | `?scope=pincode&pincode=682016` | `{rankings[]}` |
| GET | `/leaderboard/me` | — | `{rank, points, surroundingRanks[]}` |
| GET | `/season/current` | — | `{name, startDate, endDate, prizes[], countdown}` |
| GET | `/quests/weekly` | — | `{quests[], completedCount, bonusEarned}` |

#### Notifications

| Method | Endpoint | Params | Response |
|--------|----------|--------|----------|
| GET | `/notifications` | `?page=1&limit=20` | `{notifications[], unreadCount, nextPage}` |
| PUT | `/notifications/read` | `{ids[]}` | `{success}` |

#### Admin (Moderation)

| Method | Endpoint | Params/Body | Response |
|--------|----------|-------------|----------|
| GET | `/admin/moderation/queue` | `?status=pending\|appeal&page=1` | `{items[], count}` |
| GET | `/admin/moderation/{id}` | — | `{content, media, aiScores, userHistory}` |
| POST | `/admin/moderation/{id}/approve` | — | `{success}` → content published + 30 pts |
| POST | `/admin/moderation/{id}/decline` | `{code: "MOD-01"}` | `{success}` → user notified |
| GET | `/admin/moderation/stats` | — | `{reviewed, approved, declined, avgTime, slaPercent}` |

### Feed Algorithm

```
Feed Score = (0.3 × recency_score)
           + (0.25 × engagement_score)
           + (0.2 × interest_match_score)
           + (0.15 × pincode_proximity_score)
           + (0.1 × following_bonus)
```

- **recency_score:** Decays over time. 1.0 for content < 1 hour old, decreasing to 0.1 for content > 48 hours.
- **engagement_score:** Normalized (likes + comments×2 + shares×3) / max_engagement_in_batch.
- **interest_match_score:** Number of matching hashtags/categories between content and user interests.
- **pincode_proximity_score:** 1.0 for same pincode, 0.5 for secondary pincodes, 0.2 for same city.
- **following_bonus:** 1.0 if user follows the creator, 0.0 otherwise.

---

## 7. Media Pipeline & Video Streaming

### Image Processing

Upload flow: Phone compresses client-side (max 2048px, 80% quality) → POST `/media/upload` → Server generates 3 sizes → Stores on S3 → Returns CDN URLs.

| Size | Dimensions | Use Case | Typical File Size |
|------|-----------|----------|------------------|
| Thumbnail | 200×200 | Grids (Explore, Profile) | ~15KB |
| Feed | 1080×1080 | Main feed display | ~200KB |
| Original | As uploaded | Zoom, reprocessing | ~2MB |

Blur-up loading: App loads thumbnail first (instant), shows blurred, swaps to feed image when ready.

### Video Processing

Upload flow: Phone compresses → POST `/media/presign` gets presigned S3 URL → Phone uploads directly to S3 → S3 event triggers Lambda → Lambda calls MediaConvert → Three quality versions created → URLs written to `content_media` row.

| Quality | Resolution | Typical Size (60s reel) | Target Network |
|---------|-----------|------------------------|---------------|
| 360p | 640×360 | ~3MB | 3G / slow 4G |
| 720p | 1280×720 | ~10MB | 4G |
| 1080p | 1920×1080 | ~25MB | WiFi / fast 4G |

Adaptive quality: App checks connection speed at load time, selects appropriate quality URL.

### Reel Preloading Strategy

Always buffer 2 reels ahead of current. When user swipes:
- Next reel plays instantly (already buffered)
- Buffer shifts forward (start downloading reel N+2)
- Release reel N-1 from memory

API returns 5 reels per page. App buffers current + next 2.

### S3 Bucket Structure

```
eru-media-bucket/
├── users/{user_id}/
│   ├── avatar/
│   ├── originals/
│   ├── thumbnails/
│   ├── feed/
│   └── transcoded/
└── system/
    ├── default-avatars/
    └── seed-content/
```

### S3 Lifecycle Policies

- Originals → S3 Glacier after 90 days (cheap cold storage)
- Failed transcodes → delete after 7 days
- Deleted content media → delete after 30 days

---

## 8. Content Moderation Pipeline

### Flow

1. User submits content → `moderation_status = pending`, enters `moderation_queue`
2. AI checks run in parallel (~3-5 seconds):
   - Google Cloud Vision: NSFW, violence, racy, medical, spoof scores
   - Spam classifier: duplicate detection (perceptual hash), spam patterns, all caps
   - Text analysis: profanity list, hate speech keywords
   - Audio check (video only): copyright music detection (AudD/ACRCloud)
3. Combined confidence calculated: `confidence = 1 - max(all_risk_scores)`
4. If confidence > 0.95 → AUTO-APPROVE: publish content, credit +30 pts, notify user
5. If confidence ≤ 0.95 → ROUTE TO HUMAN: content stays pending, appears in admin queue
6. Human reviews in admin panel → Approve or Decline with reason code

### Auto-Approve Threshold: 95%

Expected at 500 users (~50 posts/day): ~80% auto-approved, ~10 posts/day need human review.

### Decline Codes

| Code | Reason | User Action |
|------|--------|-------------|
| MOD-01 | NSFW / explicit | Edit & Resubmit |
| MOD-02 | Copyright music | Replace audio + Resubmit |
| MOD-03 | Spam / duplicate | Appeal |
| MOD-04 | Hate speech | Appeal (senior reviewer) |
| MOD-05 | Misleading info | Edit & Resubmit |
| MOD-06 | Low quality | Edit & Resubmit |
| MOD-07 | Prohibited promotion | No resubmit allowed |

### Resubmit & Appeal

- **Resubmit** (MOD-01, 02, 05, 06): User edits, content re-enters moderation. Max 3 resubmits.
- **Appeal** (MOD-03, 04): Routed to senior reviewer queue. Decision within 24 hours. Final.

### Admin Moderation Panel

Web-based admin panel (not in mobile app). Shows queue with AI scores highlighted. Approve/decline with one click. SLA monitoring: queue depth, avg review time, % under 15 minutes.

### Moderation SLA Monitor

Cron job every 5 minutes checks for items in queue > 15 minutes. Sends FCM alert to admins if any found.

---

## 9. Notifications & Realtime

### Push Notification Types

| Event | Title | Priority | Trigger |
|-------|-------|----------|---------|
| Content approved | "Your reel is live!" | High | Moderation approves |
| Content declined | "Post needs changes" | High | Moderation declines |
| Content trending | "You're trending!" | High | System flags trending |
| New follower | "New follower" | Medium | Someone follows |
| Like milestone | "Your post is getting love" | Medium | Likes hit 10/50/100/500 |
| Comment | "@user commented" | Medium | New comment on your content |
| Streak at risk | "Don't lose your streak!" | High | 8PM with no activity today |
| Streak broken | "Streak reset" | Medium | Midnight, no activity |
| Quest progress | "Almost there!" | Medium | 4/5 quests completed |
| Leaderboard rank up | "You moved up!" | Medium | Enter top 10 |
| Tier upgrade | "Level up!" | High | Cross tier threshold |
| Points expiring | "Points expiring soon" | Medium | 30-day and 7-day warning |

### Smart Notification Rules

1. **Quiet Hours (10PM-8AM):** High priority sends immediately. Medium/Low queued until 8AM as batch.
2. **Deduplication:** Likes batched into "Person A, B, and 3 others liked your post" (5-min window). Followers batched if >3 in 1 hour.
3. **Frequency Cap:** Max 15 pushes/day. Only high priority exceeds cap.
4. **Engagement Throttle:** Users who open 5+/day get fewer pushes. Users inactive 3+ days get more.

### Realtime Updates (In-App)

Phase 1 uses polling (not WebSockets):

| Endpoint | Interval | Screen |
|----------|----------|--------|
| `/wallet/summary` | 10 seconds | Wallet screen |
| `/notifications/unread-count` | 30 seconds | All screens (bell badge) |
| `/leaderboard/me` | 30 seconds | Leaderboard screen |

At 500 users, polling generates ~1,000 req/min — trivial for Fastify. Upgrade to WebSockets when scaling past 100K users.

### Background Cron Jobs

| Schedule | Job | Action |
|----------|-----|--------|
| Daily 8:00 PM IST | Streak risk check | Push "Don't lose your streak!" to users with no activity today |
| Daily 12:00 AM IST | Streak reset | Reset `streak_days = 0` for users with `streak_last_date < yesterday` |
| Daily 2:00 AM IST | Points expiry | Expire points > 6 months old. Send 30-day and 7-day warnings. |
| Monday 12:01 AM IST | Leaderboard reset | Snapshot Redis rankings to PostgreSQL. Clear sorted sets. Distribute prizes. |
| Daily 6:00 AM IST | Quest progress nudge | Push to users at 4/5 quests completed |
| Every 5 minutes | Moderation SLA | Alert admins if queue items > 15 min old |

### FCM Implementation

- **Server:** `firebase-admin` SDK sends targeted pushes via stored `fcm_token` per user.
- **Client:** `expo-notifications` requests permission, gets FCM token, sends to API on launch.
- **Foreground:** Custom in-app toast UI (matches Eru design), not OS notification.
- **Background:** OS-level push notification.
- **Tap action:** Deep link to relevant screen via `deep_link` field.

---

## 10. Project Structure

### Monorepo Layout

```
eru/
├── apps/
│   ├── mobile/                    ← React Native + Expo
│   │   ├── app/                   ← Screens (Expo Router file-based)
│   │   │   ├── (tabs)/            ← Bottom tab navigator
│   │   │   │   ├── index.tsx      ← Home Feed
│   │   │   │   ├── explore.tsx    ← Explore
│   │   │   │   ├── create.tsx     ← Create Post
│   │   │   │   ├── reels.tsx      ← Reels
│   │   │   │   └── profile.tsx    ← Profile
│   │   │   ├── wallet/index.tsx
│   │   │   ├── leaderboard/index.tsx
│   │   │   ├── my-content/index.tsx
│   │   │   ├── settings/index.tsx
│   │   │   └── _layout.tsx        ← Root layout
│   │   ├── components/            ← PostCard, ReelPlayer, PointsToast, etc.
│   │   ├── hooks/                 ← useAuth, useFeed, usePoints, useNotifications
│   │   ├── services/              ← API client layer (feedService, contentService, etc.)
│   │   ├── stores/                ← Zustand stores (auth, points, feed)
│   │   └── constants/             ← theme, points config
│   │
│   └── api/                       ← Node.js + Fastify
│       └── src/
│           ├── server.ts          ← Fastify setup
│           ├── routes/            ← auth, feed, content, media, users, actions, wallet, explore, reels, leaderboard, notifications, admin
│           ├── services/          ← pointsEngine, feedAlgorithm, moderationService, mediaService, notificationService, leaderboardService, streakService
│           ├── middleware/        ← auth, rateLimit, admin
│           ├── jobs/              ← Cron: streakReset, pointsExpiry, leaderboardReset, streakReminder, moderationSLA
│           ├── db/                ← schema.sql, migrations/, queries/
│           ├── config/            ← Environment loading
│           └── utils/             ← errors, validators (Zod)
│
├── packages/
│   └── shared/                    ← Shared types + constants
│       ├── types/                 ← User, Content, Points, API types
│       └── constants/             ← Point values, tier thresholds
│
├── .github/workflows/deploy-api.yml
├── package.json                   ← Workspaces
└── turbo.json                     ← Turborepo config
```

### Core Files

| File | Criticality | Responsibility |
|------|-------------|---------------|
| `api/src/services/pointsEngine.ts` | HIGHEST | Validates earning, checks caps, applies multiplier, writes ledger, updates cache |
| `api/src/services/feedAlgorithm.ts` | HIGH | Decides what every user sees in their feed |
| `api/src/services/moderationService.ts` | HIGH | Orchestrates AI checks, auto-approve/human routing |
| `mobile/app/(tabs)/index.tsx` | HIGH | Home Feed — first thing users see |
| `mobile/components/ReelPlayer.tsx` | HIGH | Video player with preloading and adaptive quality |

---

## 11. Deployment

### API Server

- **Host:** Railway ($5/month starter)
- **Deploy:** Auto-deploy on `git push` to `main` branch via GitHub Actions
- **URL:** `https://api.eru.app` (custom domain) or Railway-provided URL
- **HTTPS:** Included by Railway
- **Auto-restart:** Railway restarts on crash

### Mobile App

- **Build:** Expo EAS Build (cloud, 30 free builds/month)
- **Distribution (beta):** APK shared via WhatsApp to Ernakulam testers
- **OTA updates:** `eas update --branch preview` for JS-only changes (no reinstall needed)
- **Future:** Google Play Store ($25 one-time) + Apple App Store ($99/year) when ready

### CI/CD Pipeline

```
git push to main
  → GitHub Actions runs
    → Lint + type check
    → Run tests
    → Deploy API to Railway
    → (Mobile: manual trigger for APK builds)
```

### Environment Variables

Stored in Railway dashboard (never in code):
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `REDIS_URL` — Upstash Redis connection string
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DOMAIN`, `MEDIACONVERT_ENDPOINT`
- `GOOGLE_CLOUD_VISION_KEY`
- `NODE_ENV`, `API_URL`, `JWT_SECRET`

---

## 12. Cost Estimation

### Phase 1 Monthly Costs (500 users)

| Service | Purpose | Monthly Cost |
|---------|---------|-------------|
| Railway | API hosting | $5 |
| Supabase PostgreSQL | Database | $0 (free tier) |
| Upstash Redis | Cache + leaderboard | $0 (free tier) |
| Firebase Auth | Login (OTP + Google) | $0 (free tier) |
| Firebase FCM | Push notifications | $0 (free, unlimited) |
| AWS S3 | Media storage (~50GB) | $1 |
| AWS CloudFront | CDN delivery | $0 (1TB free first year) |
| AWS MediaConvert | Video transcoding | $6 |
| Google Cloud Vision | Image moderation | $2 |
| Expo EAS | APK builds | $0 (free tier) |
| GitHub | Repository | $0 |
| Domain | eru.app or similar | $1 |
| **Total** | | **~$15/month (~₹1,250)** |

### Cost at Scale Triggers

| Users | Likely upgrade needed | Added cost |
|-------|----------------------|-----------|
| 5,000+ | Supabase Pro ($25/mo), Railway Pro ($20/mo) | +$45/mo |
| 20,000+ | Upstash paid tier, increased CDN | +$50-100/mo |
| 100,000+ | Dedicated database, multiple API instances | +$200-500/mo |

---

## 13. Phase 2 & 3 Sketch

High-level architecture notes to ensure Phase 1 doesn't block future phases.

### Phase 2: Business Ads + Rewards

**New infrastructure needed:**
- Razorpay integration (business payments)
- Campaign serving engine (inject sponsored posts into feed)
- QR code generation (for reward redemption)
- Gift card / recharge partner APIs

**Database additions:**
- `businesses`, `campaigns`, `campaign_daily_stats`, `offers`, `rewards`, `business_reviews`
- `watchlist`, `poll_options`, `poll_votes`, `survey_responses`

**Architecture impact on Phase 1:**
- Feed algorithm needs a "sponsored post injection" slot (every 4-5 posts). Phase 1 feed code should include a `injectSponsoredContent()` function that returns null in Phase 1 and is wired up to the campaign engine in Phase 2.
- Points ledger already supports negative points (spending). No schema change needed.
- Users table already has `share_data_with_brands` consent flag.

### Phase 3: Creator×Business Marketplace

**New infrastructure needed:**
- Commission escrow system
- Creator payment processing (UPI/bank via Razorpay)
- Proposal/negotiation workflow

**Database additions:**
- `ugc_tags`, `sponsored_ugc`, `creator_connections`

**Architecture impact on Phase 1:**
- Content creation already supports `businessTag` field (nullable in Phase 1, functional in Phase 3).
- Notification system already supports extensible event types.

---

## 14. Risks & Mitigations

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|-----------|
| Empty feed on Day 1 | HIGH | Users open app, see nothing, never return | 20-30 creator cohort + team seed content pre-loaded before consumer launch |
| Video buffering on slow networks | HIGH | Core promise ("seamless video") broken | Adaptive quality (360p/720p/1080p). Preload next 2 reels. Start with 360p on slow connections. |
| Points gaming / fraud | HIGH | Economy collapses, honest users feel cheated | All validation server-side. Daily caps on every action. Rate limiting. Quality thresholds (10+ word comments). |
| MediaConvert transcode fails | MEDIUM | Videos stuck on "processing" | 3 retry attempts. Cron checks for stuck jobs >15 min. User notified to re-upload on permanent failure. |
| Cloud Vision false positives | MEDIUM | Good content delayed, creators frustrated | Human review catches false flags quickly. Track false-positive rate. Adjust threshold if >10%. |
| Firebase Auth OTP delays in India | MEDIUM | Users can't log in, abandon onboarding | Google Sign-In as alternative (instant). Firebase SMS has India-specific routing for reliability. |
| Supabase free tier limits | LOW | Database queries fail | Monitor usage. Upgrade to Pro ($25/mo) well before limits approached. |
| Railway server crashes | LOW | API down temporarily | Health check endpoint. Auto-restart on crash. Consider Railway Pro ($20/mo) for production SLA. |
| Single moderator bottleneck | MEDIUM | Queue grows during off-hours | Auto-approve at 95% handles majority. SLA alerts catch buildup. Phase 2: hire part-time moderators. |
| User disables notifications | MEDIUM | Streaks break, engagement drops | In-app notification history + bell badge. Periodic "Enable notifications" prompt. Strong in-app gamification reduces dependence on push. |

---

*This spec is the single source of truth for Eru Phase 1. Build against the existing HTML prototypes for visual fidelity. Build against this spec for architecture, data, APIs, and logic. When in doubt, the spec wins over the prototypes.*
