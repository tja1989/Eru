# GapFix P10 — Phase 6: Polish (my-content, settings, leaderboard)

> **For agentic workers:** Required reading: [`GapFix_Agent_Protocol.md`](./GapFix_Agent_Protocol.md). P4–P9 must be green. This is the last P-phase. Ship P10 and the consumer app reaches pixel parity with the PWA end-to-end.

**Goal:** My Content shows the creator-score transparency panel (ratio bar + score-math rules + thresholds), per-post engagement on list rows, and Edit-and-Resubmit / Appeal actions on declined posts. Settings has all 7 cards: Personal Details, Location & Pincode, Content Interests, Language & Content, Notifications & Privacy, Eru Account stats, Linked Accounts, plus Log Out / Delete Account. Leaderboard has the season prize banner (iPhone 16 / MacBook Air / ₹200 card), 4 scope tabs (Pincode/State/India/Friends), podium with variable heights, Weekly Quests card with progress bars, Daily Spin tile, Badges grid (5/12 unlocked).

**Architecture:** Mostly mobile. API already has most of what's needed (`creatorScoreService` from P3, `leaderboardService`, `questsService`, `spinService`, `badgesService`). P10 adds the few missing shared-type fields and wires UI to exact PWA copy.

---

## The quarterly-report analogy

P10 is the **wall of informational posters in a coworking-space lobby**: a big season leaderboard in the middle with prizes pinned underneath, a "How your score changes" rules sheet in the creator corner (so you know exactly why you lost 0.5 points yesterday), and a personal "your account settings" kiosk near the entrance with a tidy checklist of everything you can tweak. None of this changes the core business, but without it a visitor doesn't know why things happen. P10 is those posters.

---

## Feature inventory

| # | Feature | Backend | Mobile | Priority |
|---|---------|---------|--------|----------|
| 1 | My Content engagement + declined actions | `/users/me/content` list rows include ratios + decline reason; `POST /content/:id/resubmit` | Engagement chips + Edit+Appeal buttons | P10a |
| 2 | Creator Score transparency panel | `GET /users/me/creator/score` returns score + ratio + deltas + thresholds | Ratio bar + rules panel + threshold warning | P10a |
| 3 | Settings 7 cards | `/users/me/settings` full payload; avatar upload; `DELETE /users/me/account` with 30-day grace | 7 cards including Linked Accounts + Delete with confirmation | P10b |
| 4 | Leaderboard season prizes | `/season/current` prize breakdown | Season banner with 3 prize tiles | P10c |
| 5 | Leaderboard podium + list pixel parity | — | Top-3 podium with variable heights + your-position card + remaining list | P10c |
| 6 | Weekly Quests full UI | `GET /quests/weekly` returns progress per quest | QuestRow + completion bonus note | P10c |
| 7 | Daily Spin tile + badges grid | Already present; wire UI | Spin tile + BadgeGrid (5/12 unlocked) | P10c |

Parallelizable after each screen's independent audit.

---

## Prerequisites

- [ ] P4 + P5 + P6 + P7 + P8 + P9 green.
- [ ] `creatorScoreService` shipped with `getScore()` returning ratio + trend (P3 era).
- [ ] `leaderboardService` uses Redis sorted sets for scope-bound ranks (confirmed in P4 audit).
- [ ] `questsService` returns weekly quests with progress (from existing).
- [ ] `spinService.spin()` returns points won (from existing).
- [ ] `badgesService.getBadges(userId)` returns unlocked+locked list.

---

## Existing-implementation audit (RUN FIRST)

### G1. My Content

```
Read: apps/mobile/app/my-content/index.tsx
Read: apps/mobile/components/MyContentStatsBar.tsx
Read: apps/mobile/components/CreatorEarningsCard.tsx
Read: apps/mobile/components/CreatorScoreCard.tsx
```

Confirm existing elements from P3. Gaps: per-post engagement chips (`234 👍 • 3 👎 • 45 💬`), declined reason + Edit/Appeal buttons, score transparency panel with full rules (+0.1 / +0.3 / +5 / -0.5 / -5) and threshold warning copy.

### G2. Settings

```
Read: apps/mobile/app/settings/index.tsx
Read: apps/mobile/app/edit-profile/index.tsx
```

Confirm existing. Gaps: avatar upload, email field, tier/creator badges row under avatar, Content Interests card (selected + suggested), Language & Content card (content + app), Eru Account stats card (lifetime/redeemed/content/streak/since), Linked Accounts card (Google/Phone/Instagram), Delete Account with 30-day grace.

