# Eru — Environment Setup Guide

This guide walks you through setting up every external service Eru depends on, from a fresh machine to a running app.

---

## 1. Prerequisites

Make sure you have all of these installed before starting:

| Tool | Version | How to check |
|------|---------|--------------|
| Node.js | 22 or higher | `node --version` |
| npm | 10 or higher | `npm --version` |
| Git | any recent | `git --version` |
| Android phone | Android 8+ | — |
| Expo Go app | latest | Install from Play Store |

Install Node 22 via [nvm](https://github.com/nvm-sh/nvm):
```bash
nvm install 22 && nvm use 22
```

---

## 2. Clone and Install

```bash
git clone https://github.com/YOUR_ORG/eru.git
cd eru
npm install
```

This installs packages for the entire monorepo (API + mobile + shared) in one command because npm workspaces links them together automatically.

---

## 3. Supabase Setup (PostgreSQL Database)

Supabase gives us a hosted PostgreSQL database with a simple web dashboard.

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New Project**.
3. Set:
   - **Name:** `eru`
   - **Database Password:** generate a strong one and save it
   - **Region:** `ap-south-1` (Mumbai — closest to Kerala users)
4. Wait ~2 minutes for the project to spin up.
5. Go to **Settings → Database → Connection string → URI** tab.
6. Copy the connection string. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
7. Add this to your `.env` file as `DATABASE_URL` (see Step 8).

---

## 4. Upstash Setup (Redis Cache)

Upstash gives us a serverless Redis instance for rate limiting and caching.

1. Go to [upstash.com](https://upstash.com) and sign up (free tier available).
2. Click **Create Database**.
3. Set:
   - **Name:** `eru-cache`
   - **Type:** Regional
   - **Region:** `ap-south-1` (Mumbai)
4. After creation, open the database and go to the **REST API** tab.
5. Copy:
   - **UPSTASH_REDIS_REST_URL** — looks like `https://xxxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN** — a long token string
6. Add both to your `.env` file (see Step 8).

---

## 5. Firebase Setup (Authentication)

Firebase handles phone OTP and Google Sign-In.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in.
2. Click **Add project** → name it `eru-prod`.
3. Disable Google Analytics if you don't need it (optional).
4. In the left sidebar, go to **Build → Authentication**.
5. Click **Get started**, then **Sign-in method** tab.
6. Enable **Phone** (click it → toggle on → Save).
7. Enable **Google** (click it → toggle on → add your support email → Save).
8. Go to **Project Settings** (gear icon) → **Service accounts** tab.
9. Click **Generate new private key** → confirm → a `.json` file downloads.
10. Rename that file to `firebase-service-account.json` and place it in `apps/api/`.
11. Add the path to your `.env` as `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json`.

> **Important:** Never commit `firebase-service-account.json` to git. It is in `.gitignore`.

---

## 6. AWS Setup (Media Storage and Processing)

AWS handles video/image storage (S3), CDN delivery (CloudFront), and video transcoding (MediaConvert).

### 6a. Create S3 Bucket

1. Log in to [aws.amazon.com](https://aws.amazon.com) and open the S3 console.
2. Click **Create bucket**.
3. Set:
   - **Bucket name:** `eru-media`
   - **AWS Region:** `ap-south-1` (Mumbai)
4. Under **Block Public Access**, uncheck everything (CloudFront will handle access).
5. Click **Create bucket**.

### 6b. Create CloudFront Distribution

1. Open the CloudFront console → **Create distribution**.
2. **Origin domain:** select your `eru-media` S3 bucket.
3. **Origin access:** choose **Origin access control (OAC)** → create a new OAC.
4. **Viewer protocol policy:** Redirect HTTP to HTTPS.
5. Click **Create distribution**.
6. Copy the **Distribution domain name** (looks like `xxxx.cloudfront.net`).
7. Go back to S3 → `eru-media` bucket → **Permissions** → **Bucket policy** → paste the policy that CloudFront generated.
8. Add `CLOUDFRONT_DOMAIN=https://xxxx.cloudfront.net` to your `.env`.

### 6c. Get MediaConvert Endpoint

1. Open the MediaConvert console in `ap-south-1`.
2. On the first page, click **Get started** — AWS shows you your account-specific endpoint URL.
3. Copy it (looks like `https://xxxxxxxxxxxx.mediaconvert.ap-south-1.amazonaws.com`).
4. Add `MEDIACONVERT_ENDPOINT=https://xxxxxxxxxxxx.mediaconvert.ap-south-1.amazonaws.com` to your `.env`.

### 6d. Create IAM User

1. Open IAM console → **Users** → **Create user**.
2. Name it `eru-api`.
3. Attach these policies directly:
   - `AmazonS3FullAccess` (or a custom policy scoped to `eru-media`)
   - `AWSElementalMediaConvertFullAccess`
4. After creation, go to **Security credentials** → **Create access key** → **Application running outside AWS**.
5. Copy:
   - **AWS_ACCESS_KEY_ID**
   - **AWS_SECRET_ACCESS_KEY**
6. Add both to your `.env`.

---

## 7. Google Cloud Vision (Content Moderation)

Cloud Vision auto-checks uploaded images for adult content before they reach human moderators.

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project named `eru` (or use the same Google account as Firebase if you want one project — keep them separate is cleaner).
3. In the search bar, search for **Cloud Vision API** → click it → **Enable**.
4. Go to **APIs & Services → Credentials → Create credentials → API key**.
5. Copy the API key.
6. (Recommended) Click **Restrict key** → under **API restrictions**, select **Cloud Vision API** only.
7. Add `GOOGLE_CLOUD_VISION_API_KEY=your_key_here` to your `.env`.

---

## 8. Create the .env File

In the `apps/api/` folder, copy the example file:

```bash
cp apps/api/.env.example apps/api/.env
```

Then open `apps/api/.env` and fill in every value:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://XXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=eru-media
CLOUDFRONT_DOMAIN=https://XXXX.cloudfront.net
MEDIACONVERT_ENDPOINT=https://XXXX.mediaconvert.ap-south-1.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/MediaConvert_Default_Role

# Google Cloud Vision
GOOGLE_CLOUD_VISION_API_KEY=your_key_here

# App
PORT=3000
NODE_ENV=development
JWT_SECRET=generate_a_random_64_char_string_here
ADMIN_SECRET=another_random_string_for_admin_panel
```

Generate a random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 9. Initialize the Database

Push the Prisma schema to your Supabase database (this creates all tables):

```bash
cd apps/api
npx prisma db push
```

You should see output like `Your database is now in sync with your Prisma schema`.

---

## 10. Create the First Admin User

After the database is initialized, run this SQL in the Supabase dashboard (**SQL Editor** tab):

```sql
-- First create the user row (replace placeholder values with real ones after Firebase auth)
INSERT INTO users (
  id,
  firebase_uid,
  phone,
  name,
  username,
  primary_pincode,
  tier,
  role,
  lifetime_points,
  current_balance,
  created_at,
  last_active
) VALUES (
  gen_random_uuid(),
  'REPLACE_WITH_FIREBASE_UID',   -- get this from Firebase Auth console after first login
  '+919400000000',               -- your admin phone number
  'Eru Admin',
  'eru_admin',
  '682016',
  'champion',
  'admin',
  10000,
  10000,
  now(),
  now()
)
ON CONFLICT (username) DO NOTHING;
```

Or run the seed script (Task 6) which creates the admin user automatically:
```bash
cd apps/api
npm run db:seed
```

---

## 11. Run Locally

Open two terminal windows:

**Terminal 1 — API server:**
```bash
cd apps/api
npm run dev
```
The API starts at `http://localhost:3000`. Visit `/health` to confirm it's running.

**Terminal 2 — Mobile app:**
```bash
cd apps/mobile
npx expo start
```
Scan the QR code with the Expo Go app on your Android phone. Make sure your phone and laptop are on the same Wi-Fi network.

---

## 12. Build a Preview APK

This builds a real `.apk` file you can install directly on any Android phone without needing the Play Store.

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to Expo:
   ```bash
   eas login
   ```
3. Run the preview build (uses `eru-api.up.railway.app` as the API URL):
   ```bash
   cd apps/mobile
   npx eas build --platform android --profile preview
   ```
4. EAS builds it in the cloud (~10 minutes). When done, you get a download link for the `.apk`.

---

## 13. Deploy to Railway

Railway runs our Docker container in the cloud.

1. Sign up at [railway.com](https://railway.com).
2. Install the Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
3. Log in:
   ```bash
   railway login
   ```
4. Link to your project:
   ```bash
   railway link
   ```
5. Set all environment variables in the Railway dashboard (the same values from your `.env` file).
6. Deploy:
   ```bash
   railway up --service eru-api
   ```

For automated deploys on every push to `main`, add `RAILWAY_TOKEN` to your GitHub repository secrets (Settings → Secrets → Actions). The GitHub Actions workflow in `.github/workflows/deploy-api.yml` handles the rest automatically.

---

## 14. Monthly Cost Estimate

Running Eru at low traffic costs roughly **$15/month**:

| Service | Free tier | Paid if exceeded | Est. cost |
|---------|-----------|-----------------|-----------|
| Supabase | 500 MB DB, 5 GB bandwidth | $25/mo Pro | ~$0 (free tier) |
| Upstash Redis | 10,000 req/day | $0.2 per 100k req | ~$0–2 |
| Firebase Auth | 10k phone verifications/mo | $0.006 per SMS | ~$0–2 |
| Railway (API) | $5 credit/mo | ~$5–10/mo for 512 MB | ~$5–8 |
| AWS S3 | 5 GB storage free | $0.023/GB/mo | ~$1–2 |
| AWS CloudFront | 1 TB/mo free | $0.085/GB | ~$0–1 |
| AWS MediaConvert | 20 min HD free/mo | $0.015/min | ~$1–3 |
| Google Cloud Vision | 1,000 units/mo free | $1.50/1,000 units | ~$0–1 |
| **Total** | | | **~$7–19/mo** |

Costs stay near the low end until you have hundreds of daily active users uploading videos.
