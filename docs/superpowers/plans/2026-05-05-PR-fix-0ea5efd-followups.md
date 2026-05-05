# Fix Plan: 0ea5efd Follow-ups

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps an audit flagged in TJ's commit `0ea5efd` so the same bugs (Samsung tab-bar overlap, exposed phone-handles, killed-app-mid-onboarding leak) don't return on future feature work.

**Architecture:** 5 small, independent fixes — keyboard tab-bar handling, an `edgeToEdgeEnabled` pin in `app.config.js`, a fail-safe default in `useAuth`, a `formatHandle()` adoption sweep across 9 bypassing sites, an ESLint rule that blocks the bypass pattern, and an `npm` script for the backfill. Each commits independently and is reviewed independently.

**Tech Stack:** React Native + expo-router, Zustand `useAuthStore`, ESLint with `no-restricted-syntax`.

**Spec context:** Audit findings recorded in this conversation. **NOT** in scope for this branch: the IG visual aesthetic alignment (tab bar still hardcoded `'#fff'`, emoji tab icons, multi-color Personalize palette). Those belong to the PR-A series (`docs/superpowers/specs/2026-05-05-eru-ig-aesthetic-design.md`) and are deferred.

---

## File structure

**Modified:**
- `apps/mobile/app/(tabs)/_layout.tsx` — add `tabBarHideOnKeyboard: true`
- `apps/mobile/app.config.js` — pin `android.edgeToEdgeEnabled: true`
- `apps/mobile/hooks/useAuth.ts` — change `?? false` to `?? true` for `needsHandleChoice`
- `apps/mobile/__tests__/screens/root-layout.test.tsx` — extend test for the new fail-safe default (if existing test asserts the false default)
- 9 files: replace literal `` `@${username}` `` / `@{username}` patterns with `formatHandle(username)` calls (full list in Task 3)
- `apps/mobile/.eslintrc.js` (or equivalent) — add `no-restricted-syntax` rule
- `apps/api/package.json` — add `db:backfill-handles` script entry

**Created:**
- (None — all changes are edits)

---

## Task 1: Tab-bar keyboard handling + edge-to-edge pin

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/app.config.js`

- [ ] **Step 1: Read current state**

```bash
cat /Users/USER/claude_tj/Eru/apps/mobile/app/\(tabs\)/_layout.tsx
cat /Users/USER/claude_tj/Eru/apps/mobile/app.config.js
```

Find the `Tabs` component's `screenOptions` block. Find the `android` block in `app.config.js`.

- [ ] **Step 2: Add `tabBarHideOnKeyboard` to screenOptions**

In `apps/mobile/app/(tabs)/_layout.tsx`, find the `<Tabs screenOptions={{...}}>` JSX block and add the new key:

```typescript
<Tabs
  screenOptions={{
    headerShown: false,
    tabBarHideOnKeyboard: true,  // <— NEW
    tabBarStyle: [styles.tabBar, { height: 56 + insets.bottom, paddingBottom: insets.bottom }],
    // ... existing keys
  }}
>
```

(Keep all existing keys intact. The new key goes anywhere in the object; placing it adjacent to `tabBarStyle` keeps tab-bar concerns grouped.)

- [ ] **Step 3: Pin `edgeToEdgeEnabled` in app.config.js**

In `apps/mobile/app.config.js`, find the `android: { ... }` block and add `edgeToEdgeEnabled: true` if missing:

```javascript
android: {
  // ... existing keys (adaptiveIcon, package, googleServicesFile)
  edgeToEdgeEnabled: true,  // <— NEW: pin behavior so SDK upgrades don't silently disable
},
```

If a value is already there explicitly (true or false), DO NOT change it; report instead and STOP — that's a NEEDS_CONTEXT moment because someone else's intent is encoded.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 5: Verify Expo config still parses**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx expo config --type prebuild 2>&1 | head -30
```
Expected: prints valid config without errors. If `npx expo config` is unavailable, skip this step (not blocking).

- [ ] **Step 6: Commit**

