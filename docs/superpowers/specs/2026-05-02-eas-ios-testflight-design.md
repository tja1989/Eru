# EAS iOS Build → TestFlight Design

**Date:** 2026-05-02
**Goal in one sentence:** Make Eru work on iOS with feature parity to the current Android experience, distributed via TestFlight to a small group of beta testers using EAS Build.

---

## Goal

Eru currently works on Android via EAS Build. This design covers what's needed to build the same app for iOS, distribute it via TestFlight, and reach feature parity with Android — specifically including Firebase Phone Auth and push notifications, which require iOS-specific Apple credentials beyond just the build pipeline.

## Context

- **Repo state:** Expo SDK 54 monorepo, mobile app at `apps/mobile/`. iOS bundle ID `app.eru.consumer` already configured in `app.config.js`. EAS project (`5fb96f5e-8595-40ac-a854-07f89029aa07`) exists; `eas.json` currently has Android build/submit profiles only.
- **Apple Developer Program:** Active under `aflolabs@gmail.com`. Individual enrollment, approved 2026-05-02.
- **Test devices:** TJ has a Mac (for iOS Simulator sanity-checks). Wife's iPhone available as TestFlight tester device using her separate Apple ID — Apple's tester model allows this without merging accounts.
- **Tooling decision:** EAS Build (Expo's cloud Mac, free tier ~30 iOS builds/month). Codemagic was considered and rejected as redundant given existing EAS setup.
- **User preference:** TJ self-describes as a vibe coder — wants the design to be sound but isn't going to micromanage individual config decisions.

## Architecture

```
┌──────────────┐    ┌─────────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ TJ's Mac     │ ──► EAS Build (cloud │ ──► App Store Connect    │ ──► TestFlight app   │
│ (eas build)  │    Mac in Expo cloud)│    (Apple's web app)     │    (testers' iPhones)│
└──────────────┘    └─────────────────┘    └────────────────────┘    └──────────────────┘
       │                    ▲                       ▲
       │                    │                       │
       │              uses Apple                   uses
       │              cert + profile               App Store Connect
       │              (auto-managed                API key (.p8)
       │              by EAS)                      stored in EAS
       │
       ▼
   GitHub repo
   (codemagic.yaml NOT present;
    eas.json + app.config.js
    define the build)
```

**Plain English:**
- TJ runs `eas build` from his Mac terminal. The command does NOT build locally — it uploads the source to EAS's cloud Mac, which compiles, signs, and produces an `.ipa` file.
- EAS uses cached Apple certificates (set up once via `eas credentials`) to sign the build.
- TJ then runs `eas submit` to upload the `.ipa` to App Store Connect.
- Apple processes the upload (~10 min), then makes it available in TestFlight.
- Testers install via the TestFlight app on their iPhones.

## Scope

**In scope:**
- iOS build pipeline via EAS Build
- TestFlight distribution to internal testers (including TJ's wife)
- Firebase Phone Auth working on iOS (requires APNs key)
- Push notifications working on iOS via `expo-notifications` (requires APNs key)
- Firebase iOS config (`GoogleService-Info.plist`)
- App Store Connect app record creation
- Apple distribution certificate + provisioning profile (auto-managed by EAS)

**Out of scope (explicitly):**
- App Store production submission (TestFlight only)
- Apple Pay / In-App Purchases
- Sign in with Apple
- iPad-specific UI (`ios.supportsTablet: false` is intentional)
- iCloud / iCloud Drive integration
- Migrating to Organization-tier Apple Developer account
- External (non-Apple-ID) testers — internal testers only for now

## Repo changes

Only three repo touches required. Listed in dependency order.

### 1. Edit `apps/mobile/app.config.js`

Add `ios.googleServicesFile` so the Firebase iOS config is wired into the iOS build:

```diff
   ios: {
     supportsTablet: false,
     bundleIdentifier: 'app.eru.consumer',
+    googleServicesFile: process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
   },
```

The pattern mirrors the existing `android.googleServicesFile`: env-var override for EAS (which injects the file from a Secret), local fallback for `expo run:ios` development.

### 2. Edit `apps/mobile/eas.json`

Add `ios` block to the existing `preview` build profile and to the `submit.production` profile:

```diff
   "build": {
     ...
     "preview": {
       "distribution": "internal",
       "android": { "buildType": "apk" },
+      "ios": {
+        "simulator": false,
+        "resourceClass": "m-medium"
+      },
       "env": {
         "EXPO_PUBLIC_API_URL": "https://eruapi-production.up.railway.app"
       }
     },
     ...
   },
   "submit": {
     "production": {
       "android": {
         "serviceAccountKeyPath": "./google-play-key.json",
         "track": "internal"
       },
+      "ios": {
+        "ascAppId": "<filled in after App Store Connect record created>",
+        "appleTeamId": "<filled in from developer.apple.com>"
+      }
     }
   }
```

`ascAppId` is a numeric ID generated by App Store Connect when the app record is created. `appleTeamId` is a 10-character string visible on developer.apple.com. Both are not secret; safe to commit.

The App Store Connect API key (`.p8`) is uploaded once via `eas credentials` and stored in EAS — not referenced from `eas.json`, not committed.

### 3. Add `apps/mobile/GoogleService-Info.plist` (gitignored)

Downloaded from Firebase Console after registering the iOS app. Should be added to `.gitignore` parallel to `google-services.json` (already gitignored). For EAS Build, the file's contents are uploaded as an EAS Secret named `GOOGLE_SERVICES_INFO_PLIST`, which the dynamic `app.config.js` reads at build time.

## External setup (one-time)

### Apple side (App Store Connect + developer.apple.com)

| Step | Where | What | Output |
|---|---|---|---|
| 1 | App Store Connect → My Apps → "+" | Create app record. Bundle ID `app.eru.consumer`, name "Eru", primary language English, SKU `eru-001` | Numeric `ascAppId` (e.g. `1234567890`) |
| 2 | App Store Connect → Users and Access → Keys | Generate API Key. Name "EAS Submit", role "App Manager" | `.p8` file (download once, Apple won't show again) + Key ID + Issuer ID |
| 3 | developer.apple.com → Certificates, Identifiers & Profiles → Keys | Create APNs Authentication Key. Name "Eru APNs". Enable "Apple Push Notifications service (APNs)" | `.p8` file + Key ID + Team ID |
| 4 | App Store Connect → My Apps → Eru → App Information | Note the Apple Team ID (10-char string, e.g. `ABCD123456`) | `appleTeamId` for eas.json |

The two `.p8` files from steps 2 and 3 are different keys with different purposes:
- **Step 2 `.p8`** = App Store Connect API key (lets EAS upload builds for you)
- **Step 3 `.p8`** = APNs key (lets Firebase send push notifications to your iOS app)

### Firebase side (Firebase Console with `aflolabs@gmail.com`)

| Step | Where | What |
|---|---|---|
| 1 | Project Overview → Add app → iOS | Register iOS app. Bundle ID `app.eru.consumer`. Nickname "Eru iOS" |
| 2 | After registration | Download `GoogleService-Info.plist`. Place at `apps/mobile/GoogleService-Info.plist`. Confirm gitignored. |
| 3 | Project Settings → Cloud Messaging → Apple app configuration | Upload APNs Authentication Key (.p8 from Apple step 3). Enter Key ID + Team ID. |

Step 3 is what makes Firebase Phone Auth work on iOS — Firebase uses silent push notifications for verification, which requires the APNs key.

### Expo / EAS side (TJ's Mac)

| Step | Command | What |
|---|---|---|
| 1 | `eas login` | Logs into Expo account `eru_aflo` (already exists per CLAUDE.md) |
| 2 | `eas secret:create --scope project --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./apps/mobile/GoogleService-Info.plist` | Uploads Firebase iOS config as an EAS Secret. EAS will write it back to a temp file during builds, the path of which gets injected into `process.env.GOOGLE_SERVICES_INFO_PLIST`. |
| 3 | `eas credentials` | Interactive — pick iOS, pick the "preview" profile, choose "Set up build credentials." Upload the App Store Connect API key (.p8 from Apple step 2) when prompted. EAS auto-generates the iOS distribution certificate and provisioning profile. |
| 4 | First build | `cd apps/mobile && eas build --platform ios --profile preview` |

## Build & submit flow (recurring loop)

After all one-time setup is done:

```
1. Make code changes
2. (Optional) Sanity-test in iOS Simulator:
     cd apps/mobile && npx expo run:ios
3. Trigger cloud build:
     cd apps/mobile && eas build --platform ios --profile preview
   → ~25 min wait, EAS emails on completion
4. Submit to TestFlight:
     eas submit --platform ios --latest
   → ~10 min for App Store Connect processing
5. (First time per tester) In App Store Connect → TestFlight → Internal Testing,
   add tester Apple IDs (wife's, friends', etc.)
6. Tester gets email → opens TestFlight app → taps Install → app appears
7. Borrow tester's iPhone → tap around → file feedback → loop back to step 1
```

## Feature parity matrix

| Feature | Android (today) | iOS (after this design) | Notes |
|---|---|---|---|
| Firebase Phone Auth (OTP) | Works | Works after APNs key uploaded to Firebase | iOS uses silent push for verification, not SMS reCAPTCHA |
| Push notifications (`expo-notifications`) | Works (FCM) | Works after APNs key + push entitlement | `useNotifications.ts` already gates on `executionEnvironment` |
| AWS S3 media uploads | Works | Works (no iOS-specific config) | Same JS code |
| Reels / video playback | Works | Works | `expo-video` is cross-platform |
| Hermes JS engine | Enabled | Enabled | `jsEngine: 'hermes'` works on iOS |
| New React Native architecture | Enabled | Enabled | `newArchEnabled: true` works on iOS |
| Firebase static frameworks | Configured | Same | `useFrameworks: 'static'` already in `expo-build-properties` |
| Deep links (`scheme: 'eru'`) | Works | Works | Same scheme registered for iOS in app.config.js |

No iOS-specific JavaScript code is expected to be needed. The whole design is configuration, not code.

## Secrets management

| Secret | Stored where | In repo? |
|---|---|---|
| Apple ID password (aflolabs@gmail.com) | TJ's head + Apple's 2FA | No |
| App Store Connect API key (.p8) | EAS credentials store (uploaded once) | No |
| APNs Authentication Key (.p8) | Apple Developer + Firebase Console (uploaded once) | No |
| Apple distribution certificate | EAS credentials store (auto-generated) | No |
| Apple provisioning profile | EAS credentials store (auto-generated) | No |
| `GoogleService-Info.plist` | EAS Secret `GOOGLE_SERVICES_INFO_PLIST` + local copy at `apps/mobile/GoogleService-Info.plist` (gitignored) | No |
| `ascAppId` | `eas.json` | Yes (not secret — public app identifier) |
| `appleTeamId` | `eas.json` | Yes (not secret — public team identifier) |

**Nothing sensitive is committed.** The only `eas.json` additions are public identifiers.

## What could go wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| `eas build` fails: "Apple authentication required" | Step 2 of Apple setup skipped (App Store Connect API key not uploaded) | Run `eas credentials`, upload `.p8` |
| Build succeeds, app crashes on launch with `FirebaseApp configuration not found` | `GoogleService-Info.plist` missing or not wired into `app.config.js` | Verify Firebase step 2 + repo change 1 |
| Phone OTP login spins forever on iOS but works on Android | APNs key not uploaded to Firebase (Apple step 3 + Firebase step 3) | Upload APNs key in Firebase Console → Cloud Messaging |
| Push notifications never arrive on iOS | Same as above + push capability not enabled on App Store Connect app record | Enable Push Notifications capability in App Store Connect → My Apps → Eru → Capabilities |
| `eas submit` fails: "Invalid bundle ID" | Bundle ID mismatch between `app.config.js` and App Store Connect | Verify `app.eru.consumer` in both places, re-create App Store Connect record if needed |
| Tester gets no TestFlight email | Wrong Apple ID added, or email in spam | Re-check exact Apple ID email in App Store Connect → TestFlight → Internal Testers |
| First iOS build is slow (~50+ min) | Normal — fresh CocoaPods cache on EAS | Subsequent builds take ~25 min |
| `eas build` succeeds locally but fails on EAS with "GOOGLE_SERVICES_INFO_PLIST not set" | EAS Secret was created but the build profile isn't picking it up | Check `eas secret:list`; ensure the secret is `--scope project` not `--scope account` |
| TestFlight build shows "Missing Compliance" | Apple's encryption export compliance question | Add `ios.config.usesNonExemptEncryption: false` to `app.config.js` if app uses only standard HTTPS (it does) |
| Wife's TestFlight install button is greyed out | Build still processing OR she's on too-old iOS | Wait 10 min after submit; verify her iOS version meets app.config minimum (iOS 13+ default) |

## Open questions / decisions deferred

- **External testers (>10 people, public-ish beta):** Out of scope for now. Internal testers (up to 100, no Apple review) covers the immediate need. External testing flow can be added later.
- **CI automation (auto-build on git push):** Out of scope. Manual `eas build` from TJ's Mac is sufficient for current pace.
- **Production App Store release:** Will be a separate design when Eru is ready for public launch.

## Success criteria

This design is "done" when, in order:

1. `eas build --platform ios --profile preview` completes without error and produces an `.ipa`
2. `eas submit --platform ios --latest` completes without error and the build appears in App Store Connect → TestFlight
3. TJ's wife's Apple ID can install the app via TestFlight on her iPhone
4. The app launches without crashing
5. Phone OTP login completes successfully on her iPhone
6. (Stretch) A push notification sent from the API arrives on her iPhone

Steps 1–4 are blocking; 5 verifies APNs is wired correctly; 6 confirms full feature parity for the auth+notifications path.
