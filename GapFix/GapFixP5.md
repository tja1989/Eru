# GapFix P5 — Phase 1: Onboarding (4 screens)

> **For agentic workers:** Required reading: [`GapFix_Agent_Protocol.md`](./GapFix_Agent_Protocol.md). P4 must be green. This phase brings `welcome`, `otp`, `personalize`, and `tutorial` to pixel parity with PWA lines 255–482 and Dev Spec §2.1.

**Goal:** A new user can progress welcome → otp → personalize → tutorial, with every UI element (gradient backgrounds, progress bars, WhatsApp callout, 15 interest pills, 5 languages, welcome bonus, 5 earning categories, tier teaser) matching the PWA, and API calls landing on locked contracts.

**Architecture:** Mostly mobile. API already has `auth.ts`, `whatsapp-otp.ts`, and `users.ts` endpoints. P5 annotates their responses to `@eru/shared` (finishing the lockdown work P4 started for these routes) and polishes field semantics (progress step return, resend countdown, welcome bonus credit).

---

## The hotel-check-in analogy

A guest arriving at a hotel goes through four steps before reaching their room: doorman greeting (welcome), front-desk ID verification (otp), preference intake ("any allergies? low floor?" — personalize), and orientation tour ("breakfast is in the east wing, gym on 3" — tutorial). If any step has a broken light bulb, confusing signage, or a clipboard with a typo, the guest's first impression is tainted and they tell their friends. P5 is getting every one of those four stations looking and feeling exactly like the brochure promised.

---

## Feature inventory

| # | Screen | PWA lines | Dev Spec § | Priority within P5 |
|---|--------|-----------|------------|--------------------|
| 1 | welcome | 255–290 | 2.1 S1 | P5a |
| 2 | otp | 293–338 | 2.1 S2 | P5a |
| 3 | personalize | 341–405 | 2.1 S3 | P5b |
| 4 | tutorial | 408–482 | 2.1 S4 | P5b |
| 5 | Auth response shape lockdown | — | §6 | P5c |
| 6 | Welcome-bonus credit + +25 check-in | — | 2.1 S4 Dev Notes | P5c |

Sub-groupings:

- **P5a** — acquisition: welcome + otp
- **P5b** — setup: personalize + tutorial
- **P5c** — data: auth lockdown + welcome bonus

---

## Prerequisites

- [ ] P4 green (per `GapFixP4.md` §Phase-completion gate).
- [ ] `packages/shared/src/types/auth.ts` exists (create in P4 Feature 5 if not).
- [ ] `packages/shared/src/types/user.ts` has `OnboardingPayload` and `OnboardingResponse` types.
- [ ] WhatsApp OTP service already stubbed in `routes/whatsapp-otp.ts` (verify — if no, extend P4 Feature 5 to include it).

---

## Existing-implementation audit (RUN FIRST)

### B1. Existing onboarding mobile screens

```
Read: apps/mobile/app/(auth)/welcome.tsx
Read: apps/mobile/app/(auth)/otp.tsx
Read: apps/mobile/app/(auth)/login.tsx
Read: apps/mobile/app/(auth)/personalize.tsx
Read: apps/mobile/app/(auth)/tutorial.tsx
```

Expected: all five files exist (they were created in P3 per `GapFix/GapFixP3.md` Feature 1). Note which visual elements already exist vs. what's missing — record in the PR description so Feature sections below can cross-reference.

### B2. Existing auth API

```
Grep: pattern="app.post|app.get" path=apps/api/src/routes/auth.ts
Grep: pattern="app.post|app.get" path=apps/api/src/routes/whatsapp-otp.ts
```

Expected: `POST /api/v1/auth/send-otp` (or equivalent), `POST /auth/verify-otp`, `POST /whatsapp/send`, `POST /whatsapp/verify`.

### B3. Onboarding endpoint

```
Grep: pattern="onboarding|complete" path=apps/api/src/routes/users.ts
```

Expected: some `POST /users/me/onboarding` or `PUT /users/me/settings` that accepts pincode + interests + languages. If missing, add in Feature 5 below.

### B4. Points bonus endpoint

```
Grep: pattern="welcome_bonus|daily_checkin" path=apps/api/src/services/pointsEngine.ts
```

