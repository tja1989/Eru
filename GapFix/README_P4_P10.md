# GapFix P4–P10 — PWA Parity & Full-Stack Completion

> **Read this first.** This index summarizes what P4–P10 collectively deliver and how they depend on each other. Then open `GapFix_Agent_Protocol.md` before executing any phase.

## Headline

Seven sequential phases that bring the Eru consumer app to **pixel parity** with `Eru_Consumer_PWA.html` and full compliance with `Eru_Consumer_Dev_Spec_final.docx`, with **API + mobile + shared-types shipped together** per phase (no mobile-first-with-stubs).

- **20 screens**, organized into 6 user-journey phases plus a foundation phase (P4).
- **TDD throughout** — every production line is preceded by a failing test (see `GapFix_Agent_Protocol.md` §1).
- **Audit-first** — each phase opens with a grep sweep to prove no duplicate service, route, or model is about to be created (§2).
- **Contract lockdown** — every changed API response passes through `@eru/shared` (§3).

## Why "pixel parity" is the goal

The user chose pixel-parity (vs. functional equivalence or critical-path-only) because the PWA is the client-visible deliverable and every visual element carries product meaning. The Dev Spec states: "Build against the PWA for visual fidelity, against this spec for logic. When in doubt, spec wins."

## Why "full-stack together" is the sequencing

The repo already enforces API ↔ mobile contract lockdown via `@eru/shared`. Ship them together, per phase, and the compiler catches drift. Ship separately and we re-create the same class of bug `Eru_Field_Drift_Lockdown.md` eliminated.

---

## Phase map

```
P4 ─┬─► P5 (Onboarding)     ─── 4 screens ── welcome, otp, personalize, tutorial
    │
    ├─► P6 (Core loop)       ─── 3 screens ── home, create, post-detail
    │          │
    │          ├─► P7 (Earn/Redeem)     ── 3 screens ── wallet, redeem, my-rewards
    │          │
    │          ├─► P8 (Social)          ── 5 screens ── profile, explore, reels, notifications, messages
    │          │
    │          ├─► P9 (Business)        ── 2 screens ── storefront, creator×biz
    │          │
    │          └─► P10 (Polish)         ── 3 screens ── my-content, settings, leaderboard
    │
    └─► (foundations flow into everything)
```

P4 is infrastructure. P5–P10 are journey segments, executable in the order shown (strictly) or lightly parallelizable between P7/P8/P9/P10 once P6 merges.

---

## Phase-by-phase summary

| Phase | File | Screens | Key API work | Key mobile work | ~LOC |
|---|---|---|---|---|---|
| **P4** | [GapFixP4.md](./GapFixP4.md) | 0 (infra) | `Watchlist` model, Socket.io gateway, `Content.businessTagId`, server QR SVG, lockdown 13 remaining routes | `realtime.ts` client, `watchlistService.ts`, remove last fallback chains | ~1.5k |
| **P5** | [GapFixP5.md](./GapFixP5.md) | 4 (welcome, otp, personalize, tutorial) | Progress-bar state on auth, `POST /user/onboarding` response shape, resend-timer semantics | Gradient backgrounds, WhatsApp toggle w/ callout, 15 interest pills exact copy, 4-step progress bars, welcome-bonus banner, 5 earning category cards | ~2k |
| **P6** | [GapFixP6.md](./GapFixP6.md) | 3 (home, create, post-detail) | `GET /feed` response enriched (ugcBadge, sponsored, offerUrl, pointsPreview, location, createdAt, mediaType, duration, authorBusinessId), business search for tagging, comment word-count points gating | PostCard 6 variants, carousel dots, reel type badge, sponsored CTA, per-post points badge, business-tag autocomplete in create, post-detail sort + business-reply styling + +3pt hint | ~6k |
| **P7** | [GapFixP7.md](./GapFixP7.md) | 3 (wallet, redeem, my-rewards) | Wallet daily-goal hint, `expiring` endpoint polish, offer categories (local/giftcard/recharge/donate/premium), watchlist endpoints wired, live-deals-from-watchlist | 5 quick-action tiles, tier progress "Next: Champion" label, history "See All", 6 redeem categories, recharge amount picker, donate-with-match, my-rewards 4 tabs (Active/Watchlist/Used/Expired), watchlist stores row + live deals | ~5k |
| **P8** | [GapFixP8.md](./GapFixP8.md) | 5 (profile, explore, reels, notifications, messages) | Profile grid-tab endpoints, explore masonry fields, reel pts/min heartbeat, notifications category filter + NEW/EARLIER grouping + structured CTAs, conversations filter, WebSocket realtime | 5 grid tabs, masonry badges (points/ad/reel/live/carousel), reel pts indicator, notification 6-tab filter with border colors, message filter tabs + BOOST PROPOSAL pill, chat view with proposal context + bubbles | ~7k |
| **P9** | [GapFixP9.md](./GapFixP9.md) | 2 (storefront, creator×biz) | Storefront aggregate endpoint (profile + offers + reviews + tagged-UGC), creator×biz dashboard with reach/clicks/budget/earning per active sponsorship, proposal negotiate endpoint | Storefront banner + header + 4-tab (About/Offers/Reviews/Tagged) + CTAs; Creator×Biz earnings banner + Active cards w/ stats + Pending w/ Accept/Negotiate/Decline + Create-tagged-content CTA | ~4k |
| **P10** | [GapFixP10.md](./GapFixP10.md) | 3 (my-content, settings, leaderboard) | Creator score detail (ratio + rules transparency), settings full payload (interests/languages/eru-stats/linked-accounts/delete-account w/ 30-day grace), leaderboard season prizes | My-content dislike-ratio bar + rules panel + Edit-and-Resubmit / Appeal buttons, settings 7 cards, leaderboard season banner + podium variable heights + quests progress bars + daily spin tile + badges grid | ~4k |