```bash
cd /Users/USER/claude_tj/Eru
git add apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/app.config.js
git commit -m "$(cat <<'EOF'
fix(mobile): tab-bar keyboard handling + pin Android edge-to-edge

Two follow-ups to 0ea5efd flagged by audit:

1. tabBarHideOnKeyboard: true — on Samsung devices with the default
   adjustResize keyboard mode, the tab bar can float above the keyboard
   while a TextInput is focused. Hiding the bar while the keyboard is
   visible is the standard fix; matches IG / WhatsApp / Twitter behavior.

2. android.edgeToEdgeEnabled: true — SDK 54 currently defaults to
   edge-to-edge, but pinning it explicitly protects against a future
   SDK upgrade silently flipping it off, at which point insets.bottom
   would become 0 and the Samsung overlap bug would silently return.
   Behavior contract is now documented in code, not implicit in SDK
   defaults.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: useAuth fail-safe default for needsHandleChoice

**Files:**
- Modify: `apps/mobile/hooks/useAuth.ts`
- Maybe modify: `apps/mobile/__tests__/screens/root-layout.test.tsx` (only if it asserts the old default)

- [ ] **Step 1: Read the current useAuth hook**

```bash
cat /Users/USER/claude_tj/Eru/apps/mobile/hooks/useAuth.ts
```

Find the line that resolves `needsHandleChoice`. The audit identified it at line ~15:

```typescript
const needsHandleChoice = user?.needsHandleChoice ?? false;
```

- [ ] **Step 2: Switch the default to fail-safe**

Replace the `?? false` with `?? true`:

```typescript
// Default to true so a partial-onboarding crash (token persisted before
// user record fully populated) bounces the user back to Personalize
// rather than letting them slip into the tabs with no handle. The flag
// gets cleared the moment they pick a real handle.
const needsHandleChoice = user?.needsHandleChoice ?? true;
```

- [ ] **Step 3: Check existing tests for the old default**

```bash
grep -rn "needsHandleChoice" /Users/USER/claude_tj/Eru/apps/mobile/__tests__/ 2>/dev/null | head -10
```

If any test asserts `needsHandleChoice` is `false` when `user` is undefined, update the assertion to `true` and add a comment explaining the fail-safe behavior. If no test references the old default, no test changes needed.

- [ ] **Step 4: Run the affected test(s)**

If you modified a test file, run that file specifically:

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npm test -- root-layout 2>&1 | tail -15
```

Expected: passes.

If no test was modified, run the broader auth-related suite:

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npm test -- useAuth otp 2>&1 | tail -15
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/USER/claude_tj/Eru
git add apps/mobile/hooks/useAuth.ts
# also stage the test file if modified
git commit -m "$(cat <<'EOF'
fix(mobile): default needsHandleChoice to true (fail-safe gate)

Audit found a race in 0ea5efd's onboarding gate: if the user kills the
app between setToken() and setUser() in otp.tsx, the persisted state
has the auth token but user.needsHandleChoice is undefined. The old
?? false default let undefined slip through as "doesn't need to pick"
— exactly the killed-app-mid-onboarding case the original fix claimed
to cover.

Switched to ?? true (fail-safe). The user is bounced to Personalize
until the flag is explicitly proven false. The flag is cleared in a
single chokepoint (PATCH /users/me/settings) when they pick a handle,
so this default never persists past one extra Personalize visit even
in the rare partial-state case.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: formatHandle() adoption sweep

**Files (9 sites flagged by audit):**
- `apps/mobile/app/settings/index.tsx:615`
- `apps/mobile/app/(tabs)/profile.tsx:182`
- `apps/mobile/app/(tabs)/explore.tsx:175`
- `apps/mobile/app/(tabs)/reels.tsx:223`
- `apps/mobile/app/users/[id].tsx:88` and `:111`
- `apps/mobile/components/UserTagPicker.tsx:104` and `:165`
- `apps/mobile/components/LeaderboardPodium.tsx:52`
- `apps/mobile/app/(tabs)/create.tsx:337`

- [ ] **Step 1: Read formatHandle for the API contract**

```bash
cat /Users/USER/claude_tj/Eru/apps/mobile/utils/formatHandle.ts
```

Confirm the helper signature. Likely `formatHandle(username: string | null | undefined): string` returning `'@username'` or `''`. If different, adapt the call sites accordingly.

- [ ] **Step 2: Sweep each site**

For each file in the 9-site list, perform the same mechanical edit pattern:

**Pattern A — JSX text:**

Before:
```tsx
<Text>@{user?.username ?? '—'}</Text>
```
After:
```tsx
<Text>{formatHandle(user?.username) || '—'}</Text>
```