Expected: `daily_checkin` present (used in `apps/mobile/app/(tabs)/index.tsx` already). Look for `welcome_bonus` action; add if missing per P4 Feature 6.

---

# Feature 1 — Welcome screen (pixel parity)

**Goal:** `app/(auth)/welcome.tsx` matches PWA lines 255–290 exactly.

**PWA reference checklist** (what to render):

- Full-screen linear gradient (160deg, `#1E1145` 0% → `#2D1B69` 40% → `#E8792B` 150%).
- Frosted-glass 72×72 square containing "E" (Georgia italic, 42px, white).
- Tagline (11px, orange, letter-spacing 4px, uppercase): `Consume. Earn. Connect.`
- Headline (32px, 800, white): `Your attention has value.` — the phrase "has value." must be Georgia italic + orange.
- Sub-tagline (14px, rgba(255,255,255,0.75)): `India's first super content app where every scroll, share, and review earns you real rewards.`
- Three value-prop cards (glass, 12px radius), each with 36×36 icon tile, title, body:
  - 🪙 Earn real rewards — "25 earning actions. 193 pts/day avg."
  - 🎁 Redeem locally — "500+ partner stores. Free coffee, discounts, gifts."
  - ✍️ Create & get paid — "Tag businesses, earn 20% commission on boosted posts."
- Primary button (orange, full-width, 14px padding): `Get Started →` → `/(auth)/otp`
- Secondary button (glass, outlined white 20%): `I already have an account` → `/(auth)/otp`
- Footer (10px, white 40%): `🇮🇳 Made in Kerala • 500 pincodes live`

**Dev Spec reference:** §2.1 Screen 1. "After onboarding complete, app launches directly to Home Feed on subsequent opens."

**Files:**

- Modify: `apps/mobile/app/(auth)/welcome.tsx`
- Modify: `apps/mobile/__tests__/screens/welcome.test.tsx` (exists from P3 — extend)
- Create if missing: `apps/mobile/components/GradientBackground.tsx` (reusable)
- Modify: `apps/mobile/app/_layout.tsx` — persist `hasCompletedOnboarding` flag so returning users skip welcome

### Task 1.1: Extend failing tests

- [ ] **Step 1: RED**

Add to `apps/mobile/__tests__/screens/welcome.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import Welcome from '@/app/(auth)/welcome';

describe('<Welcome /> pixel-parity (P5)', () => {
  it('renders the Consume. Earn. Connect. tagline', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/consume\..*earn\..*connect\./i)).toBeTruthy();
  });

  it('renders the exact 3 value-prop titles and subtitles', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText('Earn real rewards')).toBeTruthy();
    expect(getByText(/25 earning actions.*193 pts\/day avg\./i)).toBeTruthy();
    expect(getByText('Redeem locally')).toBeTruthy();
    expect(getByText(/500\+ partner stores/i)).toBeTruthy();
    expect(getByText('Create & get paid')).toBeTruthy();
    expect(getByText(/20% commission on boosted posts/i)).toBeTruthy();
  });

  it('renders the Kerala + pincode count footer', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/Made in Kerala.*500 pincodes live/i)).toBeTruthy();
  });

  it('primary CTA routes to /(auth)/otp', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, replace: jest.fn() });
    const { getByText } = render(<Welcome />);
    require('@testing-library/react-native').fireEvent.press(getByText(/get started/i));
    expect(push).toHaveBeenCalledWith('/(auth)/otp');
  });
});
```

- [ ] **Step 2: Verify RED**

```
cd apps/mobile && npm test -- welcome
```

Several new assertions fail. That's the signal.

### Task 1.2: Implement to GREEN

- [ ] Rewrite `app/(auth)/welcome.tsx` to match PWA exactly. Use `LinearGradient` from `expo-linear-gradient` (already in dependencies from P0). Text strings must match the reference checklist character-for-character.
- [ ] Verify GREEN.
- [ ] Commit:

```
feat(mobile): welcome screen pixel-parity with PWA + P5 copy lockdown
```

### Task 1.3: Returning-user skip

- [ ] RED test: add to `__tests__/app/root-layout.test.tsx` — assert that if `authStore.hasCompletedOnboarding === true`, user navigates directly to `/(tabs)` on app boot, bypassing welcome.
- [ ] GREEN in `app/_layout.tsx`.
- [ ] Commit:

```
feat(mobile): skip onboarding when hasCompletedOnboarding flag is true
```

---

# Feature 2 — OTP screen (pixel parity)

**Goal:** `app/(auth)/otp.tsx` matches PWA lines 293–338.

**PWA reference checklist:**

- Header (white card, border-bottom): back arrow (→ `/welcome`), title `Verify Phone`, right spacer.
- Progress bar: 4 segments, first orange, rest `var(--g200)`. Caption `Step 1 of 4`.
- H2 (22px, 800, g800): `Your mobile number`.
- Help text: `We'll send a one-time password to verify`.
- Phone row: `+91 🇮🇳` chip + tel input (e.g., placeholder `98432 15678`).
- WhatsApp toggle row (rgba green background):
  - Switch (on by default, green when on).
  - Label: `Send via WhatsApp`
  - Caption: `Faster delivery. No SMS needed.`
- Divider: dashed top border.
- OTP section:
  - Label: `Enter 6-digit code`
  - 6 boxed number inputs (46×54, navy border, rgba navy 0.04 bg) — auto-advance on digit entry, auto-focus previous on backspace.
  - Resend counter: `Didn't receive? Resend in 18s` — clickable after 30s.
- Primary button (navy, full-width): `Verify & Continue →` → `/(auth)/personalize`.
- Terms/Privacy disclosure: 10px, g400: `By continuing you agree to Eru's Terms and Privacy Policy. We never share your number with advertisers.`

**Dev Spec reference:** §2.1 Screen 2. WhatsApp OTP via Gupshup/Twilio, 99% delivery in Kerala. `isNewUser` flag from `verify-otp` response determines Personalize vs Home skip. JWT 15min / refresh 7d.

**Files:**

- Modify: `apps/mobile/app/(auth)/otp.tsx`
- Modify: `apps/mobile/app/(auth)/login.tsx` (merge or redirect — P0 currently has both; reconcile)
- Modify: `apps/mobile/__tests__/screens/otp.test.tsx`
- Modify: `apps/mobile/services/authService.ts` — ensure `sendOtp({phone, method})` and `verifyOtp({phone, code})` return types use `@eru/shared` (P4 F5).
- Create: `apps/mobile/components/ProgressSteps.tsx` — 4-segment bar reused by personalize + tutorial.

### Task 2.1: ProgressSteps component

- [ ] RED test (`__tests__/components/ProgressSteps.test.tsx`):

```tsx
it('renders 4 segments with the correct one active', () => {
  const { UNSAFE_getAllByType } = render(<ProgressSteps current={2} total={4} />);
  const segments = UNSAFE_getAllByType(View).filter(/* segments */);
  expect(segments[1].props.style).toEqual(expect.objectContaining({ backgroundColor: '#E8792B' }));
});
```

- [ ] GREEN: tiny component, renders N-segment bar.
- [ ] Commit: `feat(mobile): ProgressSteps component for onboarding`

### Task 2.2: OTP screen pixel parity

- [ ] RED tests (extend `otp.test.tsx`):

```tsx
it('shows "Step 1 of 4" progress label', () => {
  expect(render(<Otp />).getByText(/Step 1 of 4/i)).toBeTruthy();
});

it('WhatsApp toggle defaults ON and displays the 99% delivery callout', () => {
  const { getByLabelText, getByText } = render(<Otp />);
  expect(getByLabelText('Send via WhatsApp')).toHaveProp('value', true);
  expect(getByText(/Faster delivery.*No SMS needed\./i)).toBeTruthy();
});

it('6 OTP boxes auto-advance on digit entry', async () => {
  const { getAllByPlaceholderText } = render(<Otp />);
  const boxes = getAllByPlaceholderText('');
  expect(boxes).toHaveLength(6);
  // simulate typing "2"
  fireEvent.changeText(boxes[0], '2');
  // assert boxes[1] gained focus — check via a test helper
});

it('resend link is disabled while countdown > 0 and shows remaining seconds', () => {
  jest.useFakeTimers();
  const { getByText } = render(<Otp />);
  expect(getByText(/Resend in 30s/)).toBeTruthy();
  jest.advanceTimersByTime(10000);
  expect(getByText(/Resend in 20s/)).toBeTruthy();
});

it('Verify & Continue navigates to /personalize when isNewUser=true', async () => {
  (authService.verifyOtp as jest.Mock).mockResolvedValue({ token: 't', isNewUser: true });
  const push = jest.fn();
  jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, replace: jest.fn() });
  const { getByText } = render(<Otp />);
  fireEvent.press(getByText(/Verify & Continue/i));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/(auth)/personalize'));
});

it('Verify & Continue navigates to /(tabs) when isNewUser=false', async () => {
  (authService.verifyOtp as jest.Mock).mockResolvedValue({ token: 't', isNewUser: false });
  // ... similar
});
```

