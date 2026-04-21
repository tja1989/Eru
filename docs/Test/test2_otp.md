# Test 2 — OTP (Verify Phone)

**Route:** `/(auth)/otp`
**Mobile source:** `apps/mobile/app/(auth)/otp.tsx`
**PWA reference:** `Eru_Consumer_PWA.html` lines 291-371
**Screenshot:** `docs/pwa-screenshots/02-otp.png`

## Visual parity

### Header
- [ ] SafeAreaView top inset respected.
- [ ] Header bar with 14px horizontal padding, 0.5px bottom border `g100`:
  - [ ] Left: `←` back icon (16px, g800).
  - [ ] Centre title `Verify Phone` (16px, 800-weight, g800).
  - [ ] Right: 16px-wide spacer (no action).

### Progress steps
- [ ] `<ProgressSteps current={1} total={4} caption="Step 1 of 4" />` below header.
  - [ ] 4 segments: 1st orange-filled; 2-4 grey.
  - [ ] Caption below: "Step 1 of 4" (11px, g400).

### Body title
- [ ] Primary heading: `Enter 6-digit code` (22px, 800-weight, g800).
- [ ] Subtitle dynamic: `We sent a code via SMS to {phone}` OR `We sent a code via WhatsApp to {phone}` (13px, g500).
- [ ] Phone appears in bold or monospace to make the number stand out.

### WhatsApp toggle callout (only if route has `?channel=sms` default)
- [ ] Row `Send via WhatsApp` with iOS-style switch toggle, default ON.
  - [ ] Copy line 2: `Faster delivery. No SMS needed.` (11px, g500).
  - [ ] Label color: teal when ON, g500 when OFF.

### OTP digit grid
- [ ] 6 TextInput boxes, evenly spaced in a horizontal row:
  - [ ] Each 48×48, radius 8, 1px border g300.
  - [ ] On focus: border orange, bg rgba(232,121,43,0.05).
  - [ ] Font 22px, weight 700, centred.
  - [ ] testIDs `otp-digit-0` through `otp-digit-5`.

### Resend timer
- [ ] Text below digits: `Didn't receive? Resend in 30s` when countdown > 0.
  - [ ] Countdown updates every second; numeric portion only.
  - [ ] When countdown hits 0: text becomes `Didn't receive? Resend code` (tappable).

### Primary CTA
- [ ] Button: `Verify & Continue →`
  - [ ] Navy `#1A3C6E` bg, white text, 15px/700.
  - [ ] Disabled state when fewer than 6 digits entered: opacity 0.5, not tappable.

### Terms + privacy footer
- [ ] Small footer: `By continuing you agree to Eru's Terms and Privacy Policy. We never share your number with advertisers.`
  - [ ] Links: `Terms` and `Privacy Policy` in blue, tappable.
  - [ ] 11px, g500, centred below CTA.

## Functional behaviour

### Initial state
- [ ] On mount, reads `phone`, `verificationId`, `channel` from `useLocalSearchParams`.
- [ ] Resend countdown starts at 30 on mount.

### Digit entry
- [ ] Typing into digit 0 auto-advances focus to digit 1.
- [ ] Typing in digit 5 keeps focus on 5 (no advance past end).
- [ ] Backspace on empty digit focuses previous digit.
- [ ] Only numeric input accepted (`keyboardType="number-pad"`).
- [ ] Max length 1 per box.

### Resend
- [ ] When countdown reaches 0, `Resend code` text becomes tappable.
- [ ] Tap → `authService.requestOtp()` OR `whatsappAuthService.send()` depending on channel.
- [ ] Countdown resets to 30.
- [ ] Errors silently ignored (per impl comment, non-fatal).

### Verify (happy path — registered user)
- [ ] Tap `Verify & Continue →` with 6 digits.
- [ ] Channel=sms: calls `authService.verifyOtpAndSignIn(verificationId, code)`.
- [ ] Channel=whatsapp: calls `whatsappAuthService.verify(phone, code)` then `signInWithCustomToken`.
- [ ] Receives Firebase ID token.
- [ ] Calls `authService.checkRegistered(idToken)` → true.
- [ ] Calls `authService.getOnboardingStatus()` → `{complete: true|false}`.
- [ ] If `complete: true` → `router.replace('/(tabs)')`.
- [ ] If `complete: false` → `router.replace('/(auth)/tutorial')`.

### Verify (new user)
- [ ] `checkRegistered` returns false → `router.replace('/(auth)/onboarding', {phone, token: idToken})`.

### Error handling
- [ ] `Invalid code` → shows error `Invalid code — try again`.
- [ ] Network error → `Couldn't verify — try again`.
- [ ] Error text: 12px, red `#ED4956`, below digit grid.
- [ ] Error clears on next digit input.

### WhatsApp toggle
- [ ] Toggle OFF → resend calls SMS path, subtitle says "via SMS".
- [ ] Toggle ON → resend calls WhatsApp path, subtitle says "via WhatsApp".
- [ ] Toggle state persisted for the session.

## Edge cases

- [ ] User arrives with `phone=undefined` → subtitle shows "to undefined" placeholder, digit entry still works but verify fails cleanly.
- [ ] User arrives with `verificationId=''` on SMS channel → Verify disabled (per `if (!isWhatsApp && !verificationId) return`).
- [ ] Resend before countdown completes → no-op (per `if (resendIn > 0) return`).
- [ ] User backs out via `←` before verifying → returns to previous screen (login/welcome).
- [ ] Paste 6 digits at once into digit 0 → all 6 boxes fill (if paste handling implemented) OR just digit 0 fills (basic impl).
- [ ] User is already authenticated and visits /otp directly → auth gate should redirect.
- [ ] `getOnboardingStatus()` fails (network error) → fallback to `/(auth)/tutorial` per `catch` block.
- [ ] Airplane mode → `verifyOtpAndSignIn` throws → error shown, CTA re-enabled.

## Notes for Playwright web run

- The Firebase OTP flow is **bypassed on web**. Tests should use the dev-token login path on the previous screen, which writes a Firebase-lookalike token and skips OTP entirely.
- For web-only verification, directly navigate to `/(auth)/otp?phone=%2B919876543210&verificationId=test-vid&channel=sms` and verify only the Visual + Functional (input handling) items. Verify skip is acceptable for the actual verify API call.
- `browser_fill_form` can auto-enter 6 digits into the inputs for the digit-advance check.