### G3. Leaderboard

```
Read: apps/mobile/app/leaderboard/index.tsx
Read: apps/mobile/components/LeaderboardPodium.tsx
Read: apps/mobile/components/LeaderboardScopeTabs.tsx
Read: apps/mobile/components/WeeklyQuestsCard.tsx
Read: apps/mobile/components/QuestRow.tsx
Read: apps/mobile/components/BadgeGrid.tsx
Read: apps/mobile/components/SpinWheel.tsx
```

Confirm existing. Gaps: season prize tiles (Grand/Runner-Up/Weekly), podium bar variable heights, quest row progress bars with exact copy, Daily Spin tile with "SPIN NOW!" button, Badges grid with 5/12 unlocked count.

### G4. API routes

```
Grep: pattern="app\\.get\\|app\\.post" path=apps/api/src/routes/leaderboard.ts
Grep: pattern="app\\.get" path=apps/api/src/routes/quests.ts
Grep: pattern="app\\.post" path=apps/api/src/routes/spin.ts
```

Confirm existing. If the season endpoint doesn't return prize breakdown, extend in F4.

---

# Feature 1 — My Content engagement + declined actions

**Goal:** `app/my-content/index.tsx` matches PWA lines 854–1030 for the 3 panels and their content rows.

### Task 1.1: Content-list rows include engagement metrics

- [ ] RED in `apps/api/tests/routes/users-content.test.ts` (extend):

```ts
it('content list rows include likeCount, dislikeCount, commentCount, and pointsEarned per post', async () => {
  // seed content w/ interactions; assert response rows include all 4 metrics
});
```

- [ ] GREEN: the feed/content list already counts these (Content schema has them). Just include them in the response shape. Lockdown shared type.
- [ ] Commit.

### Task 1.2: ModerationBadge component

- [ ] RED: renders `⏳ REVIEW` (gold) / `✓ LIVE` (green) / `✕ DECLINED` (red) per PWA classes. Accessibility label reflects status.
- [ ] GREEN.
- [ ] Commit.

### Task 1.3: Content list rows with engagement chips

- [ ] RED:

```tsx
it('published row shows "234 👍 • 3 👎 • 45 💬 • +30 pts"', () => { /* ... */ });
it('trending row highlights orange "🔥 TRENDING +200"', () => { /* ... */ });
it('declined row shows red reason text and Edit & Resubmit + Appeal buttons', () => { /* ... */ });
```

- [ ] GREEN: update `app/my-content/index.tsx` content-row renderer.
- [ ] Commit.

### Task 1.4: Resubmit endpoint

- [ ] RED in `apps/api/tests/routes/content-resubmit.test.ts`:

```ts
it('POST /content/:id/resubmit moves status back to "pending" and clears decline_reason', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-rs1', phone: '+912000100001', username: 'rs1' });
  const content = await prisma.content.create({
    data: { userId: u.id, type: 'post', moderationStatus: 'declined', declineReason: 'copyright music' },
  });
  const res = await getTestApp().inject({
    method: 'POST',
    url: `/api/v1/content/${content.id}/resubmit`,
    headers: { Authorization: devToken('dev-test-rs1') },
    payload: { text: 'updated version' },
  });
  expect(res.statusCode).toBe(200);
  const after = await prisma.content.findUnique({ where: { id: content.id } });
  expect(after?.moderationStatus).toBe('pending');
  expect(after?.declineReason).toBeNull();
  expect(after?.text).toBe('updated version');
});

it('rejects resubmit when status is not "declined"', async () => { /* ... */ });
```

- [ ] GREEN: add handler. Commit.

### Task 1.5: Resubmit + Appeal buttons wiring

- [ ] RED: Edit & Resubmit navigates to `/(tabs)/create?resubmitId=<id>` which loads the original content fields; Appeal POSTs an appeal event (can stub to `POST /content/:id/appeal` noop logging).
- [ ] GREEN.
- [ ] Commit.

---

# Feature 2 — Creator Score transparency panel

**Goal:** `CreatorScoreCard` matches PWA lines 904–944 exactly.

**PWA reference checklist:**

### Score block (906–919)

