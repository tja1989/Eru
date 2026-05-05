# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

npm + Turborepo monorepo. Two applications and one shared package:

- `apps/api` — Fastify + Prisma (Postgres/Supabase) + Vitest. Deployed to Railway at `https://eruapi-production.up.railway.app`.
- `apps/mobile` — Expo SDK 54 (React Native 0.81, new arch enabled) + expo-router + Jest (`jest-expo` preset). Project slug `eru_aflo / eru`, EAS project `5fb96f5e-8595-40ac-a854-07f89029aa07`.
- `packages/shared` — `@eru/shared` types/utilities consumed by both apps.

The repo root has `package.json` workspaces + `turbo.json`. Turbo pipelines (`turbo dev|build|test|lint`) fan out to the workspaces. Tests today are typically run per-workspace (see below) rather than via the root turbo task.

## Common commands

### API (`cd apps/api`)

| Command | Purpose |
|---|---|
| `npm run dev` | `tsx watch src/server.ts` — live-reload API on `:3000` |
| `npm run build` | `tsc && cp -r src/admin-panel dist/admin-panel` |
| `npm start` | Run compiled `dist/server.js` (Railway uses this) |
| `ALLOW_DEV_TOKENS=true npm test` | Full Vitest suite — **env var required**, see "Test conventions" |
| `ALLOW_DEV_TOKENS=true npm test -- <pattern>` | Run a subset, e.g. `-- dislike polls threads` |
| `npm run db:push` | Apply `schema.prisma` to the live dev DB — **this project uses `db push`, not `migrate dev`** |
| `npm run db:generate` | Regenerate the Prisma client after schema edits |
| `npm run db:seed` / `db:seed-reels` / `db:seed-rewards` / `db:pincodes` | One-off data loaders; the pincodes script reads `apps/api/src/data/raw-pincodes.csv` |
| `npx tsx src/scripts/<name>.ts` | One-off maintenance scripts under `apps/api/src/scripts/`: `clear-demo-media`, `backfill-{hls,media,transcodes}`, `fix-reel-urls`, `prewarm-trending`, `download-pincodes`, `seed`, `seed-reels`, `seed-rewards` |

### Mobile (`cd apps/mobile`)