**Pattern B — template-literal callback:**

Before:
```tsx
{taggedUsers.map(u => `@${u.username}`).join(', ')}
```
After:
```tsx
{taggedUsers.map(u => formatHandle(u.username)).filter(Boolean).join(', ')}
```

**Pattern C — accessibility / aria labels:**

Before:
```tsx
accessibilityLabel={`${item.name} @${item.username}`}
```
After:
```tsx
accessibilityLabel={`${item.name} ${formatHandle(item.username)}`}
```

For each file, ALSO add the import at the top:

```typescript
import { formatHandle } from '../../utils/formatHandle';
```

(Adjust the relative path per the file's depth — utility test cases or `@/utils/formatHandle` alias if the file already uses `@/` imports.)

- [ ] **Step 3: Verify all sites are updated**

```bash
grep -rnE "@\{[a-zA-Z_.\?]+\.username|`@\$\{[^}]+\.username\}`" /Users/USER/claude_tj/Eru/apps/mobile --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v __tests__ | grep -v node_modules | grep -v formatHandle.ts
```

Expected: empty output. If any site remains, sweep it. The 6 sites already using `formatHandle()` (PostCard, StoryRow, ConversationRow, BusinessReplyCard, post comment, story viewer) are excluded by `formatHandle.ts` filter.

- [ ] **Step 4: TypeScript + tests**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx tsc --noEmit
cd /Users/USER/claude_tj/Eru/apps/mobile && npm test 2>&1 | tail -10
```
Expected: tsc exit 0, no NEW test failures.

- [ ] **Step 5: Commit**

```bash
cd /Users/USER/claude_tj/Eru
git add apps/mobile/app/settings/index.tsx \
        apps/mobile/app/\(tabs\)/profile.tsx \
        apps/mobile/app/\(tabs\)/explore.tsx \
        apps/mobile/app/\(tabs\)/reels.tsx \
        apps/mobile/app/users/\[id\].tsx \
        apps/mobile/components/UserTagPicker.tsx \
        apps/mobile/components/LeaderboardPodium.tsx \
        apps/mobile/app/\(tabs\)/create.tsx
git commit -m "$(cat <<'EOF'
fix(mobile): adopt formatHandle() across 9 bypassing sites

0ea5efd introduced formatHandle() as a single-source-of-truth helper
for rendering @handle, but only 6 components actually used it. Audit
found 9 more sites still hand-rolling `@${username}` — exactly the
inconsistency pattern that lets handle-rendering bugs return whenever
a new feature is added. Sites swept:

- app/settings/index.tsx (account row)
- app/(tabs)/profile.tsx (top bar handle)
- app/(tabs)/explore.tsx (search results)
- app/(tabs)/reels.tsx (creator overlay)
- app/users/[id].tsx (header + bio handle, 2 sites)
- components/UserTagPicker.tsx (chip + suggestion row, 2 sites)
- components/LeaderboardPodium.tsx (podium label)
- app/(tabs)/create.tsx (tagged-users summary)

Each now imports and calls formatHandle(username), the same as the
original 6 consumers. Task 4 lands an ESLint rule that prevents the
literal pattern from returning in future code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: ESLint rule blocking literal `@${...username}` pattern

**Files:**
- Modify: `apps/mobile/.eslintrc.js` OR `apps/mobile/eslint.config.js` (whichever exists)

- [ ] **Step 1: Find the ESLint config**

```bash
ls /Users/USER/claude_tj/Eru/apps/mobile/{.eslintrc*,eslint.config*} 2>&1 | head -5
```

Read the file. Identify the existing `rules` block.

- [ ] **Step 2: Add `no-restricted-syntax` rule**

Append (or extend) the rules block with:

```javascript
rules: {
  // ... existing rules
  'no-restricted-syntax': [
    'error',
    {
      // Match: TemplateLiteral starting with literal `@` followed by
      // any expression accessing `.username`. Forces consumers through
      // the formatHandle() helper so handle rendering stays consistent.
      selector: 'TemplateLiteral[quasis.0.value.cooked=/^@/][expressions.0.property.name=\'username\']',
      message: 'Use formatHandle(username) instead of `@${...username}` to keep handle rendering consistent. See apps/mobile/utils/formatHandle.ts.',
    },
    {
      // Match: JSXExpressionContainer that's a literal `@{...username}`
      // pattern in JSX text (the JSX-text equivalent of the above).
      selector: 'JSXText[value=/^\\s*@\\s*$/] + JSXExpressionContainer',
      message: 'Use {formatHandle(username)} instead of @{username} to keep handle rendering consistent.',
    },
  ],
},
```