- Label `CREATOR SCORE` (10px, 1px letter-spacing)
- Big: `87` (28px, 800, green) + `/ 100` (14px, g500) + `⬆ +3 this week` pill (rgba green tint)
- Sub: `🔥 Influencer tier • Unlocks 1.5x point multiplier`
- Circular conic-gradient ring (72×72) with score percent filled, small emoji center (`🔥` for influencer)

### Thumbs ratio bar (920–931)

- Above: `👍 8,420 likes` (green, 600) — left; `👎 127 dislikes` (red, 600) — right.
- 6px high bar with 98.5% green segment + 1.5% red segment.
- Below: `98.5% positive ratio • Keep it above 90% for tier benefits` (10px, g400).

### Rules panel (933–943) — g50 bg, border-top

- Title: `📊 How your score changes` (11px, 700, g700).
- Horizontal wrap of rule chips (10px each):
  - `👍 Like: +0.1` (green)
  - `💬 Comment: +0.3` (orange)
  - `🔥 Trending: +5` (gold)
  - `👎 Dislike: -0.5` (red)
  - `🚫 Report: -5` (red)

### Task 2.1: Creator score endpoint response shape

- [ ] RED: `GET /users/me/creator/score` returns `{score, likes, dislikes, ratio, trendWeekly, tier, multiplier}`.
- [ ] GREEN. Lockdown shared type. Commit.

### Task 2.2: CreatorScoreCard rewrite

- [ ] RED in `__tests__/components/CreatorScoreCard.test.tsx`:

```tsx
it('renders score 87 with "/ 100" and +3 this week delta pill', () => { /* ... */ });
it('renders ratio bar with 98.5% positive segment', () => { /* ... */ });
it('renders 5 rule chips with exact copy and colors', () => { /* ... */ });
it('renders threshold warning copy when ratio < 90%', () => { /* ... */ });
it('renders threshold warning text changes when score < 70', () => { /* ... */ });
```

- [ ] GREEN by rewriting the component.
- [ ] Commit.

### Task 2.3: Threshold warning copy

Per Dev Spec §4.2:

| Score | Copy |
|---|---|
| > 95 | `🚀 Priority moderation + top business search` (green) |
| 90–95 | (default copy — keep it above 90% for tier benefits) |
| 70–90 | `⚠️ Keep it above 90% for tier benefits` (amber) |
| < 70 | `⬇️ Score low — tier downgrade risk` (red) |
| < 50 | `⚠️ Score too low — feed visibility reduced` (red) |

- [ ] RED: copy changes per score range.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 3 — Settings 7 cards

**Goal:** `app/settings/index.tsx` matches PWA lines 1781–2017.

### Task 3.1: Avatar section

- [ ] RED: avatar (88×88, orange border), name, `@username`, 3 chip row `🔥 Influencer`, `✍️ Creator`, `Joined Mar '26`.
- [ ] RED: camera overlay button opens `expo-image-picker`; on success, uploads via `mediaService` and updates `user.avatarUrl` via `PUT /users/me/settings`.
- [ ] GREEN.
- [ ] Commit.

### Task 3.2: Personal Details card

- [ ] RED: 5 rows — Full Name, Email, Phone, Date of Birth, Gender (3 radio pills Male/Female/Other).
- [ ] GREEN.
- [ ] Commit.

### Task 3.3: Location & Pincode card

- [ ] RED: Primary Pincode (color-highlighted: orange tint + orange border, with `Change` link), Secondary Pincodes as chip list with ✕ remove + `+ Add Pincode`, Auto-detect toggle.
- [ ] GREEN.
- [ ] Commit.

### Task 3.4: Content Interests card

- [ ] RED: `Selected Interests (tap to remove)` section with chips colored by interest accent + ✕; `Suggested (tap to add)` section with gray-outlined chips + `+`.
- [ ] GREEN.
- [ ] Commit.

### Task 3.5: Language & Content card

- [ ] RED: Content languages multi-select (reuse Personalize constants), App Language single-select dropdown.
- [ ] GREEN.
- [ ] Commit.

### Task 3.6: Notifications & Privacy card

- [ ] RED: 4 toggle rows — Push Notifications / Email Digests / Private Account / Share data with brands. Each shows title + sub-caption matching PWA. Initial states from `user.settings`.
- [ ] GREEN.
- [ ] Commit.

### Task 3.7: Eru Account stats card

- [ ] RED: read-only rows — Tier / Lifetime Points / Points Redeemed / Content Created / Current Streak / Member Since.
- [ ] GREEN: endpoint exists via wallet + profile combo — consider a `GET /users/me/settings/stats` aggregate if not present.
- [ ] Commit.