- [ ] GREEN.
- [ ] Commit: `feat(mobile): OTP screen pixel-parity + WhatsApp toggle callout + 30s resend timer`

### Task 2.3: Auth service lockdown

- [ ] Ensure `packages/shared/src/types/auth.ts` exports:

```ts
export interface SendOtpRequest {
  phone: string;
  method: 'whatsapp' | 'sms';
}
export interface SendOtpResponse {
  sent: true;
  expiresInSeconds: number;
}
export interface VerifyOtpRequest {
  phone: string;
  code: string;
}
export interface VerifyOtpResponse {
  token: string;
  refreshToken: string;
  isNewUser: boolean;
}
```

- [ ] RED: `apps/api/tests/routes/auth.test.ts` — assert response shapes.
- [ ] GREEN: annotate `routes/auth.ts` handlers `async (): Promise<VerifyOtpResponse> => {...}`.
- [ ] RED: `apps/mobile/__tests__/services/authService.test.ts` — assert the service returns the shared types.
- [ ] GREEN: annotate mobile service.
- [ ] Commit: `feat(shared): lockdown auth send-otp + verify-otp response types`

---

# Feature 3 — Personalize screen (pixel parity)

**Goal:** `app/(auth)/personalize.tsx` matches PWA lines 341–405.

**PWA reference checklist:**

- Header with back (→ otp), title `Personalize`, top-right `Skip` (blue).
- Progress bar: Step 2 of 4 (first 2 green, 3rd orange, 4th grey).
- Caption: `Step 2 of 4 • Tell us what you love`.
- Location section:
  - Teal-outlined card with 📍 tile, pincode + area name (e.g., `682016 • Ernakulam Central`), sub-text (`Auto-detected via GPS • 12,000 Eru users here`), right-align `Change` link.
- Interest section:
  - Title: `🎯 Pick 5+ interests`.
  - Sub: `Personalises your feed. Earn 2x points on matched content.`
  - **Exactly these 15 pills** (PWA lines 371–387; mobile current list differs — replace):
    - 🍜 Food, 💻 Tech, ✈️ Travel, 📚 Books, 🏋️ Fitness, 🎬 Cinema, 🎵 Music, 🏏 Cricket, 📷 Photography, 🎨 Art, 🏡 Lifestyle, 💰 Finance, 👗 Fashion, 🎮 Gaming, 🧘 Wellness.
  - Selected pills use the category's accent color per PWA CSS; unselected are gray outlined.
  - When exactly 5+ selected, show: `✓ N selected — unlocks +50 pts`.
- Language section:
  - Title: `🌐 Content languages`.
  - Sub: `Select all languages you read or watch`.
  - **Exactly these 5 pills** (PWA lines 395–399): English, മലയാളം, हिन्दी, தமிழ், ಕನ್ನಡ. Multi-select.
- Primary button: `Next: How You Earn →` → `/(auth)/tutorial`.

**Dev Spec reference:** §2.1 Screen 3. `POST /api/v1/user/onboarding {pincode, interests[], languages[]}`. `GET /api/v1/pincodes/detect?lat&lng` returns `{pincode, areaName, userCount}`. +50 pts credited on completion.

**Files:**

- Modify: `apps/mobile/app/(auth)/personalize.tsx`
- Modify: `apps/mobile/__tests__/screens/personalize.test.tsx`
- Modify: `apps/mobile/services/userService.ts` (lockdown `saveOnboarding`)
- Modify: `apps/api/src/routes/users.ts` (lockdown `POST /onboarding`)
- Modify: `apps/api/src/routes/locations.ts` (lockdown `GET /pincodes/detect`)
- Modify: `packages/shared/src/types/user.ts` (add `OnboardingPayload`, `OnboardingResponse`)

