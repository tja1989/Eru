# Test 19 — Settings

**Route:** `/settings`
**Mobile source:** `apps/mobile/app/settings/index.tsx`
**PWA reference:** `Eru_Consumer_PWA.html` lines 1780-1969
**Screenshot:** `docs/pwa-screenshots/19-settings.png`

## Visual parity

### Header
- [ ] Back `←` (22px g800), title `Settings` (17px/700 g900 centre), right `Save` (blue link, only when `hasChanges`; else 30-wide spacer).
- [ ] 0.5 bottom border g200.

### Card structure (shared)
- [ ] Section header (white bg, 16 horizontal, 8-16 vertical): 13px/700 g800, uppercase-ish; no border.
- [ ] Section card: white bg, 16 horizontal margin, 8 radius, 0.5 g100 border.
- [ ] Divider between rows inside a card: 0.5 g100.

### Card 1 — Personal Details (Profile)
- [ ] Fields:
  - [ ] Name (TextInput).
  - [ ] Bio (TextInput multiline, 150 max char, shows `{len}/150` count below).
  - [ ] Date of Birth (row, tappable, shows formatted date `15 Jan 1990` or `Not set`).
  - [ ] Pincode (6-digit numeric).
  - [ ] Gender (radio chips: Male / Female / Other).

### Card 2 — Location & Pincode
- [ ] Primary pincode field.
- [ ] Secondary pincodes (max 5): chips with ✕ remove; input `+ Add Pincode` placeholder.

### Card 3 — Content Interests
- [ ] Hint: `Pick topics you want to see more of. Tap to toggle.` (12px g500).
- [ ] 15 interest chips from `INTERESTS` constant (same as Personalize screen):
  - [ ] Each: 10 horizontal / 6 vertical padding, 999 radius, 1px g200 border, white bg.
  - [ ] Unselected: 12px/600 g700.
  - [ ] Selected: bg = interest color (from constant), white 12px/600.
  - [ ] testID `interest-chip-{key}`.

### Card 4 — Language & Content
- [ ] Sub-label `App language`.
  - [ ] 5 language chips (English, മലയാളം, हिंदी, தமிழ், ಕನ್ನಡ).
  - [ ] Selected app language: navy bg, white.
  - [ ] testID `app-lang-{code}`.
- [ ] Divider.
- [ ] Sub-label `Content languages` + hint `Posts in these languages will surface first in your feed.`.
  - [ ] Same 5 language chips, multi-select.
  - [ ] testID `content-lang-{code}`.

### Card 5 — Notifications
- [ ] `Push Notifications` toggle: label + sub `Get alerts for likes, comments, and updates`.
- [ ] `Email Digest` toggle: sub `Receive a weekly summary of your top content`.
- [ ] Switch track false=g300, track true=navy; thumb white.

### Card 6 — Privacy
- [ ] `Private Account` toggle: sub `Only approved followers can see your content`.
- [ ] `Share Data with Brands` toggle: sub `Allow brands to view anonymised engagement data`.

### Card 7 — Linked Accounts
- [ ] Phone row: `Phone` label + `✓ Verified • {phone}` (if phone) OR `Not linked`.
- [ ] Google row: `Google` + `Not linked` + `Link with Google` button.
- [ ] Instagram row: `Instagram` + `Not linked` + `Link with Instagram` button.

### Card 8 — Eru Account stats
- [ ] Username `@{username}`.
- [ ] Phone read-only.
- [ ] `Lifetime points 🪙 {N}`.
- [ ] `Current tier {tier}`.
- [ ] `Creator score {score}/100`.

### Logout + Delete Account
- [ ] `Log Out` button (red-ish text, centred, large).
- [ ] `Delete Account` button (very bottom, testID `delete-account-btn`, red text or outline).

## Functional behaviour

### On mount
- [ ] Fires `userService.getSettings()` → `GET /users/me/settings`.
- [ ] Populates all fields from response.

### Field updates
- [ ] Every edit sets `hasChanges=true`; Save button appears in header.
- [ ] Char count on bio: real-time.

### Save tap
- [ ] `userService.updateSettings(settings)` → `PUT /users/me/settings`.
- [ ] On success: `hasChanges=false`, alert `Saved — Your settings have been updated.`.
- [ ] On error: alert `Error — Could not save settings. Please try again.`.

### DOB row tap
- [ ] Opens DateTimePicker modal (iOS) or native (Android).
- [ ] On pick: updates `settings.dob` as ISO string.

### Secondary pincode add
- [ ] Type valid 6-digit + submit → appends chip; max 5 enforced.
- [ ] Invalid length / duplicate / max reached → no-op.

### Gender radio
- [ ] Tap chip → updates `settings.gender`.

### Interest chip tap
- [ ] Tap → toggles selection in `settings.interests`.

### Language chip tap
- [ ] App lang: single-select.
- [ ] Content lang: multi-select.

### Logout
- [ ] Confirm alert: `Log Out — Are you sure you want to log out?`.
- [ ] On confirm: `logout()` from authStore → `router.replace('/(auth)/login')`.

### Delete Account
- [ ] Confirm alert: `Delete Account — This cannot be undone. Your posts will remain visible but anonymized.`.
- [ ] On confirm: `userService.deleteMe()` → `DELETE /users/me`.
- [ ] Server schedules deletion for `now + 30d` (deletedAt).
- [ ] Client `reset()` + `router.replace('/(auth)/welcome')`.

### Link with Google / Instagram
- [ ] Placeholder; no OAuth wired today. Optional: alert `OAuth coming soon`.

### Back tap
- [ ] If `hasChanges`: confirm discard? (optional). Else: `router.back()`.

## Edge cases

- [ ] Bio at 150 chars → typing more is blocked (maxLength enforced).
- [ ] Invalid pincode (not 6 digits) → can't submit secondary.
- [ ] DOB picker cancel → no change.
- [ ] Save fails (409 username conflict) → specific error message.
- [ ] Delete account then back-button → user is unauthenticated; routed to welcome.
- [ ] All interests deselected → valid state (save allowed).
- [ ] Login method is phone-only → Google/Instagram rows stay "Not linked".

## Notes for Playwright web run

- DOB picker is `⚠ skip-on-web` (no native component).
- All other fields + chips + toggles testable.
- Save/updateSettings PUT verifiable via `browser_network_requests`.
- Logout/delete: dry-run by skipping confirmation.