### Task 3.8: Linked Accounts card

- [ ] RED: rows for Google (Connected ✓ or Link →), Phone (Verified ✓), Instagram (Link →). Per `DeferredWork/DWSet1.md`, Linked Accounts OAuth stays deferred — the card shows read-only state only; tapping "Link" opens a DWSet1-linked modal explaining "coming soon."
- [ ] GREEN.
- [ ] Commit.

### Task 3.9: Danger zone + Delete Account

- [ ] RED: `Log Out` (red text link) calls `authStore.logout()`. `Delete Account` shows 2-step confirmation modal: first "Are you sure?", then "Type DELETE to confirm" — on confirm, calls `DELETE /users/me/account` which schedules deletion 30 days out per DPDPA.
- [ ] RED in `apps/api/tests/routes/users-delete.test.ts`:

```ts
it('DELETE /users/me/account sets deletedAt in 30 days', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-da1', phone: '+912000100010', username: 'da1' });
  const before = new Date();
  const res = await getTestApp().inject({
    method: 'DELETE',
    url: '/api/v1/users/me/account',
    headers: { Authorization: devToken('dev-test-da1') },
  });
  expect(res.statusCode).toBe(200);
  const refreshed = await prisma.user.findUnique({ where: { id: u.id } });
  expect(refreshed?.deletedAt).toBeTruthy();
  const deltaDays = (refreshed!.deletedAt!.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
  expect(deltaDays).toBeGreaterThan(29);
  expect(deltaDays).toBeLessThan(31);
});

it('undelete endpoint cancels the pending deletion within the grace period', async () => { /* ... */ });
```

- [ ] GREEN. Commit.

---

# Feature 4 — Leaderboard season prizes

**Goal:** `app/leaderboard/index.tsx` season banner matches PWA lines 2038–2068.

### Task 4.1: Season endpoint includes prizes

- [ ] Confirm `GET /api/v1/season/current` returns:

```ts
interface SeasonResponse {
  id: string;
  name: string;             // "Monsoon Champions"
  theme: string | null;     // "Monsoon Champions" lowercase narrative
  startsAt: string;
  endsAt: string;
  daysRemaining: number;    // pre-computed per lockdown
  prizes: Array<{
    tier: 'grand' | 'runner_up' | 'weekly';
    emoji: string;
    title: string;          // "iPhone 16"
    description: string;    // "Draw entry for Top 100"
  }>;
}
```

- [ ] If `prizes` missing on the current shape: extend shared type + handler.
- [ ] Commit.

### Task 4.2: Season banner

- [ ] RED: banner renders season name + `Season 2 • April 2026` label + 3 prize tiles in a row + `Season ends May 31 • N days left` footer.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 5 — Leaderboard podium + your-position + list

### Task 5.1: Your position card

- [ ] RED: renders `#4` rank + avatar + username + pincode + `X pts this week` — orange border highlighting. Only shows when current user is ranked in-scope.
- [ ] GREEN.
- [ ] Commit.

### Task 5.2: Top-3 podium

- [ ] RED: 3-column podium. Each column has avatar (46 for 2nd/3rd, 54 for 1st), name + pts, variable-height colored bar (70px gold for 1st, 50px silver for 2nd, 38px bronze for 3rd). 1st column has 👑 emoji above avatar.
- [ ] GREEN.
- [ ] Commit.

### Task 5.3: Remaining rankings list

- [ ] RED: rows 4..N render with rank, avatar, username, tier badge emoji + `N d streak`, pts right-aligned. Your row has orange tint bg.
- [ ] GREEN.
- [ ] Commit.

### Task 5.4: Scope tabs

- [ ] RED: 4 tabs `📍 My Pincode` / `🗺️ Kerala State` / `🇮🇳 All India` / `👥 Friends`. Selected is purple filled.
- [ ] RED: switching refetches with `?scope=<pincode|state|all_india|friends>`.
- [ ] GREEN.
- [ ] Commit.

---

# Feature 6 — Weekly Quests full UI

### Task 6.1: Quest response shape

- [ ] Verify `GET /quests/weekly` returns per quest: `{id, title, emoji, progress, target, pointsOnComplete, completed}`.
- [ ] Lockdown shared type.

### Task 6.2: QuestRow + card

