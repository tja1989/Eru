# Eru field-drift lockdown — complete summary

## The problem

API (Fastify) and mobile (Expo/React Native) were using **different field names** for the same data. TypeScript wasn't sitting between them, so mismatches went undetected. One surfaced as a crash on the Leaderboard podium; four more were silently showing zeros or empty screens.

## Root-cause pattern

Mobile screens used defensive fallback chains like `data.items ?? data.posts ?? data.content ?? []` to guess API envelope names. When none matched, the fallback to `[]` made the bug invisible. When a field was read directly without `??`, it crashed.

## The fix (strategy)

1. **Single source of truth:** `@eru/shared` package now owns all API response types.
2. **API contract lock:** every affected Fastify handler annotated `async (): Promise<SharedType> => {...}` — any future rename fails the TypeScript build.
3. **Mobile contract lock:** mobile services import the same shared types, so consumers can't read a nonexistent field.
4. **Fallback chains removed** — replaced with single-field reads.

## Bugs found and fixed

| # | Symptom | API name | Mobile expected | Severity |
|---|---|---|---|---|
| 1 | Leaderboard podium crash | `pointsThisWeek` | `weeklyPoints` | CRASH |
| 2 | Profile "Posts"/"Followers" always 0 | `postCount`, `followerCount` | `postsCount`, `followersCount` | Silent |
| 3 | My-Content page always empty | `{ content }` envelope + `moderationStatus` + `likeCount/commentCount/viewCount` | `{ items }` / `{ posts }` + `status` + `likesCount/commentsCount/viewsCount` | Silent |
| 4 | HighlightEditor content picker always empty | `{ content }` | `{ items } ?? { posts }` | Silent |
| 5 | Profile grid always empty | `{ content }` | `{ items } ?? { posts }` | Silent |
| 6 | Season banner "N days remaining" never rendered | `daysRemaining` (pre-computed) | `endsAt` (never existed) | Silent |
| 7 | Dead fallback chains in explore, reels, wallet-history screens | `data` | `data ?? items ?? posts ?? content` | Future silent-drift risk |

## Shared types created

In `packages/shared/src/types/`:

- `UserProfile`, `GetUserProfileResponse` (corrected from plural to singular counts)
- `UserContentItem`, `GetUserContentResponse` (fixes the `items`/`posts`/`content` drift)
- `LeaderboardEntry`, `LeaderboardResponse`, `MyRankResponse`
- `WalletSummary` (rewritten flat to match actual API), `WalletResponse`
- `WalletHistoryEntry`, `WalletHistoryResponse`
- `ExpiringPointsEntry`, `WalletExpiringResponse`
- `SeasonResponse`
- `WeeklyQuest`, `WeeklyQuestsResponse`
- `SearchResponse`
- `TrendingHashtag`, `TrendingResponse`

`Tier` union now used across `UserProfile`, `WalletSummary`, `LeaderboardEntry` (previously loose `string`).

## Routes now contract-locked (13 endpoints)

- `/leaderboard`, `/leaderboard/me`, `/season/current`
- `/users/:id/profile`, `/users/:id/content`
- `/wallet`, `/wallet/history`, `/wallet/expiring`
- `/explore`, `/search`, `/reels`, `/trending`
- `/quests/weekly`

## Routes audited clean (no shared types yet, types live in mobile services)

`/messages`, `/badges`, `/offers`, `/sponsorship`, `/highlights` — verified to have matching field names; moving their types to `@eru/shared` would be a consistency refactor, not a bug fix.

## Mobile screens that changed behavior

- **Leaderboard podium** — no longer crashes; shows real points
- **Leaderboard list rows** — now show real point totals (were all `0 pts`)
- **Leaderboard "My Rank" card** — tier tile restored using authStore (API doesn't return tier there)
- **Leaderboard season banner** — "N days remaining" now displays
- **Profile tab stats** — Posts / Followers counters show real numbers
- **Profile tab grid** — posts appear
- **My Content page** — content list populated; filters and stats rows render correctly
- **HighlightEditor** — content picker populated

## Files changed (total count, 3 turns)

- **Shared package:** 3 files (points.ts, user.ts, api.ts)
- **API routes:** 5 files (leaderboard, users, wallet, explore, reels, quests — annotations only, no runtime behavior change except one `.toISOString()` in users profile, which is byte-identical to Fastify's default Date serialization)
- **Mobile services:** 5 files (leaderboardService, userService, walletService, exploreService, reelsService, questsService)
- **Mobile screens/components:** 6 files (leaderboard, profile tab, my-content, wallet, explore tab, reels tab, HighlightEditor, LeaderboardPodium)
- **Mobile tests:** 2 files (LeaderboardPodium fixture updated, HighlightEditor mocks corrected)

## Verification (final state)

| Workspace | Check | Result |
|---|---|---|
| `@eru/shared` | Vitest | 12 / 12 ✓ |
| `apps/api` | TypeScript | 0 errors |
| `apps/api` | Vitest (affected routes) | 24 / 24 ✓ across 8 files |
| `apps/mobile` | TypeScript | 0 new errors (5 pre-existing in CommentInput / SponsorshipCard / useNotifications — documented in CLAUDE.md) |
| `apps/mobile` | Jest | 378 / 378 ✓ across 86 suites |

## Deployment risk

**Zero.** No API runtime behavior changed. Annotations are compile-time only. The one route that altered its response construction (`users/:id/profile`) produces byte-identical JSON output because Fastify's default serializer already calls `.toISOString()` on Date objects.

## Known tech debt (not urgent)

- **Date handling:** shared types for paginated content use `string | Date | null` for date fields because Fastify auto-serializes Prisma Dates to ISO strings at the wire. Consumers occasionally need `String(date)` before calling date methods. A clean split into "API-side" vs "wire-side" content types would remove this.
- **Services with local types:** messages, badges, offers, sponsorship, highlights define types in their own mobile service files. They work fine but aren't shared. Optional refactor.

## Memory

Saved to `/Users/USER/.claude/projects/-Users-USER-claude-tj-Eru/memory/project_field_drift_lockdown.md` so future sessions know:
- Which routes are locked vs. structural-only
- The canonical field names (API is source of truth)
- How to lock a new route (4-step recipe: add shared type → annotate API → type mobile service → remove fallback chains)

## Smoke-test checklist for device

| Screen | Check | Expected |
|---|---|---|
| Leaderboard podium | Top-3 bars | Real numbers, no crash |
| Leaderboard "My Rank" | rank / this week / tier tiles | All populated |
| Leaderboard season banner | "N days remaining" | Shows (was blank) |
| Leaderboard list | Each row points + streak | Real values, not zeros |
| Profile tab | Posts / Followers / Following | Real counts |
| Profile tab | Grid | Your posts visible |
| My Content | Filter pills | `All (N)` etc. |
| My Content | Card stats on published items | 👁 / ❤️ / 💬 with real numbers |
| Wallet | History list | Populated |
| Explore | Category filter | Content loads |
| Reels | For-you / Following / Local | Videos load |
