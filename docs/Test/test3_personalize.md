# Test 3 — Personalize

**Route:** `/(auth)/personalize`
**Mobile source:** `apps/mobile/app/(auth)/personalize.tsx`
**PWA reference:** `Eru_Consumer_PWA.html` lines 373-435
**Screenshot:** `docs/pwa-screenshots/03-personalize.png`

## Visual parity

### Header
- [ ] Back arrow `←` (left), title `Personalize` (centre, 800-weight), `Skip` link (right, blue 14px/600).

### Progress
- [ ] `<ProgressSteps current={2} total={4} caption="Step 2 of 4 • Tell us what you love" />` below header.
- [ ] 4-segment bar: 1st + 2nd filled orange; 3-4 grey.

### Location card
- [ ] Teal-bordered card at top of body (16px radius, teal border, 0.5px):
  - [ ] 📍 icon + label `Your location`.
  - [ ] Pincode + area, e.g. `682016 • Ernakulam Central`.
  - [ ] Sub-line `Auto-detected via GPS • 12,000 Eru users here` (11px, g500).
  - [ ] Right-aligned `Change` link (blue, 13px/600).

### Interests
- [ ] Section heading `🎯 Pick 5+ interests` (15px, 700-weight, g800).
- [ ] Helper: `Personalises your feed. Earn 2x points on matched content.` (12px, g500).
- [ ] 15 interest pills in a wrap grid:
  - Food 🍜, Tech 💻, Travel ✈️, Books 📚, Fitness 💪, Cinema 🎬, Music 🎵, Cricket 🏏, Photography 📷, Art 🎨, Lifestyle 🏠, Finance 💰, Fashion 👗, Gaming 🎮, Wellness 🧘
  - [ ] Each pill: 1px border, radius 999, 12px padding horizontal, 6px vertical.
  - [ ] Unselected: white bg, g200 border, g700 text.
  - [ ] Selected: pill border + bg = interest's color (per `INTERESTS` constant); white text.
  - [ ] Selection indicator: `✓` appears after label (e.g., `Food ✓`).
  - [ ] `accessibilityLabel="interest-pill-<key>"` per pill.
- [ ] Below grid: selection-count line.
  - [ ] ≥ 5 selected: `✓ {N} selected — unlocks +50 pts` (green 13px/700).
  - [ ] < 5 selected: `{N} of 5 minimum` (g500 13px).

### Languages
- [ ] Section heading `🌐 Content languages` (15px, 700).
- [ ] Helper: `Select all languages you read or watch` (12px, g500).
- [ ] 5 language pills: English, മലയാളം (Malayalam), हिंदी (Hindi), தமிழ் (Tamil), ಕನ್ನಡ (Kannada).
  - [ ] Same pill styling as interests, but selected state uses navy bg.
  - [ ] Native script rendered correctly (no tofu boxes).

### CTA
- [ ] Primary button at bottom: `Next: How You Earn →` (navy bg, white, 15px/700).
  - [ ] Enabled only if 5+ interests selected AND ≥1 language selected.
  - [ ] Disabled state: opacity 0.5.

## Functional behaviour

### On mount
- [ ] No immediate API call (interests stored locally until submit).
- [ ] If route has `?token=<firebase-id-token>` query param, carries it forward for the next screen.

### Interest pill tap
- [ ] Adds/removes from local `selected` array.
- [ ] Visual state flips immediately.
- [ ] Selection-count line updates.
- [ ] If count crosses 5 → green "+50 pts" line appears; crosses below 5 → reverts to "X of 5 minimum".

### Language pill tap
- [ ] Toggles selection (multi-select).
- [ ] At least 1 required for CTA enablement.

### Change location tap
- [ ] Opens `LocationPicker` modal OR navigates to a location-selection flow.
- [ ] On select: updates the location card display.

### Next CTA
- [ ] Persists selections to server via `POST /users/me/onboarding` (if exists) OR `PUT /users/me/settings` with `{interests, contentLanguages, primaryPincode}`.
- [ ] On success: `router.push('/(auth)/tutorial')`.
- [ ] If server credits +50 pts (threshold ≥5): toast / confetti / response consumed.

### Skip
- [ ] Tap `Skip` (header right) → skips persisting interests → `router.push('/(auth)/tutorial')`.
- [ ] User can return later via Settings → Content Interests.

## Edge cases

- [ ] 0 interests + Skip → proceeds (no crash); user can revisit in settings.
- [ ] Exactly 5 interests → green `+50 pts` line visible AND CTA enabled.
- [ ] All 15 interests selected → still allowed (no cap); +50 pts banner stays.
- [ ] Language not selected → CTA disabled even if 5+ interests.
- [ ] Server 500 on Next → error toast; CTA re-enabled.
- [ ] GPS unavailable → Location card shows generic default (pincode from primaryPincode setting or "Add pincode" prompt).
- [ ] Non-Latin scripts render: `മലയാളം` appears correctly (not tofu / not Latin-transliterated).
- [ ] VoiceOver announces each pill's state ("Food, selected" vs "Food, not selected") via `accessibilityState`.

## Notes for Playwright web run

- Web can test all 15 interest pills + 5 language pills; tap/untap cycle via `browser_click`.
- Verify exact labels via `browser_snapshot` (a11y tree includes button names).
- Verify color changes by `browser_evaluate` inspecting `getComputedStyle(pill).backgroundColor` after tap.
- The Change-location picker may be a native modal; if not testable on web, mark `⚠ skip-on-web`.