**Totals**: 20 screens, ~30k LOC (estimated, including tests), ~7 person-weeks sequential (assumes 2 devs in parallel after P6).

---

## Dependency rules (non-negotiable)

- **P4 blocks everything.** No P5–P10 work begins until P4 is green. Reason: every later phase imports contract-locked shared types that P4 adds.
- **P5 blocks P6.** You can't build the core loop if a test user can't sign up.
- **P6 blocks P7, P8, P9, P10.** The core-loop screens define the post shape that everything else displays. After P6 merges, P7–P10 can run in parallel if staffed.
- **P9 (Business) softly depends on P7 (Redeem)** — Storefront embeds offer cards; wire the offer component from P7 first. Parallel is fine if the offer component spec is frozen in P7 before P9 starts.
- **P10 (Polish) comes last.** My Content, Settings, and Leaderboard all consume data created by earlier phases.

---

## What exists today (why P4–P10 look different from P0–P3)

The repo has:

- **28 Prisma models** — User, Content, ContentMedia, PointsLedger, Follow, Interaction, Comment, ModerationQueue, Streak, LeaderboardEntry, Notification, ContentReport, Business, Offer, UserReward, Quest, UserQuestProgress, SpinResult, Badge, UserBadge, Conversation, Message, SponsorshipProposal, Story, StoryView, PollOption, PollVote, Highlight, HighlightItem.
- **26 API routes** — actions, admin, auth, badges, business, content, explore, feed, highlights, leaderboard, locations, media, messages, notifications, offers, polls, quests, reels, rewards, spin, sponsorship, stories, users, wallet, webhooks, whatsapp-otp.
- **18 services** — creatorScoreService, feedAlgorithm, leaderboardService, mediaService, messagesService, moderationService, notificationService, pointsEngine, questsService, rewardsService, spinService, sponsorshipService, storiesService, transcodeService, trendingService, whatsappOtpService, locationsService, badgesService.
- **9 cron jobs** — creatorScoreRecalc, leaderboardReset, metricsCron, moderationSLA, pointsExpiry, prewarmCron, streakReminder, streakReset.
- **13 contract-locked routes** (see `Eru_Field_Drift_Lockdown.md`).
- **Upstash Redis** installed (`@upstash/redis` + `@upstash/ratelimit`).

The work in P4–P10 is:

1. Fill the 5 genuinely-missing backend surfaces (Watchlist, Socket.io, server QR, Content→Business FK, richer feed response).
2. Lock down the remaining ~13 routes.
3. Bring 20 mobile screens to pixel parity with the PWA.

So P4 is much smaller than P0 (foundations were largely done). P5–P10 are mostly frontend with targeted API edits.

---

## How to execute a phase (agent-style)

1. **Read `GapFix_Agent_Protocol.md` end-to-end.** If you've read it in this session, skim §8 (PWA vs Dev Spec resolution) and §9 (completion gate) as a refresher.
2. **Open the phase doc** (e.g. `GapFixP4.md`). Scan the feature inventory.
3. **Run the audit greps** in the "Existing-implementation audit" section. Paste results into your PR description.
4. **Work task-by-task**, strictly RED → GREEN → REFACTOR → COMMIT.
5. **After each feature's green tests**, capture a Playwright screenshot per §5 of the protocol (P5–P10 only).
6. **When all tasks check off**, run the phase-completion gate (protocol §9). Every box must be green before marking the phase done.
7. **Update the phase doc** to reflect any deviations. The doc is a living record.

---

## What you don't do