### Task 3.1: Interest + language constants

- [ ] Create `packages/shared/src/constants/onboarding.ts`:

```ts
export const INTERESTS = [
  { key: 'food', label: 'Food', emoji: '🍜', color: '#E8792B' },
  { key: 'tech', label: 'Tech', emoji: '💻', color: '#2563EB' },
  { key: 'travel', label: 'Travel', emoji: '✈️', color: '#0D9488' },
  { key: 'books', label: 'Books', emoji: '📚', color: '#7C3AED' },
  { key: 'fitness', label: 'Fitness', emoji: '🏋️', color: '#10B981' },
  { key: 'cinema', label: 'Cinema', emoji: '🎬', color: '#EC4899' },
  { key: 'music', label: 'Music', emoji: '🎵', color: '#737373' },
  { key: 'cricket', label: 'Cricket', emoji: '🏏', color: '#737373' },
  { key: 'photography', label: 'Photography', emoji: '📷', color: '#737373' },
  { key: 'art', label: 'Art', emoji: '🎨', color: '#737373' },
  { key: 'lifestyle', label: 'Lifestyle', emoji: '🏡', color: '#737373' },
  { key: 'finance', label: 'Finance', emoji: '💰', color: '#737373' },
  { key: 'fashion', label: 'Fashion', emoji: '👗', color: '#737373' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮', color: '#737373' },
  { key: 'wellness', label: 'Wellness', emoji: '🧘', color: '#737373' },
] as const;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
] as const;
```

- [ ] Export from `packages/shared/src/index.ts`.
- [ ] Commit: `feat(shared): INTERESTS(15) + LANGUAGES(5) constants matching PWA`.

### Task 3.2: Personalize pixel parity tests

- [ ] RED:

```tsx
it('renders all 15 interest pills with exact labels', () => {
  const { getByText } = render(<Personalize />);
  ['Food','Tech','Travel','Books','Fitness','Cinema','Music','Cricket','Photography','Art','Lifestyle','Finance','Fashion','Gaming','Wellness']
    .forEach((label) => expect(getByText(new RegExp(label))).toBeTruthy());
});

it('renders all 5 language pills in the exact order', () => {
  const { getAllByRole } = render(<Personalize />);
  // Query by accessibilityLabel=language-pill, assert their labels are [English, മലയാളം, हिन्दी, தமிழ், ಕನ್ನಡ] in order.
});

it('shows "+50 pts" bonus badge when exactly 5 interests selected', () => { /* ... */ });

it('shows "auto-detected" GPS state with user count when pincode present', () => { /* ... */ });

it('Next button is disabled until pincode + 5 interests + 1 language selected', () => { /* ... */ });

it('POST /user/onboarding is called with {pincode, interests[], languages[]} on Next', async () => { /* ... */ });
```

- [ ] GREEN: rewrite screen using `INTERESTS` / `LANGUAGES` constants.
- [ ] Commit: `feat(mobile): personalize pixel-parity — 15 interests, 5 languages, exact copy`.

### Task 3.3: Onboarding API lockdown

- [ ] `packages/shared/src/types/user.ts`:

```ts
export interface OnboardingPayload {
  primaryPincode: string;
  interests: string[];
  contentLanguages: string[];
}
export interface OnboardingResponse {
  user: UserProfile;
  pointsCredited: number;
}
```

- [ ] RED: `apps/api/tests/routes/users-onboarding.test.ts` — POST with full payload, assert +50 credited, response shape matches.
- [ ] GREEN: annotate `routes/users.ts` handler, call `pointsEngine.credit(userId, 'personalize_complete', 50)` on save.
- [ ] RED: `__tests__/services/userService.test.ts` — `saveOnboarding()` returns `OnboardingResponse`.
- [ ] GREEN.
- [ ] Commit: `feat(api): lockdown /users/onboarding + credit +50 pts on completion`.

---

# Feature 4 — Tutorial screen (pixel parity)

**Goal:** `app/(auth)/tutorial.tsx` matches PWA lines 408–482.

**PWA reference checklist:**