- [ ] RED: Card title `🎯 Weekly Quests` + right `N/5 Complete`. Each QuestRow shows title, status (`✓ Done +25` in green or `7/10` progress with progress bar), bar 100% colored when done.
- [ ] RED: completion-bonus footer: `🎁 Complete all 5 → +100 bonus pts + Leaderboard boost!` (green).
- [ ] GREEN.
- [ ] Commit.

---

# Feature 7 — Daily Spin tile + Badges grid

### Task 7.1: Daily Spin tile

- [ ] RED: 🎰 + `Daily Spin` title + `Win 1–50 pts` + purple-pink gradient button `SPIN NOW! 🎉`. Disabled with `Come back tomorrow` after today's spin.
- [ ] GREEN.
- [ ] Commit.

### Task 7.2: BadgeGrid

- [ ] RED: card title `🏅 Recent Badges` + grid of 7 badge emojis. Unlocked at full opacity, locked at 25% opacity. Footer: `5/12 unlocked` (from badgesService response).
- [ ] GREEN.
- [ ] Commit.

---

## Playwright smoke

Per protocol §5. Capture:

- My Content: stats bar + earnings card + creator-score card with transparency panel + pending panel + published panel w/ engagement chips + declined panel w/ Edit/Appeal.
- Settings: scroll-through of all 7 cards.
- Leaderboard: season banner + podium + your-position + top-8 rankings + weekly quests + spin + badges.

---

## Phase-completion gate

- [ ] My Content: stats bar, creator earnings card, creator-score transparency panel (ratio + rules + threshold warning), engagement chips on rows, Edit/Appeal on declined.
- [ ] `POST /content/:id/resubmit` works; Edit & Resubmit in UI navigates to Create prefilled.
- [ ] Settings: all 7 cards shipped with exact PWA copy.
- [ ] Avatar upload works.
- [ ] `DELETE /users/me/account` sets `deletedAt = now + 30d`; confirmation 2-step UI prevents accidents.
- [ ] Season banner shows prize tiles + days-remaining footer.
- [ ] Podium has variable bar heights (1st 70, 2nd 50, 3rd 38) and 👑 over 1st.
- [ ] 4 scope tabs switch the list correctly.
- [ ] Weekly Quests card lists 5 quests w/ progress bars and completion-bonus footer.
- [ ] Daily Spin tile routes to spin flow.
- [ ] Badges grid shows 5/12 pattern with locked-badge opacity.
- [ ] `ALLOW_DEV_TOKENS=true npm test` green in `apps/api`.
- [ ] `npm test` green in `apps/mobile`.
- [ ] `npx tsc --noEmit` clean in both workspaces.
- [ ] Playwright screenshots attached.
- [ ] Commits scoped per protocol §7.

---

## What could go wrong

- **Score delta weekly vs. lifetime** — `trendWeekly` must be computed from a 7-day rolling window, not lifetime. Use `pointsLedger` where `action_type IN (score-affecting actions)`.
- **Avatar upload race** — user taps upload, immediately taps Save, returning URL is stale. Wait for upload to finish before allowing Save.
- **Delete-account with active pending proposals** — block or warn? Policy: allow delete, but mark pending proposals as `status='cancelled'` + notify the business. Cover in a test.
- **Season prize copy localization** — PWA shows `₹200 Card`; use user's currency setting when it exists (future — not now). For now, always show in INR.
- **Scope=Friends when the user follows no one** — return `{items: [], rankMe: null}` cleanly; screen shows an empty state encouraging user to follow creators.
- **Spin daily reset timezone** — IST (Asia/Kolkata) — same as `openNow` rule in P9.
- **Badges list too long** — PWA shows 7 visible, 5 unlocked. If the user has more, cap at 7 visible with "+N more" chip. Document in the spec.

---

## End of P4–P10

You've shipped pixel parity. Celebrate with a Playwright montage — screenshot every screen, compile into a README image board, paste into the final PR description. Then open `README_P4_P10.md` and update status to `Complete`.

The next plan (if any) would be:

- **Business Dashboard** parity — from `Eru_Business_Dashboard.html` (separate plan).
- **Partner integrations** — MediaConvert subscription (see deferred in protocol §10), mobile-recharge operator API, gift-card partner fulfillment.
- **Observability** — Sentry wiring (per Dev Spec §7), Mixpanel event catalog.
- **Anonymous browsing mode** — viewing storefronts without auth.

None of those are P10's responsibility. They're starting points for the plan after this one.