(If the existing config uses a different format — `rules` already has entries — preserve them. If `no-restricted-syntax` already exists with other items, append the two new objects to its array rather than overwriting.)

- [ ] **Step 3: Verify the rule fires on a known bad pattern**

Create a temp file to test the rule (delete after):

```bash
cat > /tmp/eslint-test.tsx <<'EOF'
const x = `@${user.username}`;
EOF
cd /Users/USER/claude_tj/Eru/apps/mobile && npx eslint /tmp/eslint-test.tsx 2>&1 | tail -5
rm /tmp/eslint-test.tsx
```

Expected: eslint reports the new rule firing with the custom message.

If it doesn't fire:
- The selector syntax may need adjustment for your ESLint version; try `TemplateLiteral[quasis.0.value.raw=/^@/]`.
- Check via `npx eslint --print-config /tmp/eslint-test.tsx | grep -A3 no-restricted-syntax` that the rule is being loaded.

If you cannot get the rule to fire after 2-3 attempts, STOP and report — the rule isn't working but the underlying enforcement isn't a blocker for the fix branch (Task 3 already swept the sites). Mark this task DONE_WITH_CONCERNS.

- [ ] **Step 4: Run lint on the codebase to confirm no false positives**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx eslint . 2>&1 | tail -20
```

Expected: no errors from the new rule (Task 3 already removed every bad-pattern site). If errors, the new rule is matching a site we forgot to sweep — fix it and add to the Task 3 commit (amend or follow-up commit).

- [ ] **Step 5: Commit**

```bash
cd /Users/USER/claude_tj/Eru
git add apps/mobile/.eslintrc.js  # or eslint.config.js
git commit -m "$(cat <<'EOF'
chore(mobile): ESLint rule prevents literal @${username} pattern

Locks the formatHandle() invariant: any new feature that tries to
hand-roll @handle rendering will fail lint immediately, with a message
pointing to the helper. This is the second half of the Task 3 sweep —
the sweep cleaned up the 9 existing bypasses, this rule prevents
new ones from sneaking in.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: npm script for the backfill

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Read the current scripts block**

```bash
grep -A15 '"scripts"' /Users/USER/claude_tj/Eru/apps/api/package.json | head -20
```

- [ ] **Step 2: Add the `db:backfill-handles` script**

In `apps/api/package.json`, add to the `scripts` object:

```json
"db:backfill-handles": "tsx src/scripts/backfill-handles.ts",
```

(Match the existing script style — `tsx` is already used by `db:seed`, `db:seed-reels`, etc.)

- [ ] **Step 3: Verify the script runs (dry sanity check)**

```bash
cd /Users/USER/claude_tj/Eru/apps/api && npm run db:backfill-handles --dry-run 2>&1 | head -10
```

If the script doesn't have a `--dry-run` flag, just verify it can be invoked (it'll connect to the DB and may modify rows — be careful):

```bash
cd /Users/USER/claude_tj/Eru/apps/api && npm run db:backfill-handles 2>&1 | head -5
```

(This will actually run the backfill. If the DB has `user_<phone>` rows, they'll be renamed. That may or may not be desired in dev. If you're uncertain, **skip this step** — the npm-script wiring is the deliverable, not the actual backfill execution.)

If the script errors with "Cannot find module 'tsx'" — `tsx` isn't installed. Check `apps/api/package.json` `devDependencies`. The other `db:seed*` scripts also use it, so it should be there.

- [ ] **Step 4: Commit**