- Header with back, title `How You Earn`, right `Skip` (blue) → `/(tabs)`.
- Progress bar: Step 4 of 4 (first 3 green, last orange).
- Caption: `Step 4 of 4 • 193 pts/day average`.
- Welcome bonus banner (purple gradient, rounded 16px):
  - Label: `WELCOME BONUS` (10px, orange, letter-spacing 2px)
  - Value: `+250 pts` (42px, 800, white)
  - Sub: `= ₹2.50 already in your wallet! 🎉`
- Section title: `🪙 25 ways to earn every day`.
- **Five earning category cards** (lightly colored tops, bullets below — exact copy from PWA):
  1. 📖 **Consume Content** — up to 170 pts/day. `Read article (+4) • Watch video (+6) • View reel (+3) • Listen podcast (+5) • Read thread (+3)`
  2. 💬 **Engage** — up to 140 pts/day. `Like (+1) • Comment (+3) • Share (+2) • Save (+1) • Follow (+2)`
  3. 📊 **Give Opinions** — up to 200 pts/day. `Vote poll (+5) • Short survey (+15) • Long survey (+40) • Review (+10) • Rate biz (+5)`
  4. 🛒 **Shop & Claim** — up to 130 pts/day. `View sponsored (+2) • Click CTA (+5) • Claim offer (+10) • Redeem QR (+25) • Purchase (+15)`
  5. 🚀 **Big Wins** — bonus boosts. `Refer friend (+100) • Create post (+30) • Trending (+200) • Daily check-in (+25)`
- Tier teaser card (orange gradient):
  - Title: `🔥 Level up your earnings`
  - Body: `Explorer 1.0x → Engager 1.2x → Influencer 1.5x → Champion 2.0x. The more you engage, the faster you earn.`
- Primary button: `Start Earning 🚀` → calls `POST /user/onboarding/complete` → routes to `/(tabs)`.
- Footer (10px, g400): `Your first login earns you +25 pts (daily check-in)`.

**Dev Spec reference:** §2.1 Screen 4. `POST /api/v1/user/onboarding/complete` credits +250 welcome bonus + +25 daily check-in.

**Files:**

- Modify: `apps/mobile/app/(auth)/tutorial.tsx`
- Modify: `apps/mobile/__tests__/screens/tutorial.test.tsx`
- Modify: `apps/api/src/routes/users.ts` (add `POST /users/me/onboarding/complete`)
- Modify: `apps/api/src/services/pointsEngine.ts` (ensure `welcome_bonus` action exists with +250; daily check-in already exists at +25)

### Task 4.1: Earning categories reference

- [ ] Mirror the P4 §6 25-action table at the bottom of `packages/shared/src/constants/earning.ts` (create if missing) so the tutorial screen can derive copy from data instead of hardcoded strings — this prevents drift when actions change.

### Task 4.2: Tutorial screen tests

- [ ] RED: assert welcome banner `+250 pts`, tier teaser text, all 5 category titles + caps, `Start Earning 🚀` CTA.
- [ ] GREEN.
- [ ] Commit.

### Task 4.3: Onboarding-complete endpoint

- [ ] RED in `apps/api/tests/routes/users-onboarding-complete.test.ts`:

```ts
it('credits +250 welcome + +25 daily check-in; marks onboarding_complete=true; returns updated user', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-oc1', phone: '+912000040001', username: 'oc1', onboardingComplete: false });
  const res = await getTestApp().inject({
    method: 'POST',
    url: '/api/v1/users/me/onboarding/complete',
    headers: { Authorization: devToken('dev-test-oc1') },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.pointsCredited).toBe(275);
  const refreshed = await prisma.user.findUnique({ where: { id: u.id } });
  expect(refreshed?.onboardingComplete).toBe(true);
  const ledger = await prisma.pointsLedger.findMany({ where: { userId: u.id } });
  expect(ledger.map((l) => l.actionType).sort()).toEqual(['daily_checkin', 'welcome_bonus']);
});
```

- [ ] GREEN. Use existing `pointsEngine.credit()`. Wrap both credits in a `prisma.$transaction`.
- [ ] Commit.

---

# Feature 5 — Auth response + onboarding lockdown (consolidation)

Covered in Features 2 + 3 + 4 above. Section exists so the phase-completion gate can point to a single audit: every auth / onboarding / tutorial route should return exactly a `@eru/shared` type by end of P5.

---

# Feature 6 — Welcome-bonus idempotency

**Goal:** Calling `POST /users/me/onboarding/complete` twice does not double-credit.