| Command | Purpose |
|---|---|
| `npx expo start --tunnel --clear` | Start Metro via tunnel (most reliable for Expo Go across networks / firewalls) |
| `npx expo start --dev-client` | Use with a dev build once one exists |
| `npm test` | Full Jest suite |
| `npm test -- <pattern>` | Single file, e.g. `npm test -- PostCard`; RegExp-matched against `__tests__/**` |
| `npm run test:watch` | Watch mode |
| `npx tsc --noEmit` | Type-check (6 pre-existing errors in CommentInput / SponsorshipCard / useNotifications — document, don't "fix" unless asked) |

### Verifying a mobile bundle actually assembles (useful when Expo Go shows a 500)

```bash
cd apps/mobile && npx expo export --platform android --output-dir /tmp/eru-bundle-check
```

Metro errors surface there with full stack traces, unlike `expo start` which can hide them.

## High-level architecture

### API (`apps/api/src/`)

```
server.ts ──► app.ts ──► routes/*.ts  (all registered under /api/v1)
                   │
                   ├── middleware/auth.ts — resolves Firebase/dev tokens → User
                   ├── services/           — shared business logic (pointsEngine, rewardsService, creatorScoreService, locationsService, ...)
                   ├── jobs/               — node-cron scheduled tasks wired in startCronJobs()
                   ├── utils/              — prisma client, errors helper, validators (Zod schemas)
                   └── data/               — static fixtures (e.g. pincodes.json)
```

Route files are thin — they validate with Zod from `utils/validators.ts`, call a service, and throw via `Errors.notFound|badRequest|forbidden|conflict|unauthorized` from `utils/errors.js`. Every route file starts with `app.addHook('preHandler', authMiddleware)` unless the endpoint is pre-auth (auth.ts, whatsapp-otp.ts).

Multi-step writes use **interactive `prisma.$transaction(async (tx) => …)`** so cross-row operations are atomic (see `content.ts` poll + thread creation for the canonical pattern — a prior bug used the array form and lost atomicity).

Error-shape convention: `Errors.conflict` on P2002 duplicate inserts, narrowed by `error.meta.target` when multiple unique indexes coexist (see `users.ts` username 409 handler).

### Mobile (`apps/mobile/`)

```
app/                  — expo-router file-based routes
  _layout.tsx         — "dumb" root Slot (no imperative redirects here — causes Slot-not-registered races)
  (auth)/_layout.tsx  — auth + onboarding gate; uses useSegments() to avoid redirect loops on welcome/personalize/tutorial
  (tabs)/_layout.tsx  — tab bar + auth gate (redirects to /(auth)/login if not signed in)
  (auth)/{welcome,personalize,tutorial,login,otp,onboarding}.tsx
  (tabs)/{index,explore,create,reels,profile}.tsx
  {edit-profile,settings,wallet,leaderboard,my-content,...}/  — standalone routes
components/           — Screen-agnostic UI (PostCard, PollCard, CreatorScoreCard, LocationPicker, HighlightsRow, ...)
services/             — API clients (contentService, userService, pollService, locationsService, whatsappAuthService, ...)
stores/               — Zustand stores (authStore with persist, pointsStore, notificationStore)
hooks/                — useAuth (wraps authStore hydration), useNotifications (conditionally requires expo-notifications)
constants/theme.ts    — colors / spacing / radius tokens
```

All screens use `expo-router`'s `useRouter` + `useLocalSearchParams`. SafeArea from `react-native-safe-area-context`.

The auth/onboarding gate is layered: `(tabs)/_layout.tsx` bounces unauthenticated users to `/(auth)/login`; `(auth)/_layout.tsx` then routes them to `/welcome` if they haven't completed onboarding — with a `useSegments()` check so the gate skips re-routing when the user is *already* on welcome/personalize/tutorial (otherwise it loops to a blank screen).

## Project-specific conventions

### Shared types = API contract (field-drift lockdown, 2026-04-21)

Thirteen routes are contract-locked against types in [packages/shared/src/types/](packages/shared/src/types/): `/leaderboard`, `/leaderboard/me`, `/season/current`, `/users/:id/profile`, `/users/:id/content`, `/wallet`, `/wallet/history`, `/wallet/expiring`, `/explore`, `/search`, `/reels`, `/trending`, `/quests/weekly`.

- API handlers are annotated `async (): Promise<SharedType> => {...}` — any field rename fails the TypeScript build on both sides.
- Mobile services import the same shared types, so consumers can't read a nonexistent field.
- When changing any response field on these routes: update `@eru/shared` first, then API + mobile in the **same commit**. Run `npx tsc --noEmit` in both `apps/api` and `apps/mobile` before claiming done.
- **Never re-introduce defensive fallback chains** like `data.items ?? data.posts ?? data.content ?? []` on mobile — the lockdown removed them specifically because they hid silent drift (unmatched keys collapsed to `[]` so bugs looked like empty states). Read fields directly; if the field is missing, the build should fail.
- Routes audited clean but not yet lockdowned: `/messages`, `/badges`, `/offers`, `/sponsorship`, `/highlights` — moving their types to `@eru/shared` would be a consistency refactor, not a bug fix. Safe to add shared types if you're already touching them.
- Full list of bugs this caught and strategy rationale: [GapFix/Eru_Field_Drift_Lockdown.md](GapFix/Eru_Field_Drift_Lockdown.md).

### Prisma

- **Use `npx prisma db push` + `npx prisma generate`.** There is no `prisma/migrations/` folder; P1 deliberately chose push for Supabase simplicity and every subsequent P has followed.
- When adding a model that references `dev-test-*` users, extend `tests/helpers/db.ts#cleanupTestData` with a delete in FK-safe order — the order matters: children before parents. Miss this and full-suite runs start producing P2003 FK violations.

### Tests — API (Vitest)

- `vitest.config.ts` has `fileParallelism: false` and `testTimeout: 30000`. **Don't tune these** — they work around the fact that all tests share one Supabase DB and rely on prefix-based cleanup.
- Every seeded user's `firebaseUid` **must** start with `dev-test-`, with a unique per-test suffix (e.g. `dev-test-dis1a`). This is the only reason `cleanupTestData` can safely run `deleteMany` between tests.
- Helpers: `seedUser`, `seedContent`, `cleanupTestData`, `devToken` in `tests/helpers/db.ts`; `getTestApp`, `closeTestApp` in `tests/helpers/setup.ts`. `devToken('dev-test-foo')` returns `"Bearer dev-test-foo"` — pass it directly to `Authorization`, don't add another "Bearer ".
- Dev-token auth only works when the run has `ALLOW_DEV_TOKENS=true` in env.
- **Known cleanup-interference flakes.** Running the full suite occasionally fails in `wallet-tier`, `spin`, `sponsorship`, `stories`, `reels-following`, `leaderboard-friends` with `PrismaClientKnownRequestError: No record was found for an update`. Re-run those files in isolation (`npm test -- tests/routes/spin.test.ts …`) — if they pass clean, it's the documented flake; if they still fail, it's a real regression.

### Tests — Mobile (Jest / jest-expo)

- Default API import: `import api from '@/services/api'` (not `{ api }`). Services wrap axios in a plain object with async methods returning `res.data.X`.
- Common mock patterns:
  ```ts
  jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
  jest.mock('@/services/contentService');
  jest.mock('@/stores/authStore', () => ({
    useAuthStore: (sel: any) => sel({ user: { id: 'u-me' } }),
  }));
  ```
- For Firebase / native modules in screens (`firebase/auth`, expo-notifications, expo-image-picker), each test file that renders that screen must mock them explicitly — Jest's module isolation won't inherit a global mock.
- `__tests__/` mirrors `app/` + `components/` structure. Tests assert real behavior, not snapshots.

### Commit style

`feat(api): add X`, `feat(mobile): add Y`, `fix(api|mobile): ...`, `test(...)`, `chore(...)`, `style(...)`. Scope each commit tightly — one route or one component per commit where practical. Commit message body explains *why* more often than *what*.

When staging, **never use `git add -A` or `.`**. Name specific files. The repo intentionally excludes from every commit: `.DS_Store`, `.claude/`, `.expo/`, `Notes.md`, `app.json` at repo root (the mobile one is `apps/mobile/app.json`), `tsconfig.json` at repo root (app-level `tsconfig.json`s are committed), `DesignSystem/`, `Eru_Business_Dashboard.html`, `Eru_Consumer_PWA.html`, `DeferredWork/` (local scratch).

Commits land on `main` directly — no feature-branch convention in this repo. `main` is currently ~150 commits ahead of `origin`; don't push without asking.

## GapFix plans

`GapFix/GapFixP0.md` through `GapFixP3.md` are the four sequential implementation specs that built the app to its current shape. Every completed feature traces back to one of these. If you're asked to "continue P-something" or "implement F12 from P3", read the corresponding plan end-to-end first — they include schemas, test names, file lists, and "what could go wrong" sections. `DeferredWork/DWSet1.md` tracks P3 follow-ups that were intentionally not shipped (WhatsApp credentials, Personalize persistence, full pincode dataset, Linked Accounts OAuth, one `as any` cast).

## Expo Go vs development build

The app works in Expo Go for most smoke-testing, but a **development build is required** for:

- Real push notifications (`expo-notifications` is no-op'd in Expo Go via `Constants.executionEnvironment === 'storeClient'` in `hooks/useNotifications.ts` — `require('expo-notifications')` is gated behind that check)
- Reliable Firebase Phone Auth OTP delivery on Android
- Custom app icon / splash / `scheme: "eru"` deep links

Until a dev build exists, run `npx expo start --tunnel --clear` to avoid LAN/firewall issues. A dev build uses the same Metro dev server with `--dev-client`.

## External services

From `Notes.md`:

| Service | Account |
|---|---|
| Supabase (Postgres) | `tja1989` github-linked |
| Upstash Redis (rate limiting + OTP TTL store) | `tja1989` github-linked |
| Firebase (phone auth + FCM + admin SDK) | `aflolabs@gmail.com` |
| AWS (S3 media + MediaConvert transcodes) | `aflolabs@gmail.com` |
| Railway (API deploy) | `tja1989` github-linked |
| Expo / EAS | `eru_aflo` (`aflolabs@gmail.com`) |

`apps/api/.env` holds the secrets; there is no `.env.example`. Required keys include `DATABASE_URL`, `DIRECT_URL`, Firebase admin JSON, AWS keys, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and (for WhatsApp OTP, not yet configured) `GUPSHUP_API_KEY` / `GUPSHUP_SOURCE`.

Optional env flags:
- `ALLOW_DEV_TOKENS=true` — enables the `dev-test-*` bearer-token auth path (required for Vitest runs; never set in prod).
- `AUTO_APPROVE_CONTENT=true` — bypasses the moderation queue and publishes new posts immediately (see [apps/api/src/routes/content.ts:116](apps/api/src/routes/content.ts#L116); dev/demo only).
