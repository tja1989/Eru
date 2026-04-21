# Test 1 — Welcome Screen

**Route:** `/(auth)/welcome`
**Mobile source:** `apps/mobile/app/(auth)/welcome.tsx`
**PWA reference:** `Eru_Consumer_PWA.html` lines 200-289
**Screenshot:** `docs/pwa-screenshots/01-welcome.png`

## Visual parity

### Background + layout
- [ ] Full-screen LinearGradient: `#1E1145` → `#2D1B69` → `#E8792B` (top → mid → bottom).
- [ ] SafeAreaView edges top only; content fills screen.
- [ ] Central vertical stack, content-justified (not top-aligned).

### Header / logo
- [ ] Frosted "E" logo tile:
  - [ ] 72×72, rounded 16px.
  - [ ] Background `rgba(255,255,255,0.15)`, 1px border `rgba(255,255,255,0.25)`.
  - [ ] Text "E" centred, Georgia italic, 40px, white 800-weight.
- [ ] Logo positioned roughly 18% from top of content area.

### Tagline
- [ ] Orange label above title: `CONSUME. EARN. CONNECT.`
  - [ ] 11px, letter-spacing 2px, weight 700, color `#E8792B`.
- [ ] Main title, two lines, centre-aligned:
  - [ ] Line 1 `Your attention` — white, 34px, 800-weight.
  - [ ] Line 2 `has value.` — orange `#E8792B`, 34px italic, 800-weight, Georgia.
- [ ] Subtitle below: `India's first super content app where every scroll, share, and review earns you real rewards.`
  - [ ] 14px, line-height 20, color `rgba(255,255,255,0.85)`, centred.

### 3 value-prop cards
- [ ] Three stacked glass cards, full-width minus 20px side margins:
  - [ ] Card bg `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.15)`, radius 14.
  - [ ] 12px padding, 10px gap between cards.
- [ ] Card 1 — "Earn real rewards" + sub "25 earning actions. 193 pts/day avg.":
  - [ ] Leading emoji 🌏 (or equivalent small icon, 22px).
  - [ ] Title white 13px 700-weight.
  - [ ] Sub white 70% 11px.
- [ ] Card 2 — "Redeem locally" + sub "500+ partner stores. Free coffee, discounts, gifts.":
  - [ ] Leading emoji 🎁.
- [ ] Card 3 — "Create & get paid" + sub "Tag businesses, earn 20% commission on boosted posts.":
  - [ ] Leading emoji 🚀.

### CTA buttons
- [ ] Primary CTA "Get Started →":
  - [ ] Orange `#E8792B` bg, white text, 15px padding vertical, radius 12.
  - [ ] Font 16px 700-weight white.
- [ ] Secondary CTA "I already have an account":
  - [ ] Frosted glass: bg `rgba(255,255,255,0.12)`, border `rgba(255,255,255,0.25)`.
  - [ ] White text 15px 600-weight.
- [ ] 8px vertical gap between buttons.

### Footer
- [ ] Tiny footer text near bottom: `Made in Kerala 🇮🇳`.
  - [ ] White 60% opacity, 10px.

## Functional behaviour

- [ ] On mount: no API calls fired (unauthenticated screen).
- [ ] Tap "Get Started →" → `router.push('/(auth)/otp')` OR (per current impl) opens phone-number entry flow → onto OTP.
- [ ] Tap "I already have an account" → same target as "Get Started →" (both route into OTP / login).
- [ ] Back gesture (Android) → no-op (Welcome is the root of onboarding); double-press → exit app.
- [ ] Screen rotation locked portrait (not testable on web, verify on phone).

## Edge cases

- [ ] User already authenticated but visits /welcome directly → auth gate redirects to `/(tabs)` if `hasCompletedOnboarding`, else to `/(auth)/tutorial`.
- [ ] Very small device (e.g. iPhone SE 375×667) → all three value cards fit above buttons without scroll; title font doesn't wrap mid-word.
- [ ] Very large device (Pro Max 430×932) → content remains centered, not stretched.
- [ ] Low-end Android, gradient render: the LinearGradient must composite correctly; if missing, fallback to `colors.navy` solid bg.
- [ ] Font fallback: if Georgia missing, system serif should render without breaking layout.
- [ ] VoiceOver / TalkBack: logo reads as "E", CTA reads "Get Started", "I already have an account" both tappable.

## Notes for Playwright web run

On web build, all visual items above are testable in Chrome at 390×844.
The LinearGradient uses `expo-linear-gradient`, which has a react-native-web shim that renders a CSS `background: linear-gradient(...)`. Verify via `browser_evaluate` reading `getComputedStyle(screen).background`.

Tap "Get Started" should navigate to `/(auth)/otp`. Verify via `browser_navigate` URL change or snapshot after click.
