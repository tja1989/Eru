# EAS iOS → TestFlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a TestFlight-installable iOS build of Eru with feature parity to Android (Firebase Phone Auth + push notifications working), via EAS Build.

**Architecture:** EAS Build (Expo's cloud Mac, free tier) compiles and signs the .ipa using auto-managed Apple credentials. EAS Submit uploads to App Store Connect using an App Store Connect API key. TestFlight distributes to internal testers (TJ's wife's iPhone first). Firebase Phone Auth + push on iOS require an APNs Authentication Key uploaded to Firebase Console. No Codemagic, no local Xcode required.

**Tech Stack:** Expo SDK 54, EAS Build/Submit, Firebase (Auth + Cloud Messaging), Apple App Store Connect, APNs.

**Reference spec:** [docs/superpowers/specs/2026-05-02-eas-ios-testflight-design.md](../specs/2026-05-02-eas-ios-testflight-design.md)

---

## Plan shape (special: mostly external setup)

This plan is unusual: ~70% is manual clicking in Apple + Firebase web consoles (which Claude cannot automate — they need TJ's authenticated browser session and 2FA). The remaining ~30% is repo edits + EAS commands TJ runs on his Mac.

The tasks are still bite-sized and verifiable, just shaped as **precondition → action → verify** instead of pure TDD's **fail → implement → pass**. Each task ends with either a commit (for code changes) or a concrete artifact you'll have produced (e.g. "you now have a `.p8` file at `~/Downloads`").

```
Phase 1: Apple side (T1-T2)        ← 30 min, browser only
Phase 2: Firebase side (T3-T4)     ← 15 min, browser only
Phase 3: Repo changes (T5)         ← 10 min, code edits
Phase 4: EAS setup (T6)            ← 10 min, terminal commands
Phase 5: First build & submit (T7-T8)  ← 40 min wait, mostly idle
Phase 6: TestFlight verification (T9-T10)  ← 20 min, requires tester device
Phase 7: Stretch — push parity (T11)   ← 15 min
```

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `apps/mobile/app.config.js` | Modify | Add `ios.googleServicesFile` line, parallel to existing Android pattern |
| `apps/mobile/eas.json` | Modify | Add `ios` block to `preview` build profile + `submit.production.ios` block |
| `apps/mobile/.gitignore` | Modify | Add `GoogleService-Info.plist` to gitignore (parallel to existing google-services.json) |
| `apps/mobile/GoogleService-Info.plist` | Create (gitignored) | Firebase iOS config, downloaded from Firebase console |

That's it for repo-level changes. The Apple/Firebase setup creates artifacts (API keys, app records) that live outside the repo.

---

## Task 1: Apple — create App Store Connect app record

**Goal:** Apple knows about an app called Eru with bundle ID `app.eru.consumer`. Without this, `eas submit` errors with "no such app."

**Precondition:** Apple Developer Program membership active under `aflolabs@gmail.com`. Verified by signing into https://appstoreconnect.apple.com and seeing the dashboard (not a "join the program" prompt).

**Files:** None (external).

- [ ] **Step 1: Sign in to App Store Connect**

Open https://appstoreconnect.apple.com in a browser. Sign in with `aflolabs@gmail.com`. Complete 2FA.

Expected: dashboard with "Apps", "TestFlight", "Users and Access", etc.

- [ ] **Step 2: Open "My Apps" and click the "+"**

Click "My Apps" → click the blue "+" button → choose "New App."

Expected: a modal titled "New App" with form fields.

- [ ] **Step 3: Fill the form exactly as below**

| Field | Value |
|---|---|
| Platforms | ✅ iOS (only — leave macOS/visionOS unchecked) |
| Name | `Eru` |
| Primary Language | English (U.S.) |
| Bundle ID | Select `app.eru.consumer` from the dropdown (it auto-appears once `eas credentials` runs in T6, OR you can register it manually now via Certificates, Identifiers & Profiles → Identifiers → "+") |
| SKU | `eru-001` (any unique string; never shown to users) |
| User Access | Full Access |

If the Bundle ID dropdown is empty, do this first: open https://developer.apple.com/account/resources/identifiers/list → "+" → App IDs → App → fill Bundle ID `app.eru.consumer` and description "Eru". Save. Then return to App Store Connect — the dropdown will now show it.

- [ ] **Step 4: Click "Create"**

Expected: redirected to the new app's overview page. URL contains a numeric ID like `/apps/1234567890/...`.

- [ ] **Step 5: Capture the App Store Connect App ID**

Copy that numeric ID (e.g. `1234567890`) from the URL. **Write it down — you'll paste this into `eas.json` in Task 5 as `ascAppId`.**

- [ ] **Step 6: Capture the Apple Team ID**

Open https://developer.apple.com/account → look at the top-right corner. Below your name is a 10-character alphanumeric string (e.g. `ABCD123456`). **Write this down — you'll paste this into `eas.json` in Task 5 as `appleTeamId`.**

- [ ] **Verify:** You now have two values written down: `ascAppId` (numeric) and `appleTeamId` (10 chars). Both are public identifiers — safe to store in chat or notes.

---

## Task 2: Apple — generate App Store Connect API key + APNs key

**Goal:** Generate two `.p8` private key files. (a) App Store Connect API key lets EAS upload builds without your password. (b) APNs Authentication Key lets Firebase send push notifications + lets Phone Auth verification work on iOS.

**Precondition:** Task 1 complete.

**Files:** Two `.p8` files saved to your Mac's Downloads folder (we'll move them later as needed).

- [ ] **Step 1: Generate App Store Connect API key**

Open https://appstoreconnect.apple.com → "Users and Access" (top nav) → "Integrations" tab → "App Store Connect API" → click "+" or "Generate API Key."

Form:
| Field | Value |
|---|---|
| Name | `EAS Submit` |
| Access | App Manager |

Click Generate.

- [ ] **Step 2: Download the .p8 file (Apple shows it ONCE)**

After generation, you see a row with a "Download API Key" button. Click it. A file like `AuthKey_XXXXXXXXXX.p8` saves to Downloads.

**Also write down:**
- Key ID (10 chars, e.g. `ABC1234DEF`) — shown in the same row
- Issuer ID (UUID, e.g. `12345678-abcd-...`) — shown above the keys table

Expected: file `~/Downloads/AuthKey_<KeyID>.p8` exists (verify with Finder or `ls ~/Downloads/AuthKey_*.p8`).

⚠️ **Apple will not let you download this file again.** If you lose it, you must revoke and re-create the key. Move it to a safe spot (e.g. `~/Documents/Eru-keys/`) once verified.

- [ ] **Step 3: Generate APNs Authentication Key**

Open https://developer.apple.com/account/resources/authkeys/list → "+" → name it `Eru APNs` → check the box "Apple Push Notifications service (APNs)" → click "Continue" → "Register."

- [ ] **Step 4: Download the APNs .p8 file (also shown ONCE)**

Click "Download" on the resulting page. A file like `AuthKey_YYYYYYYYYY.p8` saves to Downloads.

**Write down:**
- Key ID (10 chars, different from the App Store Connect one)
- Team ID (same as Task 1 step 6)

- [ ] **Verify:** Two `.p8` files in Downloads:

```bash
ls ~/Downloads/AuthKey_*.p8
```

Expected: 2 files listed.

You also have written down:
- App Store Connect API Key: Key ID + Issuer ID + .p8 path
- APNs Key: Key ID + Team ID + .p8 path

These will be used in Tasks 4 and 6.

---

## Task 3: Firebase — register iOS app + download config

**Goal:** Firebase project knows about an iOS app with bundle ID `app.eru.consumer`. You have `GoogleService-Info.plist` to drop into the repo.

**Precondition:** Firebase project for Eru already exists (used by Android). Sign in with `aflolabs@gmail.com`.

**Files:** `~/Downloads/GoogleService-Info.plist`

- [ ] **Step 1: Open Firebase Console for the Eru project**

Open https://console.firebase.google.com. Click into the existing Eru project (the one whose `google-services.json` is currently in `apps/mobile/google-services.json`).

- [ ] **Step 2: Add iOS app**

In Project Overview, click the "+" near "Your apps" → click the iOS icon (Apple logo).

Form:
| Field | Value |
|---|---|
| Apple bundle ID | `app.eru.consumer` |
| App nickname | `Eru iOS` |
| App Store ID | leave blank (we don't have one until App Store launch) |

Click "Register app."

- [ ] **Step 3: Download GoogleService-Info.plist**

The next screen prompts you to download. Click "Download GoogleService-Info.plist." File saves to Downloads.

Expected:

```bash
ls ~/Downloads/GoogleService-Info.plist
```

shows the file exists.

- [ ] **Step 4: Skip the SDK install steps Firebase shows**

Firebase shows "Add Firebase SDK" steps next. **Skip them all** (click "Next" through them) — `@react-native-firebase/app` already handles SDK integration. We just needed the plist file.

Click "Continue to console" at the end.

- [ ] **Verify:** Two things true now:
  - `~/Downloads/GoogleService-Info.plist` exists
  - In Firebase Console → Project Settings → "Your apps," you see two apps: the existing Android one + the new iOS one (with bundle `app.eru.consumer`).

---

## Task 4: Firebase — upload APNs key for iOS push

**Goal:** Firebase can send push notifications to your iOS app. This is what makes Phone Auth work on iOS (silent push verification) AND what `expo-notifications` uses.

**Precondition:** Task 2 (APNs .p8 downloaded) + Task 3 (iOS app registered in Firebase).

**Files:** None — uploads the existing `.p8` to Firebase.

- [ ] **Step 1: Open Firebase Cloud Messaging settings**

In Firebase Console → click the gear icon (top left, next to "Project Overview") → "Project settings" → "Cloud Messaging" tab.

- [ ] **Step 2: Find the iOS app section**

Scroll to the "Apple app configuration" section (specifically your `app.eru.consumer` iOS app, not Android's section).

- [ ] **Step 3: Upload APNs Authentication Key**

Click "Upload" under "APNs Authentication Key."

Form:
| Field | Value |
|---|---|
| APNs auth key | Select the APNs `.p8` file from Task 2 step 4 |
| Key ID | Paste the APNs Key ID from Task 2 step 4 |
| Team ID | Paste the Apple Team ID (Task 1 step 6) |

Click "Upload."

- [ ] **Verify:** The "APNs Authentication Key" row now shows the Key ID with a green checkmark / "Configured" status.

---

## Task 5: Repo — wire iOS config into eas.json + app.config.js + .gitignore

**Goal:** The repo knows how to build for iOS and where the Firebase iOS plist lives.

**Precondition:** Tasks 1, 3 complete (you have `ascAppId`, `appleTeamId`, and `GoogleService-Info.plist`).

**Files:**
- Modify: `apps/mobile/eas.json`
- Modify: `apps/mobile/app.config.js`
- Modify: `apps/mobile/.gitignore`
- Create: `apps/mobile/GoogleService-Info.plist` (gitignored)

- [ ] **Step 1: Move the GoogleService-Info.plist into the repo**

```bash
mv ~/Downloads/GoogleService-Info.plist /Users/USER/claude_tj/Eru/apps/mobile/GoogleService-Info.plist
```

Verify:

```bash
ls /Users/USER/claude_tj/Eru/apps/mobile/GoogleService-Info.plist
```

Expected: the path is listed.

- [ ] **Step 2: Add GoogleService-Info.plist to .gitignore**

Open `apps/mobile/.gitignore`. Find the line `google-services.json` (the existing Android Firebase file is already gitignored). Add directly below it:

```
GoogleService-Info.plist
```

- [ ] **Step 3: Verify gitignore works**

```bash
cd /Users/USER/claude_tj/Eru
git status apps/mobile/GoogleService-Info.plist
```

Expected: nothing — file is ignored. If git reports it as untracked, the gitignore line is wrong.

- [ ] **Step 4: Edit `apps/mobile/app.config.js` — add `ios.googleServicesFile`**

Find the `ios:` block (around line 28-31). Change from:

```js
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.eru.consumer',
  },
```

To:

```js
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.eru.consumer',
    googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
  },
```

The pattern mirrors the existing `android.googleServicesFile` line. Local dev reads `./GoogleService-Info.plist`; EAS Build reads the file path EAS provides via the `GOOGLE_SERVICES_INFO_PLIST` env var (set in T6).

- [ ] **Step 5: Edit `apps/mobile/eas.json` — add iOS to preview build + submit**

Replace the entire file with:

```json
{
  "cli": {
    "version": ">= 13.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://eruapi-production.up.railway.app"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://eruapi-production.up.railway.app"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://eruapi-production.up.railway.app"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      },
      "ios": {
        "ascAppId": "REPLACE_WITH_NUMERIC_APP_ID_FROM_TASK_1_STEP_5",
        "appleTeamId": "REPLACE_WITH_10_CHAR_TEAM_ID_FROM_TASK_1_STEP_6"
      }
    }
  }
}
```

Then **replace the two REPLACE_WITH placeholders** with your actual values from Task 1.

`ios.simulator: false`
---
*Tells EAS to produce a real device build, not a Simulator-only build. We want a TestFlight-installable .ipa.*

`ios.resourceClass: "m-medium"`
---
*Picks the cheaper, slower EAS build worker (M2 medium). The free tier limits to this class anyway. ~25 min builds.*

`ascAppId`
---
*Numeric App Store Connect app ID. EAS Submit uses this to know which app to upload the .ipa to.*

`appleTeamId`
---
*Your Apple Developer team's 10-char ID. Required by EAS to scope credential management to the right team.*

- [ ] **Step 6: Type-check the mobile app**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx tsc --noEmit
```

Expected: 6 pre-existing errors (CommentInput, SponsorshipCard, useNotifications — documented in CLAUDE.md). **No new errors.** If you see any new ones, the `app.config.js` edit broke something.

- [ ] **Step 7: Commit**

```bash
cd /Users/USER/claude_tj/Eru
git add apps/mobile/eas.json apps/mobile/app.config.js apps/mobile/.gitignore
git commit -m "$(cat <<'EOF'
feat(mobile): wire iOS into eas.json + Firebase plist gitignore

Adds ios block to preview build profile and submit.production.ios so
EAS can build/submit iOS. Mirrors the existing Android pattern of
sourcing the Firebase config file from an env var (set by EAS Secret)
with a local-dev fallback. The plist is gitignored to keep API keys
out of the repo, parallel to google-services.json.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Verify:**

```bash
git status apps/mobile/GoogleService-Info.plist
```

Expected: file ignored (no output indicating modification or untracked).

```bash
git log --oneline -1
```

Expected: top commit is the one you just made.

---

## Task 6: EAS — login, upload secret, configure credentials

**Goal:** EAS knows your Expo identity, has the Firebase iOS plist as a Secret, and has Apple credentials configured.

**Precondition:** Tasks 2, 5 complete. EAS CLI installed (it's a project devDependency; if not, `npm install -g eas-cli` first).

**Files:** None (commands only).

- [ ] **Step 1: EAS login**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile
eas whoami
```

If output is `eru_aflo` (or `aflolabs@gmail.com`), skip to step 2. If "not logged in":

```bash
eas login
```

Enter your Expo account email + password. Verify with:

```bash
eas whoami
```

Expected: prints the username.

- [ ] **Step 2: Upload GoogleService-Info.plist as an EAS Secret**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile
eas secret:create \
  --scope project \
  --name GOOGLE_SERVICES_INFO_PLIST \
  --type file \
  --value ./GoogleService-Info.plist
```

Expected: `✔ Secret "GOOGLE_SERVICES_INFO_PLIST" has been created.`

If it errors with "already exists," update instead:

```bash
eas secret:delete --name GOOGLE_SERVICES_INFO_PLIST
# then re-run the create command above
```

Verify:

```bash
eas secret:list
```

Expected: row with `GOOGLE_SERVICES_INFO_PLIST` of type FILE.

- [ ] **Step 3: Configure iOS credentials interactively**

```bash
eas credentials
```

Walk through the prompts:

| Prompt | Answer |
|---|---|
| Select platform | `iOS` |
| Select build profile | `preview` |
| What do you want to do? | `Build credentials: Manage everything needed to build your project` |
| What do you want to do now? | `All: Set up all the required credentials to build your project` |
| Distribution Certificate | Choose `Generate new Distribution Certificate` (let EAS create it) |
| Provisioning Profile | Choose `Generate new Provisioning Profile` |
| App Store Connect: Do you want to use existing API Key? | `No, set up a new one` |
| Path to .p8 | `~/Documents/Eru-keys/AuthKey_<YourKeyID>.p8` (or wherever you saved it from Task 2 step 2) |
| Key ID | Paste from Task 2 step 2 |
| Issuer ID | Paste from Task 2 step 2 |

EAS will:
1. Authenticate with App Store Connect using the API key
2. Create an iOS Distribution Certificate
3. Create a Provisioning Profile for `app.eru.consumer`
4. Store all of it in EAS's credentials store

Expected final output: `✔ All credentials are ready to build app.eru.consumer`.

- [ ] **Verify:**

```bash
eas credentials
```

Choose `iOS` → `preview` → `Build credentials` → `Show all credentials configured for this build profile`.

Expected: shows Distribution Certificate (Apple-issued), Provisioning Profile (app.eru.consumer), App Store Connect API Key — all "configured."

Press Ctrl+C to exit when verified.

---

## Task 7: First iOS build (cloud)

**Goal:** A signed `.ipa` file produced by EAS, downloadable from the EAS dashboard.

**Precondition:** Tasks 5, 6 complete.

**Files:** None — EAS produces the .ipa in their cloud storage, accessible via dashboard URL.

- [ ] **Step 1: Trigger build**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile
eas build --platform ios --profile preview
```

EAS will ask one or two confirmation questions on first run (about pushing the build to the queue). Confirm with `y` / Enter.

- [ ] **Step 2: Wait**

EAS prints a URL like `https://expo.dev/accounts/eru_aflo/projects/eru/builds/<uuid>`. Open it in a browser to watch progress.

Expected timing:
- Queue wait: 2–10 min (free tier)
- Build itself: 25–35 min (first build is longer due to fresh CocoaPods cache)

While you wait, do nothing — don't try to start another build.

- [ ] **Step 3: Verify success**

When complete, the EAS dashboard shows status "Finished" (green) and offers a "Download" button for the `.ipa` file. The terminal command also returns and prints the same URL.

If FAILED:
- Click "View logs" on the dashboard
- Common failures: missing GoogleService-Info.plist secret (recheck T6 step 2), bundle ID mismatch (recheck T1/T5), expired Apple cert (re-run `eas credentials`)

- [ ] **Step 4: Don't download the .ipa**

You don't need it locally. EAS will hand it directly to App Store Connect in Task 8.

- [ ] **Verify:** Build status on EAS dashboard = Finished. Note the build URL — you may reference it in Task 8 if needed.

---

## Task 8: Submit to TestFlight

**Goal:** The build from Task 7 is uploaded to App Store Connect and processing for TestFlight.

**Precondition:** Task 7 complete (build status = Finished).

**Files:** None — uses the cloud .ipa.

- [ ] **Step 1: Submit**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile
eas submit --platform ios --latest
```

`--latest`
---
*Tells EAS Submit to use the most recent successful iOS build, no need to specify a build URL.*

EAS prompts:

| Prompt | Answer |
|---|---|
| What would you like to submit? | `Select a build from EAS` (already pre-selected) |
| Confirm? | `y` |

EAS uploads the .ipa to App Store Connect. Takes 2–5 min.

Expected terminal output ends with: `✔ Submitted your app to App Store Connect!`

- [ ] **Step 2: Wait for App Store Connect processing**

Open https://appstoreconnect.apple.com → My Apps → Eru → TestFlight tab.

You'll see your build appear with status "Processing" (yellow). Apple's automated review runs in the background — usually 5–15 min.

If status changes to "Missing Compliance" (yellow with a warning), click into the build, click "Provide Export Compliance Information," answer:

| Question | Answer |
|---|---|
| Does your app use encryption? | Yes |
| Does it qualify for any of the exemptions? | Yes (HTTPS standard encryption is exempt) |

Click Save. Status moves back to Processing.

- [ ] **Step 3: Verify**

After 5–15 min, build status changes to "Ready to Test" (green). The build appears in the TestFlight builds list with version 1.0.0 (1) (or similar).

If Apple emails you about a rejection, read the email — most rejections are about Privacy/Encryption disclosures and have one-click fixes in App Store Connect.

---

## Task 9: Add tester(s) in TestFlight

**Goal:** Wife's Apple ID can install the build via the TestFlight app.

**Precondition:** Task 8 complete (build status = Ready to Test).

**Files:** None.

- [ ] **Step 1: Open Internal Testing**

App Store Connect → My Apps → Eru → TestFlight tab → in the left sidebar, "Internal Testing" → click "+" next to "Internal Group" (or "App Store Connect Users" if shown).

For "Internal Testing" (recommended for first build):
- Up to 100 testers
- No Apple review required
- Testers must be added to your App Store Connect team OR be an "App Store Connect User"

There's a simpler shortcut: **add wife as an App Store Connect user**.

- [ ] **Step 2: Add wife as an App Store Connect user**

Navigate to https://appstoreconnect.apple.com → "Users and Access" → "Users" tab → "+" → "Invite User."

Form:
| Field | Value |
|---|---|
| First name | (Your wife's first name) |
| Last name | (Your wife's last name) |
| Email | (Wife's Apple ID email — the one she uses on her iPhone) |
| Roles | "Developer" (lowest privilege that allows TestFlight access) |
| Apps | Eru (or "All Apps") |

Click "Invite."

She receives an email titled "You've been invited to App Store Connect." She must click the link and accept (creates an App Store Connect identity tied to her Apple ID).

- [ ] **Step 3: Add her to an Internal Tester group**

Back in App Store Connect → My Apps → Eru → TestFlight → Internal Testing → click the default group (or create one named "Family Testers") → "+" → select her name → confirm.

- [ ] **Step 4: Add the build to the group**

In the same group page, you'll see "Builds" section → "+" → select the build from Task 8 → confirm.

She gets an email "TestFlight Invitation: Eru."

- [ ] **Verify:** App Store Connect → TestFlight → Internal Testing → her name appears with "Invited" status (will become "Accepted" after she opens TestFlight).

---

## Task 10: Smoke test on wife's iPhone

**Goal:** Confirm the app launches, the OTP login flow completes (proving APNs/Firebase Phone Auth works on iOS).

**Precondition:** Task 9 complete + wife is willing to be involved for ~5 minutes.

**Files:** None.

- [ ] **Step 1: Wife installs TestFlight (one-time)**

On her iPhone, open the App Store, search "TestFlight," install (free, made by Apple).

- [ ] **Step 2: Wife accepts the invite**

She opens the email from Apple (subject: "TestFlight Invitation"), taps "View in TestFlight" — this opens the TestFlight app with Eru ready to install.

- [ ] **Step 3: Install Eru**

In TestFlight, tap "Install" next to Eru. The app downloads (~30-60 sec) and an Eru icon appears on her home screen.

- [ ] **Step 4: Borrow the iPhone, launch Eru**

Tap the Eru icon. App should launch and show the welcome / login screen.

✅ If app launches without crashing → repo changes + Firebase iOS config are correct.
❌ If app crashes immediately → most likely `GoogleService-Info.plist` not bundled. Check that the EAS build was made AFTER the secret was uploaded (T6 must precede T7). If unsure, re-build (T7) and re-submit (T8).

- [ ] **Step 5: Test phone OTP login**

Tap through to the phone-OTP login screen. Enter wife's phone number → tap "Send OTP."

Expected:
- An SMS arrives within 30 sec with a 6-digit code.
- Entering the code logs in successfully.

✅ If OTP arrives and login completes → APNs key is correctly uploaded to Firebase.
❌ If OTP never arrives or login spins forever → APNs key issue. Re-check Task 4 (key uploaded to Firebase Cloud Messaging with correct Key ID + Team ID).

- [ ] **Step 6: Quick parity smoke test**

Tap around for ~3 minutes:
- Feed loads
- Profile screen renders
- One reel/video plays
- Tab navigation works

If all four work, parity is achieved at the smoke-test level.

- [ ] **Verify:** Build is installed, app launches, OTP login completes, basic features work. iOS feature parity with Android is confirmed.

---

## Task 11 (Stretch): Push notification end-to-end

**Goal:** Confirm a push notification sent from the API reaches wife's iPhone.

**Precondition:** Task 10 complete + wife logged in on her iPhone.

**Files:** None — this is end-to-end verification.

- [ ] **Step 1: Verify push token is registered**

In your API logs (Railway dashboard or `railway logs --tail`), search for "push token" or "expo-notifications." After wife logs in on her iPhone, the mobile app should call your API to register her Expo push token.

If not seeing a registration log line, the issue is in `useNotifications.ts` (mobile) — `expo-notifications` only fires `getExpoPushTokenAsync()` for development builds, not Expo Go. Since this is a dev build via TestFlight, it should work.

- [ ] **Step 2: Send a test notification from the API**

Use whichever endpoint your API exposes for sending a push (likely an admin or test route). If none exists, manually invoke via Expo's push API:

```bash
curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{
  "to": "ExponentPushToken[YOUR_WIFES_TOKEN_HERE]",
  "title": "Eru Test",
  "body": "Push works on iOS"
}'
```

Replace `YOUR_WIFES_TOKEN_HERE` with the token from step 1's logs.

Expected: response `{"data":{"status":"ok"}}`.

- [ ] **Step 3: Verify delivery**

Within 5–30 seconds, wife's iPhone shows a notification banner: "Eru Test — Push works on iOS."

✅ If banner appears → push parity confirmed.
❌ If no banner → check (a) wife allowed notifications when prompted on first app launch (Settings → Eru → Notifications must be ON), (b) Firebase Cloud Messaging APNs key still uploaded (Task 4 verify).

- [ ] **Verify:** Push notification reaches wife's iPhone. Full feature parity with Android achieved.

---

## What could go wrong (consolidated reference)

Cross-reference of failure modes, in case you hit one mid-task:

| Symptom | Task | Fix |
|---|---|---|
| `eas build` fails: "App Store Connect API key required" | T7 | Re-run T6 step 3, upload .p8 |
| Build succeeds, app crashes on launch | T10 | T5 step 1 missed (plist not in repo) OR T6 step 2 missed (secret not uploaded). Re-run T6 step 2, re-build (T7), re-submit (T8) |
| OTP never arrives on iOS but works on Android | T10 | T4 missed or wrong (APNs key not in Firebase, or wrong Key ID/Team ID) |
| `eas submit` fails: "Invalid bundle ID" | T8 | T1 step 3 — bundle ID typo. Verify `app.eru.consumer` matches in App Store Connect, app.config.js, and Firebase iOS app |
| Wife sees "This build is no longer available" | T9 | Apple's automated review found a privacy/encryption issue. App Store Connect → TestFlight → build → Issues. Usually one-click fix |
| First build is slow (~50 min) | T7 | Normal. Subsequent builds = ~25 min |
| Push not received | T11 | (a) iOS notification permission denied, (b) APNs key wrong. Settings → Eru → Notifications + recheck T4 |

---

## Success criteria

This plan is "done" when all checkboxes in Tasks 1-10 are checked. Task 11 is a stretch goal that confirms full push parity.

**Critical path (must work):** T1 → T5 → T6 → T7 → T8 → T9 → T10 (steps 1-4)
**Feature parity (should work):** T10 step 5 (phone OTP)
**Stretch (nice to have):** T11 (push notifications)

If T10 step 4 passes (app launches without crashing on wife's iPhone), the iOS build is real. Everything after that is feature wiring, not packaging.