```bash
cd /Users/USER/claude_tj/Eru
git add apps/api/package.json
git commit -m "$(cat <<'EOF'
chore(api): add db:backfill-handles npm script

The backfill-handles.ts script (added in 0ea5efd) renames legacy
user_<10digits> rows to memorable adj_noun_NNN handles. It was a
bare tsx invocation, easy to forget at deploy time. Promoting to a
named npm script (matches the db:seed family pattern) so the deploy
runbook can reference `npm run db:backfill-handles` instead of a
file path that may move.

Without this script being run on the production DB, every existing
user with a user_<phone> handle gets force-bounced to Personalize
on next OTP login (which is correct behavior for the IG-style
handle migration, but should be predictable).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification + push branch + open PR

- [ ] **Step 1: Full mobile tsc + tests**

```bash
cd /Users/USER/claude_tj/Eru/apps/mobile && npx tsc --noEmit; echo "tsc: $?"
cd /Users/USER/claude_tj/Eru/apps/mobile && npm test 2>&1 | tail -8
```
Expected: tsc exit 0; test count matches the post-0ea5efd baseline (572 + new tests if any).

- [ ] **Step 2: Diff stat sanity**

```bash
cd /Users/USER/claude_tj/Eru
git diff --stat main..HEAD
git log --oneline main..HEAD
```

Expected: 5 commits, ~12-15 files changed, +60/-30 LOC ish. Each commit small and focused.

- [ ] **Step 3: Push branch**

```bash
git push -u origin fix/0ea5efd-followups
```

- [ ] **Step 4: Open PR**

```bash
gh pr create --base main --head fix/0ea5efd-followups \
  --title "fix(mobile,api): close 5 gaps from 0ea5efd audit" \
  --body "$(cat <<EOF
## Summary
Audit of \`0ea5efd\` flagged 5 follow-up issues: keyboard-overlap on Samsung tab bar, an SDK-upgrade footgun on edge-to-edge, a race condition in the onboarding gate, 9 sites bypassing the formatHandle() helper, and a missing npm script for the backfill.

This PR closes all 5. Each commit is small, focused, and independently revertible.

## Commits
1. \`fix(mobile): tab-bar keyboard handling + pin Android edge-to-edge\`
2. \`fix(mobile): default needsHandleChoice to true (fail-safe gate)\`
3. \`fix(mobile): adopt formatHandle() across 9 bypassing sites\`
4. \`chore(mobile): ESLint rule prevents literal \\\`@\\\${username}\\\` pattern\`
5. \`chore(api): add db:backfill-handles npm script\`

## What this PR does NOT do
- IG aesthetic alignment (theme migration, Ionicons swap, Personalize visual rework) — that's the PR-A series, deferred.
- Visual changes — none. This is bug-fixes-and-locks only.

## Test plan
- [x] tsc clean
- [x] All 572+ tests pass
- [x] formatHandle sweep grep returns empty post-Task-3
- [x] ESLint rule fires on a temp bad-pattern file
- [ ] Device test: install fresh user, kill app between OTP and Personalize, reopen → expect bounce to Personalize (not silent slip into tabs)
- [ ] Device test: open a TextInput on Samsung phone, observe tab bar hides while keyboard is up

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review checklist

1. **Audit coverage:** Each of the 5 issues from the audit gets exactly one task. ✓
2. **Placeholder scan:** No TBDs; every step has actual code or commands. ✓
3. **Type consistency:** `needsHandleChoice` stays boolean throughout; `formatHandle` signature respected. ✓
4. **Commit independence:** Each commit can be reverted in isolation without breaking earlier ones. ✓
5. **Scope discipline:** No IG-aesthetic work, no theme migration, no Personalize visual rework. ✓

---

## What could go wrong

| Risk | Mitigation |
|---|---|
| ESLint rule selector syntax is wrong for the project's parser | Task 4 has a fallback (DONE_WITH_CONCERNS) — the sweep in Task 3 already cleaned up existing bypasses, so the rule is enforcement, not cleanup |
| `useAuth.ts` test asserts old default | Task 2 step 3 explicitly checks for this and updates if needed |
| `formatHandle` import path varies across files (some use `@/`, some use relative) | Task 3 step 2 instructs adjusting per-file |
| Backfill script can't be safely run in dev | Task 5 step 3 explicitly says skip the actual run if uncertain — only the npm wiring is the deliverable |
| ESLint already has `no-restricted-syntax` with other entries | Task 4 step 2 instructs appending to the array, not overwriting |
| Some of the 9 sites in Task 3 already use a different pattern (e.g. inline string concat) | Task 3 covers Patterns A/B/C; if a 4th pattern shows up, the implementer should ask before guessing |

---

## After this plan

The branch merges. The IG aesthetic work continues as the PR-A series (already specced + planned). Nothing in this PR blocks the resumption.