**Test-first:**

```ts
it('second call is idempotent — does not double-credit', async () => {
  const u = await seedUser({ firebaseUid: 'dev-test-oc2', phone: '+912000040002', username: 'oc2', onboardingComplete: false });
  await getTestApp().inject({ method: 'POST', url: '/api/v1/users/me/onboarding/complete', headers: { Authorization: devToken('dev-test-oc2') } });
  const res2 = await getTestApp().inject({ method: 'POST', url: '/api/v1/users/me/onboarding/complete', headers: { Authorization: devToken('dev-test-oc2') } });
  expect(res2.statusCode).toBe(200);
  expect(res2.json().pointsCredited).toBe(0);
  const ledger = await prisma.pointsLedger.findMany({ where: { userId: u.id, actionType: 'welcome_bonus' } });
  expect(ledger).toHaveLength(1);
});
```

**Green:** Short-circuit on `user.onboardingComplete === true`.

Commit: `fix(api): make /onboarding/complete idempotent`.

---

## Playwright smoke (per-screen)

Per `GapFix_Agent_Protocol.md` §5. After each feature's green tests:

1. Open `file:///Users/USER/claude_tj/Eru/Eru_Consumer_PWA.html`.
2. `browser_evaluate` → `showScreen('welcome')` / `'otp'` / `'personalize'` / `'tutorial'`.
3. Take screenshot.
4. Run mobile via `npx expo export --platform web --output-dir /tmp/eru-web` and open in Playwright browser, then navigate to the corresponding route.
5. Take screenshot.
6. Paste both screenshots into PR description as visual evidence of parity.

If the mobile web export doesn't produce the exact visual (some React Native primitives degrade on web), capture an iOS simulator screenshot instead and document that the web was skipped for this screen.

---

## Phase-completion gate

- [ ] All 4 screens render exact PWA copy (verified by tests asserting exact text).
- [ ] Progress bars correct on screens 2/3/4.
- [ ] WhatsApp toggle defaults ON on OTP screen; callout copy exact.
- [ ] 6-digit OTP auto-advance works; backspace focuses previous.
- [ ] Resend countdown starts at 30s, updates every second.
- [ ] 15 interests + 5 languages render in exact PWA order with exact labels.
- [ ] `+50 pts` banner appears iff exactly 5+ interests selected.
- [ ] Tutorial welcome banner = `+250 pts`; tier teaser exact.
- [ ] `POST /users/me/onboarding` credits +50 pts and is idempotent.
- [ ] `POST /users/me/onboarding/complete` credits +250 + +25 = 275 pts and is idempotent.
- [ ] `/auth/*` routes annotated with `@eru/shared` types; mobile service typed to match.
- [ ] Returning users skip welcome on subsequent app opens.
- [ ] Playwright side-by-side screenshots captured for all 4 screens.
- [ ] `ALLOW_DEV_TOKENS=true npm test` green in `apps/api`.
- [ ] `npm test` green in `apps/mobile`.
- [ ] `npx tsc --noEmit` clean in both workspaces.
- [ ] Commits scoped per protocol §7.

---

## What could go wrong

- **Text case-mismatch** — PWA uses title case, mobile ends up with sentence case somewhere. Tests that assert exact strings catch this.
- **ProgressSteps off-by-one** — `current={3}` on tutorial means "step 4 active." Double-check the array index vs. step number semantics.
- **WhatsApp toggle default** — currently some code paths start it off. The Dev Spec is explicit: **default ON** (99% delivery in Kerala).
- **Interest color mapping** — only 5 pills should render in color by default (to show how selection highlights), rest in gray. Verify by checking PWA lines 372–386 — the 5 selected there have specific tinted backgrounds.
- **Double-credit bug** — missing `onboardingComplete` check means replaying the complete call double-credits. The test in Feature 6 is the guard.
- **Pincode detection fails silently** — the GPS detect endpoint might not return `areaName` + `userCount` yet. Either extend the endpoint (preferred) or pass mobile-side placeholder with a TODO-test flagging it.

---

## Next phase

Once the gate is green, open [`GapFixP6.md`](./GapFixP6.md) — Phase 2: Core loop (home, create, post-detail). P6 assumes a fresh user can complete P5 and land on `/(tabs)` with 275 starter pts.