- **Don't write tests after.** If you catch yourself in that rationalization, delete the code and restart. Protocol §1.
- **Don't skip the audit.** Writing a new route when one exists will bit-rot the codebase. Protocol §2.
- **Don't add features beyond the phase.** YAGNI. Protocol §4 (TDD discipline).
- **Don't create migrations.** This repo is `db push` only. Protocol §6.
- **Don't commit with `-A`.** Name specific files. Protocol §7.
- **Don't push to `origin`** unless the user says so explicitly. Protocol §7.
- **Don't fork a component you can reuse.** If a component in `apps/mobile/components/` does 80% of what you need, extend it. Protocol §2.

---

## Quick-reference: where to look for what

| You're implementing… | PWA line range | Dev Spec § | Mobile files | API files |
|---|---|---|---|---|
| welcome | 255–290 | 2.1 Screen 1 | `app/(auth)/welcome.tsx` | — |
| otp | 293–338 | 2.1 Screen 2 | `app/(auth)/otp.tsx`, `login.tsx` | `routes/auth.ts`, `routes/whatsapp-otp.ts` |
| personalize | 341–405 | 2.1 Screen 3 | `app/(auth)/personalize.tsx` | `routes/users.ts` |
| tutorial | 408–482 | 2.1 Screen 4 | `app/(auth)/tutorial.tsx` | `routes/users.ts` |
| home | 485–693 | 2.2 Screen 5 | `app/(tabs)/index.tsx`, `components/PostCard.tsx`, `StoryRow.tsx`, `PollCard.tsx` | `routes/feed.ts`, `content.ts`, `polls.ts`, `stories.ts` |
| create | 696–851 | 2.2 Screen 6 | `app/(tabs)/create.tsx`, `ContentSubtypeSelector.tsx`, `PollForm.tsx`, `ThreadComposer.tsx`, `LocationPicker.tsx`, `UserTagPicker.tsx` | `routes/content.ts`, `media.ts`, `business.ts` |
| my-content | 854–1030 | 2.2 Screen 7 | `app/my-content/`, `MyContentStatsBar.tsx`, `CreatorEarningsCard.tsx`, `CreatorScoreCard.tsx` | `routes/users.ts` (creator sub-routes), `services/creatorScoreService.ts` |
| profile | 1032–1107 | 2.2 Screen 8 | `app/(tabs)/profile.tsx`, `HighlightsRow.tsx` | `routes/users.ts`, `highlights.ts` |
| explore | 1110–1145 | 2.2 Screen 9 | `app/(tabs)/explore.tsx` | `routes/explore.ts` |
| reels | 1148–1198 | 2.2 Screen 10 | `app/(tabs)/reels.tsx` | `routes/reels.ts`, `actions.ts` |
| wallet | 1201–1338 | 2.3 Screen 11 | `app/wallet/`, `PointsBadge.tsx`, `WalletQuickActions.tsx`, `TierBadge.tsx`, `TierProgressCard.tsx` | `routes/wallet.ts` |
| redeem | 1341–1510 | 2.3 Screen 12 | `app/redeem/`, `OfferCard.tsx`, `RewardCard.tsx` | `routes/offers.ts`, `rewards.ts` |
| my-rewards | 1513–1778 | 2.3 Screen 13 | `app/my-rewards/` | `routes/rewards.ts`, `watchlist.ts` (NEW in P4) |
| settings | 1781–2026 | 2.4 Screen 14 | `app/settings/`, `app/edit-profile/` | `routes/users.ts` |
| leaderboard | 2029–2231 | 2.4 Screen 15 | `app/leaderboard/`, `LeaderboardPodium.tsx`, `QuestRow.tsx`, `BadgeGrid.tsx`, `SpinWheel.tsx` | `routes/leaderboard.ts`, `quests.ts`, `spin.ts`, `badges.ts` |
| creator×biz | 2234–2361 | 2.5 Screen 16 | `app/sponsorship/`, `SponsorshipCard.tsx`, `CreatorEarningsCard.tsx` | `routes/sponsorship.ts` |
| storefront | 2364–2512 | 2.6 Screen 17 | `app/business/[id]/` | `routes/business.ts` |
| post-detail | 2739–2848 | 2.6 Screen 18 | `app/post/[id].tsx`, `CommentInput.tsx` | `routes/content.ts` (comments), `polls.ts` |
| notifications | 2515–2641 | 2.7 Screen 19 | `app/notifications/`, `notificationStore.ts` | `routes/notifications.ts` |
| messages | 2644–2736 | 2.7 Screen 20 | `app/messages/`, `ConversationRow.tsx`, `MessageBubble.tsx` | `routes/messages.ts`, WebSocket gateway (NEW in P4) |

---

## Status

- **Planning complete.** This doc + `GapFix_Agent_Protocol.md` + `GapFixP4.md` through `GapFixP10.md` define the full plan.
- **Ready to execute.** Start with P4.
- **Progress tracking.** Each phase doc has its own checkboxes; update in-place as tasks ship.
