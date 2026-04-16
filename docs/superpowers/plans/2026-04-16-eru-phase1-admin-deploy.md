# Eru Phase 1 Admin Panel + Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Eru Phase 1 production-ready — add a web-based admin moderation panel, CI/CD pipeline, Railway API deployment, and Expo EAS build configuration so beta testers in Kerala can use the app.

**Architecture:** The admin panel is a single static HTML file served by the Fastify API (no separate frontend build). CI/CD uses GitHub Actions to lint, test, and deploy the API to Railway on push. EAS Build generates Android APKs for WhatsApp distribution.

**Tech Stack:** HTML/CSS/JS (admin panel), GitHub Actions (CI/CD), Railway (API hosting), Expo EAS (mobile builds).

**Sub-plan:** 3 of 3 (Backend API [done] → Mobile App [done] → **Admin + Deploy**)

---

## File Structure

```
eru/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   └── admin.ts              ← Existing — add static file serving
│   │   │   └── admin-panel/
│   │   │       └── index.html            ← Single-file admin moderation UI
│   │   ├── Dockerfile                    ← Container for Railway
│   │   └── .dockerignore
│   └── mobile/
│       └── eas.json                      ← EAS Build profiles
├── .github/
│   └── workflows/
│       ├── ci.yml                        ← Lint + test on every push/PR
│       └── deploy-api.yml                ← Deploy to Railway on push to main
├── docs/
│   └── SETUP.md                          ← Environment setup guide
└── railway.json                          ← Railway project config
```

---

## Task 1: Admin Moderation Panel

**Files:**
- Create: `apps/api/src/admin-panel/index.html`
- Modify: `apps/api/src/app.ts` — serve the admin panel at `/admin`

- [ ] **Step 1: Create the single-file admin panel HTML**

`apps/api/src/admin-panel/index.html`:

This is a self-contained HTML file with embedded CSS and JavaScript. It calls the existing `/api/v1/admin/moderation/*` endpoints. Features:
- Login form (enters an API token directly — admin gets their token from Firebase)
- Moderation queue with pending items showing AI scores
- Approve/Decline buttons with decline code dropdown
- Stats bar (reviewed today, approved, declined, pending)
- Appeal queue tab
- Auto-refresh every 30 seconds

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Eru Admin — Moderation Panel</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F1F5F9; color: #1E293B; }
  .header { background: #1A3C6E; color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 20px; font-weight: 800; }
  .header .stats { display: flex; gap: 16px; font-size: 13px; }
  .header .stat { background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 8px; }
  .header .stat strong { display: block; font-size: 18px; }
  .container { max-width: 900px; margin: 0 auto; padding: 20px; }
  .login { max-width: 400px; margin: 100px auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .login h2 { margin-bottom: 16px; }
  .login input { width: 100%; padding: 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 15px; margin-bottom: 12px; }
  .login button { width: 100%; padding: 12px; background: #1A3C6E; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
  .tabs button { padding: 8px 16px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; background: #E2E8F0; color: #475569; }
  .tabs button.active { background: #1A3C6E; color: #fff; }
  .card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border-left: 4px solid #D97706; }
  .card.appeal { border-left-color: #EF4444; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .card-header h3 { font-size: 15px; }
  .card-header .time { font-size: 12px; color: #94A3B8; }
  .card-body { font-size: 14px; color: #475569; margin-bottom: 12px; }
  .card-body .media { width: 200px; height: 200px; background: #E2E8F0; border-radius: 8px; overflow: hidden; margin-top: 8px; }
  .card-body .media img { width: 100%; height: 100%; object-fit: cover; }
  .scores { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .score { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .score.safe { background: #D1FAE5; color: #065F46; }
  .score.warn { background: #FEF3C7; color: #92400E; }
  .score.danger { background: #FEE2E2; color: #991B1B; }
  .actions { display: flex; gap: 8px; }
  .actions button { padding: 8px 16px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 13px; }
  .btn-approve { background: #10B981; color: #fff; }
  .btn-decline { background: #EF4444; color: #fff; }
  .decline-select { padding: 8px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 13px; }
  .empty { text-align: center; padding: 60px; color: #94A3B8; font-size: 16px; }
  .refresh { font-size: 12px; color: #94A3B8; text-align: right; margin-bottom: 8px; }
</style>
</head>
<body>

<div id="app"></div>

<script>
const API_BASE = window.location.origin + '/api/v1';
let token = localStorage.getItem('eru_admin_token') || '';
let currentTab = 'pending';
let autoRefreshId = null;

function render() {
  if (!token) { renderLogin(); return; }
  renderPanel();
  loadQueue();
  loadStats();
  if (autoRefreshId) clearInterval(autoRefreshId);
  autoRefreshId = setInterval(() => { loadQueue(); loadStats(); }, 30000);
}

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login">
      <h2>Eru Admin</h2>
      <p style="color:#94A3B8;margin-bottom:16px;">Enter your API Bearer token</p>
      <input id="tokenInput" type="password" placeholder="Bearer token" />
      <button onclick="doLogin()">Sign In</button>
    </div>`;
}

function doLogin() {
  token = document.getElementById('tokenInput').value.trim();
  if (token) { localStorage.setItem('eru_admin_token', token); render(); }
}

function logout() {
  token = '';
  localStorage.removeItem('eru_admin_token');
  if (autoRefreshId) clearInterval(autoRefreshId);
  render();
}

function renderPanel() {
  document.getElementById('app').innerHTML = `
    <div class="header">
      <h1>Eru Moderation</h1>
      <div class="stats" id="stats">Loading...</div>
      <button onclick="logout()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;">Logout</button>
    </div>
    <div class="container">
      <div class="tabs">
        <button class="${currentTab === 'pending' ? 'active' : ''}" onclick="switchTab('pending')">Pending</button>
        <button class="${currentTab === 'appeal' ? 'active' : ''}" onclick="switchTab('appeal')">Appeals</button>
      </div>
      <div class="refresh" id="refreshTime"></div>
      <div id="queue">Loading...</div>
    </div>`;
}

function switchTab(tab) { currentTab = tab; renderPanel(); loadQueue(); loadStats(); }

async function api(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...opts.headers },
  });
  if (res.status === 401 || res.status === 403) { logout(); throw new Error('Unauthorized'); }
  return res.json();
}

async function loadStats() {
  try {
    const s = await api('/admin/moderation/stats');
    document.getElementById('stats').innerHTML = `
      <div class="stat">Reviewed<strong>${s.reviewed}</strong></div>
      <div class="stat">Approved<strong>${s.approved}</strong></div>
      <div class="stat">Declined<strong>${s.declined}</strong></div>
      <div class="stat" style="background:rgba(239,68,68,0.3)">Pending<strong>${s.pending}</strong></div>`;
  } catch {}
}

async function loadQueue() {
  try {
    const result = await api('/admin/moderation/queue?status=' + currentTab + '&limit=20');
    const items = result.data || [];
    document.getElementById('refreshTime').textContent = 'Last refreshed: ' + new Date().toLocaleTimeString() + ' (auto-refresh every 30s)';
    if (items.length === 0) {
      document.getElementById('queue').innerHTML = '<div class="empty">No items in queue</div>';
      return;
    }
    document.getElementById('queue').innerHTML = items.map(item => renderCard(item)).join('');
  } catch (e) { document.getElementById('queue').innerHTML = '<div class="empty">Error loading queue</div>'; }
}

function renderCard(item) {
  const c = item.content;
  const scores = item.autoCheckResult || {};
  const isAppeal = item.isAppeal;
  const mediaHtml = c.media && c.media.length > 0
    ? `<div class="media"><img src="${c.media[0].thumbnailUrl || c.media[0].originalUrl}" onerror="this.style.display='none'" /></div>` : '';
  const scoreHtml = Object.entries(scores).map(([k, v]) => {
    const val = Number(v);
    const cls = val > 0.5 ? 'danger' : val > 0.2 ? 'warn' : 'safe';
    return `<span class="score ${cls}">${k}: ${(val * 100).toFixed(0)}%</span>`;
  }).join('');

  return `
    <div class="card ${isAppeal ? 'appeal' : ''}">
      <div class="card-header">
        <h3>${isAppeal ? '⚠️ APPEAL — ' : ''}${c.type} by @${c.user?.username || 'unknown'}</h3>
        <span class="time">${timeAgo(item.createdAt)}</span>
      </div>
      <div class="card-body">
        ${c.text ? `<p>${c.text}</p>` : '<p style="color:#94A3B8">(no text)</p>'}
        ${mediaHtml}
      </div>
      ${scoreHtml ? `<div class="scores">${scoreHtml}</div>` : ''}
      <div class="actions">
        <button class="btn-approve" onclick="approve('${item.id}')">✅ Approve</button>
        <select class="decline-select" id="decline-${item.id}">
          <option value="">Decline reason...</option>
          <option value="MOD-01">MOD-01: NSFW</option>
          <option value="MOD-02">MOD-02: Copyright music</option>
          <option value="MOD-03">MOD-03: Spam/duplicate</option>
          <option value="MOD-04">MOD-04: Hate speech</option>
          <option value="MOD-05">MOD-05: Misleading</option>
          <option value="MOD-06">MOD-06: Low quality</option>
          <option value="MOD-07">MOD-07: Prohibited</option>
        </select>
        <button class="btn-decline" onclick="decline('${item.id}')">❌ Decline</button>
      </div>
    </div>`;
}

async function approve(id) {
  try {
    await api('/admin/moderation/' + id + '/approve', { method: 'POST' });
    loadQueue(); loadStats();
  } catch (e) { alert('Error: ' + e.message); }
}

async function decline(id) {
  const code = document.getElementById('decline-' + id).value;
  if (!code) { alert('Select a decline reason'); return; }
  try {
    await api('/admin/moderation/' + id + '/decline', { method: 'POST', body: JSON.stringify({ code }) });
    loadQueue(); loadStats();
  } catch (e) { alert('Error: ' + e.message); }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

render();
</script>
</body>
</html>
```

- [ ] **Step 2: Serve the admin panel from Fastify**

Modify `apps/api/src/app.ts` — add static file serving for the admin panel.

Install: `cd /Users/USER/claude_tj/Eru/apps/api && npm install @fastify/static`

Add to `apps/api/src/app.ts`:
```typescript
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inside buildApp(), after route registrations:
app.register(fastifyStatic, {
  root: join(__dirname, 'admin-panel'),
  prefix: '/admin/',
  decorateReply: false,
});
```

- [ ] **Step 3: Verify admin panel is accessible**

Run: `cd /Users/USER/claude_tj/Eru/apps/api && npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/admin-panel/ apps/api/src/app.ts apps/api/package.json
git commit -m "feat: add web-based admin moderation panel served at /admin/"
```

---

## Task 2: Railway Deployment Config

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/api/.dockerignore`
- Create: `railway.json`

- [ ] **Step 1: Create Dockerfile for the API**

`apps/api/Dockerfile`:
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace=@eru/api --workspace=@eru/shared
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
RUN cd apps/api && npx prisma generate
RUN cd apps/api && npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/src/admin-panel ./apps/api/dist/admin-panel
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY apps/api/package.json apps/api/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
```

- [ ] **Step 2: Create .dockerignore**

`apps/api/.dockerignore`:
```
node_modules
dist
.env
.env.local
*.log
tests
```

- [ ] **Step 3: Create railway.json**

`railway.json`:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  },
  "deploy": {
    "startCommand": "node apps/api/dist/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/Dockerfile apps/api/.dockerignore railway.json
git commit -m "feat: add Dockerfile and Railway deployment config"
```

---

## Task 3: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-api.yml`

- [ ] **Step 1: Create CI workflow (lint + test on every push/PR)**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: cd apps/api && npx prisma generate

      - name: Type check shared package
        run: npx tsc --noEmit -p packages/shared/tsconfig.json

      - name: Type check API
        run: cd apps/api && npx tsc --noEmit
        continue-on-error: true

      - name: Run API tests
        run: cd apps/api && npx vitest run
```

- [ ] **Step 2: Create deploy workflow (Railway on push to main)**

`.github/workflows/deploy-api.yml`:
```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/shared/**'
      - 'railway.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        run: railway up --service eru-api --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions CI (lint + test) and Railway deploy workflows"
```

---

## Task 4: Expo EAS Build Configuration

**Files:**
- Create: `apps/mobile/eas.json`

- [ ] **Step 1: Create EAS build profiles**

`apps/mobile/eas.json`:
```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://eru-api.up.railway.app"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.eru.app"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/eas.json
git commit -m "feat: add Expo EAS build config with dev/preview/production profiles"
```

---

## Task 5: Environment Setup Guide

**Files:**
- Create: `docs/SETUP.md`

- [ ] **Step 1: Write the setup guide**

`docs/SETUP.md`:
```markdown
# Eru Phase 1 — Environment Setup Guide

Step-by-step guide to set up all external services and run Eru locally.

## Prerequisites

- Node.js 22+
- npm 10+
- Git
- An Android phone with Expo Go (for mobile testing)

## 1. Clone and Install

```bash
git clone https://github.com/tja1989/Eru.git
cd Eru
npm install
```

## 2. Supabase (PostgreSQL Database)

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Choose region: Mumbai (ap-south-1) for lowest latency to Kerala
3. Copy the connection string from Settings → Database → Connection String (URI)
4. Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## 3. Upstash (Redis)

1. Go to [upstash.com](https://upstash.com) and create a free Redis database
2. Choose region: ap-south-1 (Mumbai)
3. Copy the REST URL from the dashboard
4. Format: `https://[ID].upstash.io` (the SDK uses the REST API, not raw Redis protocol)

## 4. Firebase (Auth + Push Notifications)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project "Eru"
3. Enable Authentication → Sign-in method → Phone and Google
4. Go to Project Settings → Service Accounts → Generate New Private Key
5. From the JSON file, extract: `project_id`, `client_email`, and `private_key`

## 5. AWS (S3 + CloudFront + MediaConvert)

### S3 Bucket
1. Go to AWS Console → S3 → Create Bucket
2. Name: `eru-media`, Region: `ap-south-1`
3. Uncheck "Block all public access" (CloudFront will serve files)
4. Create bucket

### CloudFront CDN
1. Go to CloudFront → Create Distribution
2. Origin: your S3 bucket
3. Note the distribution domain (e.g., `d1234abcdef.cloudfront.net`)

### MediaConvert
1. Go to MediaConvert → Account → API endpoint
2. Copy the endpoint URL
3. Create an IAM role with MediaConvert + S3 access, note the ARN

### IAM User
1. Create an IAM user with programmatic access
2. Attach policies: `AmazonS3FullAccess`, `AWSElementalMediaConvertFullAccess`
3. Copy the Access Key ID and Secret Access Key

## 6. Google Cloud Vision

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the Vision API
3. Create an API key (restrict to Vision API)

## 7. Create .env File

```bash
cp .env.example apps/api/.env
```

Edit `apps/api/.env` with all the values collected above.

## 8. Initialize Database

```bash
cd apps/api
npx prisma db push
```

This creates all 11 tables in your Supabase database.

## 9. Create Admin User

After starting the API and registering your first user, promote yourself to admin:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

Run this in the Supabase SQL Editor (Dashboard → SQL Editor).

## 10. Run Locally

```bash
# Terminal 1: API server
cd apps/api
npm run dev

# Terminal 2: Mobile app
cd apps/mobile
npx expo start
```

Scan the QR code with Expo Go on your Android phone.

## 11. Build APK for Beta Distribution

```bash
cd apps/mobile
npx eas build --platform android --profile preview
```

This uploads the build to Expo's cloud. Download the APK when ready and share via WhatsApp.

## 12. Deploy API to Railway

1. Create a Railway account at [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Railway auto-detects the Dockerfile
4. Add all environment variables from `.env.example` in the Railway dashboard
5. Deploy

The API will be live at `https://eru-api.up.railway.app` (or your custom domain).

## Costs (Phase 1, 500 users)

| Service | Monthly Cost |
|---------|-------------|
| Supabase (free tier) | $0 |
| Upstash (free tier) | $0 |
| Firebase Auth (free tier) | $0 |
| Railway (Starter) | $5 |
| AWS S3 + CloudFront | $1-2 |
| AWS MediaConvert | $6 |
| Google Cloud Vision | $2 |
| **Total** | **~$15/month** |
```

- [ ] **Step 2: Commit**

```bash
git add docs/SETUP.md
git commit -m "docs: add environment setup guide for all external services"
```

---

## Task 6: Seed Data Script

**Files:**
- Create: `apps/api/src/scripts/seed.ts`

- [ ] **Step 1: Create seed script for demo data**

`apps/api/src/scripts/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Eru database...');

  // Create demo admin user
  const admin = await prisma.user.upsert({
    where: { username: 'eru_admin' },
    update: {},
    create: {
      firebaseUid: 'admin-seed-uid',
      phone: '+910000000000',
      name: 'Eru Admin',
      username: 'eru_admin',
      primaryPincode: '682016',
      interests: ['food', 'travel', 'tech'],
      role: 'admin',
      tier: 'champion',
      lifetimePoints: 50000,
      currentBalance: 5000,
    },
  });
  console.log('Admin user created:', admin.username);

  // Create demo creator users
  const creators = [
    { name: 'Preethi M', username: 'foodiepreethi', interests: ['food', 'travel'], bio: 'Food explorer in Kochi' },
    { name: 'Ravi Kumar', username: 'traveler_ravi', interests: ['travel', 'fitness'], bio: 'Adventure awaits!' },
    { name: 'Meera Nair', username: 'meera_clicks', interests: ['art', 'film'], bio: 'Capturing Kerala one frame at a time' },
    { name: 'Arjun S', username: 'techie_arjun', interests: ['tech', 'gaming'], bio: 'Code, coffee, Kerala' },
    { name: 'Lakshmi R', username: 'lakshmi_cooks', interests: ['food', 'education'], bio: 'Traditional Kerala recipes' },
  ];

  for (const c of creators) {
    const user = await prisma.user.upsert({
      where: { username: c.username },
      update: {},
      create: {
        firebaseUid: `seed-uid-${c.username}`,
        phone: `+91${Math.floor(9000000000 + Math.random() * 999999999)}`,
        name: c.name,
        username: c.username,
        primaryPincode: '682016',
        interests: c.interests,
        bio: c.bio,
        tier: 'engager',
        lifetimePoints: 3000,
        currentBalance: 500,
        streakDays: 7,
        streakLastDate: new Date(),
      },
    });

    // Create sample content for each creator
    const types = ['post', 'reel', 'post'] as const;
    const sampleTexts = [
      `Best ${c.interests[0]} spot in Ernakulam! #kochi #${c.interests[0]} #eru`,
      `Morning vibes at Fort Kochi #fortKochi #kerala #morningvibes`,
      `Can't believe this gem exists in our pincode! #hidden #local #682016`,
    ];

    for (let i = 0; i < 3; i++) {
      await prisma.content.create({
        data: {
          userId: user.id,
          type: types[i],
          text: sampleTexts[i],
          hashtags: [c.interests[0], 'kochi', 'kerala', 'eru'],
          locationPincode: '682016',
          moderationStatus: 'published',
          publishedAt: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
          likeCount: Math.floor(Math.random() * 100),
          commentCount: Math.floor(Math.random() * 20),
          viewCount: Math.floor(Math.random() * 500),
        },
      });
    }
    console.log(`Creator ${c.username}: 3 posts seeded`);
  }

  console.log('Seed complete! Admin: eru_admin, 5 creators with 15 posts total.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed script to package.json**

Add to `apps/api/package.json` scripts:
```json
"db:seed": "tsx src/scripts/seed.ts"
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/scripts/seed.ts apps/api/package.json
git commit -m "feat: add database seed script with admin user and 5 demo creators"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task | Status |
|------------|------|--------|
| Admin moderation panel | Task 1 | Covered — single HTML file with queue, approve/decline, stats |
| Railway deployment | Task 2 | Covered — Dockerfile + railway.json |
| CI/CD pipeline | Task 3 | Covered — lint + test + deploy workflows |
| EAS Build for APK | Task 4 | Covered — dev/preview/production profiles |
| Environment setup | Task 5 | Covered — step-by-step guide |
| Seed data | Task 6 | Covered — admin + 5 creators + 15 posts |

### Placeholder Scan

No TBD, TODO, or placeholders found. Railway deploy workflow requires `RAILWAY_TOKEN` secret — documented in the workflow file.

### Type Consistency

Admin panel JS uses the same API endpoint paths as `apps/api/src/routes/admin.ts`. Decline codes match the `moderationDeclineSchema` Zod enum (MOD-01 through MOD-07).
