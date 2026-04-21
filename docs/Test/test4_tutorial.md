# Test 4 — Tutorial (How You Earn)

**Route:** `/(auth)/tutorial`
**Mobile source:** `apps/mobile/app/(auth)/tutorial.tsx`
**PWA reference:** `Eru_Consumer_PWA.html` lines 437-483
**Screenshot:** `docs/pwa-screenshots/04-tutorial.png`

## Visual parity

### Header
- [ ] Back arrow `←` (left), title `How You Earn` (centre, 16px/800, g800), `Skip` (right, 12px/600, blue).
- [ ] 14px horizontal padding, top padding 4, bottom 10, bottom border 0.5 g100.

### Progress steps
- [ ] `<ProgressSteps current={4} total={4} caption="Step 4 of 4 • 193 pts/day average" />`.
- [ ] All 4 segments filled (green for 1-3, orange for 4).

### Welcome bonus banner
- [ ] Purple gradient card at top of body (`#1E1145` solid bg, 16px radius, 16px padding, centre-aligned):
  - [ ] Tiny label `WELCOME BONUS` (orange, 10px, 2 letter-spacing, 700-weight).
  - [ ] Big number row: `+250` (42px, 800, white) + `pts` (16px, orange, 600, baseline-aligned).
  - [ ] Sub-line: `= ₹2.50 already in your wallet! 🎉` (rgba white 70%, 11px).

### Section heading
- [ ] `🪙 25 ways to earn every day` (13px, 700, g800, 10px bottom margin).

### 5 earning category cards
Each card: 12px radius, 0.5px g200 border, overflow-hidden, 8px bottom margin, white bg.

Card head: 14px horizontal padding, 10px vertical, row layout (emoji+label left, cap right), 0.5px bottom border.
Card body: 14px horizontal padding, 10px vertical, bullets text (11px, g600, 17 line-height).

- [ ] **Card 1 — Consume Content (teal)**
  - [ ] Head: 📖 emoji (18px) + label `Consume Content` (13px, 700, teal color), cap `up to 170 pts/day` (11px, g500).
  - [ ] Head bg: rgba teal 5%, border-bottom rgba teal 10%.
  - [ ] Body bullets: `Read article (+4) • Watch video (+6) • View reel (+3) • Listen podcast (+5) • Read thread (+3)`.

- [ ] **Card 2 — Engage (orange)**
  - [ ] Head: 💬 emoji + label `Engage` orange, cap `up to 140 pts/day`.
  - [ ] Body: `Like (+1) • Comment (+3) • Share (+2) • Save (+1) • Follow (+2)`.

- [ ] **Card 3 — Give Opinions (purple)**
  - [ ] Head: 📊 emoji + label `Give Opinions` purple, cap `up to 200 pts/day`.
  - [ ] Body: `Vote poll (+5) • Short survey (+15) • Long survey (+40) • Review (+10) • Rate biz (+5)`.

- [ ] **Card 4 — Shop & Claim (green)**
  - [ ] Head: 🛒 emoji + label `Shop & Claim` green, cap `up to 130 pts/day`.
  - [ ] Body: `View sponsored (+2) • Click CTA (+5) • Claim offer (+10) • Redeem QR (+25) • Purchase (+15)`.

- [ ] **Card 5 — Big Wins (gold)**
  - [ ] Head: 🚀 emoji + label `Big Wins` gold, cap `bonus boosts`.
  - [ ] Body: `Refer friend (+100) • Create post (+30) • Trending (+200) • Daily check-in (+25)`.

### Tier teaser card
- [ ] Below earning cards: orange-tinted card (rgba 6% bg, 1px border rgba 20%, 12px radius, 14px padding, 8px top margin, 14px bottom).
- [ ] Title `🔥 Level up your earnings` (12px, 700, orange, 6px bottom margin).
- [ ] Body: `Explorer 1.0x → Engager 1.2x → Influencer 1.5x → Champion 2.0x. The more you engage, the faster you earn.` (11px, g600, 17 line-height).

### Primary CTA
- [ ] Button `Start Earning 🚀` (orange bg, white 15px/700, 15px padding vertical, 12 radius).

### Footer hint
- [ ] Small centre text: `Your first login earns you +25 pts (daily check-in)`.
- [ ] 10px, g400, centred, 10px top margin.

## Functional behaviour

### On mount
- [ ] No API call fired.

### Skip tap
- [ ] Fires same handler as `Start Earning 🚀` (skip = complete).
- [ ] Sets `setOnboardingComplete(true)` locally.
- [ ] Fires `authService.completeOnboarding()` fire-and-forget.
- [ ] `router.replace('/(tabs)')`.

### Start Earning CTA tap
- [ ] Sets `setOnboardingComplete(true)` immediately.
- [ ] Calls `POST /users/me/onboarding/complete` (fire-and-forget; UI doesn't wait).
- [ ] Server credits +250 welcome_bonus + +25 daily_checkin = +275 total.
- [ ] Server is idempotent: second call returns `{pointsCredited: 0}`.
- [ ] `router.replace('/(tabs)')`.

### Back button
- [ ] Returns to personalize screen; selections persisted locally (see test 3).

## Edge cases

- [ ] User starts Start Earning while offline → local flag set → `/(tabs)` renders but wallet shows 0 until online retry.
- [ ] User already onboarded arrives here → can still tap Start; server idempotency returns 0 credit; no double-pay.
- [ ] Welcome bonus banner never shows `+250 pts` after onboarding completes (screen is left during onboarding only).
- [ ] Long card body (future addition) → body text wraps without breaking card radius.
- [ ] RTL language user → text flows right-to-left correctly (Malayalam/Hindi selected earlier).

## Notes for Playwright web run

- All visual items testable on web (LinearGradient + borders render via react-native-web).
- Functional: confirm `POST /users/me/onboarding/complete` fires via `browser_network_requests` after tapping Start.
- Verify redirect to `/(tabs)` by inspecting `location.pathname` post-tap.
