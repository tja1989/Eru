# GapFix Agent Protocol (P4–P10)

> Shared rules every phase doc (GapFixP4 through GapFixP10) inherits. Open this first, keep it open while executing a phase.

This file is the **operating contract** for any agent (human or AI) executing P4–P10. Phase docs link back here for every non-phase-specific rule. If a phase doc contradicts this file, this file wins unless the phase doc names an explicit override.

---

## 1. The Iron Law (TDD)

Lifted verbatim from the `superpowers:test-driven-development` skill:

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Every feature in every phase is a **RED → Verify RED → GREEN → Verify GREEN → REFACTOR → COMMIT** cycle. You never write `routes/foo.ts` before `tests/routes/foo.test.ts` exists and is failing for the right reason.

### The canonical cycle

1. **RED** — write one small failing test describing the desired behavior. One thing per test. Clear name. No "and" in the test name.
2. **Verify RED** — run it. Confirm it fails with the *expected* message (not a typo, not a missing import).
3. **GREEN** — write the *minimum* code to pass. No scope creep, no premature abstraction, no "while I'm here."
4. **Verify GREEN** — run the test + sibling tests. All green. Output pristine (no warnings, no deprecation notices).
5. **REFACTOR** — clean up without adding behavior. Tests stay green throughout.
6. **COMMIT** — one logical change. Tight, specific commit message. Co-authored footer per repo convention.

### Red flags — if you notice, stop and restart

- Code before test.
- Test added after implementation "to verify."
- Test passes immediately (it never failed → it's testing nothing).
- You can't explain *why* the test failed.
- Rationalization: "this is too simple to test" / "I'll test after" / "just this once."

All of those mean: delete the code, start over with RED.

---

## 2. Always audit existing implementation first

**This is specific to Eru.** The API has 26 routes, 18 services, 9 cron jobs, 28 Prisma models and ~24 mobile services. Before you write any new endpoint, component, or service, you must prove there isn't already one covering your use case.

### Per-feature audit checklist

Before writing tests for a new feature, run (and paste the results in your PR description):

```
# 1. API routes already registered
Grep: pattern="<feature-keyword>" path=apps/api/src/routes/

# 2. Services already implementing the logic
Grep: pattern="<feature-keyword>" path=apps/api/src/services/

# 3. Prisma models with similar fields
Grep: pattern="<feature-keyword>" path=apps/api/prisma/schema.prisma

# 4. Mobile services already calling an endpoint
Grep: pattern="<feature-keyword>" path=apps/mobile/services/

# 5. Components that render similar UI
Grep: pattern="<feature-keyword>" path=apps/mobile/components/

# 6. Shared types
Grep: pattern="<feature-keyword>" path=packages/shared/src/
```

If any of the six finds a match, **you extend existing code instead of creating new files.** Duplication is the bug this repo has bled from before (see `GapFix/Eru_Field_Drift_Lockdown.md`) — the answer is not another shim.

### What counts as "existing coverage"

- Route exists with the right path and auth gate? → extend its handler + shared type.
- Service exists with the business logic? → call it from your new route. Don't rewrite.
- Prisma model has the field or close? → add one column via `db push`, not a new model.
- Mobile service method exists and returns the right shape? → reuse, don't re-export.
- Component renders the visual? → pass new props, don't fork.

---

## 3. Shared-type contract lockdown (no drift)

Per `GapFix/Eru_Field_Drift_Lockdown.md`: 13 routes are contract-locked today. P4 locks the remaining ~13. Every new or changed API response in P4–P10 **must** pass through `packages/shared/src/types/` first.

### Four-step lockdown recipe (repeat per route)

1. Add or update the exact response type in `packages/shared/src/types/<topic>.ts`. Export it.
2. Annotate the Fastify handler: `async (req, reply): Promise<MySharedType> => {...}`. Any field rename now breaks the TypeScript build.
3. Import the same type in the mobile service: `async getFoo(): Promise<MySharedType>`.
4. Remove any `data.items ?? data.posts ?? data.content ?? []` fallback chains in the consumer. Read the canonical field directly.

Never re-introduce defensive fallback chains. If a field is missing from the API, the build *should* fail — that's the point.

---

## 4. TDD specifics for this repo

### API tests (Vitest)

- Use `getTestApp()` / `app.inject()` from `apps/api/tests/helpers/setup.ts`. Never `supertest`, never `fetch`.
- Seed users with `firebaseUid: 'dev-test-<slug>'` (must start with `dev-test-`). Authenticate with `devToken('dev-test-<slug>')`.
- Tests run with `ALLOW_DEV_TOKENS=true` in the env — this is already required for `npm test` in `apps/api`.
- `fileParallelism: false` in `vitest.config.ts` is deliberate — don't touch it.
- After any test that seeds `dev-test-*` data touching a new model, extend `tests/helpers/db.ts#cleanupTestData` with a FK-safe `deleteMany`. Children first, parents last.
- Known flakes: `wallet-tier`, `spin`, `sponsorship`, `stories`, `reels-following`, `leaderboard-friends`. If they fail in a full-suite run, re-run in isolation before assuming a regression.

### Mobile tests (Jest + jest-expo)

- `apps/mobile/__tests__/` mirrors `app/`, `components/`, `services/`, `stores/`.
- Default mocks you'll almost always need:

```ts
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/api');  // axios wrapper
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-me' } }),
}));
```

- Mock services that hit Firebase / expo-notifications / expo-image-picker **inside each test file** that renders a screen touching them. Jest module isolation won't inherit a global mock.
- **Snapshot tests are banned.** They reward false confidence. Assert on text, role, a11y label, or callback.
- **One behavior per test.** "and" in a test name → split it.

---

## 5. Playwright MCP for pixel-parity checks

The Playwright MCP server (`mcp__plugin_playwright_playwright__*`) is available. Use it to render the PWA screen side-by-side with the built mobile screen for visual comparison when you finish a pixel-parity task. **Playwright is a check, not a test** — the Jest/Vitest tests are still the gate.

### When to use Playwright

- After implementing a screen in P5–P10, when the TDD cycles for that screen are green.
- To compare the PWA mockup (file `/Users/USER/claude_tj/Eru/Eru_Consumer_PWA.html`) against the mobile screen running in a browser via `npx expo export` or a web-compatible build.
- To capture screenshots as evidence of parity in a PR description.

### Recipe

1. Open the PWA HTML in a browser tab:
   ```
   mcp__plugin_playwright_playwright__browser_navigate url="file:///Users/USER/claude_tj/Eru/Eru_Consumer_PWA.html"
   ```
2. Run `showScreen('<screen-id>')` via `browser_evaluate` to focus the target screen (the PWA is a single file with a showScreen() JS helper).
3. Take a screenshot with `browser_take_screenshot`.
4. Navigate to the mobile web build (or use the iOS simulator / device) and take the matching screenshot.
5. Paste both screenshots into the PR description. Diff visually.

### What Playwright does NOT replace

- It doesn't replace Jest / Vitest. TDD still runs first.
- It doesn't validate API behavior.
- It doesn't test native-only affordances (haptics, native gestures, push delivery).

---

## 6. Prisma conventions

This repo uses **`npx prisma db push`, not `migrate dev`.** There is no `prisma/migrations/` directory — P1 chose push for Supabase simplicity and every P since has followed. Don't introduce migrations now.

After every schema change:

```bash
cd apps/api
npx prisma db push          # apply schema to live dev DB
npx prisma generate         # regenerate client
```

When you add a new model that references `dev-test-*` users, you must extend `tests/helpers/db.ts#cleanupTestData` with a FK-safe `deleteMany`. Children first, parents last. Missing this is the #1 reason the full suite starts producing P2003 errors.

---

## 7. Commit conventions

Per repo `CLAUDE.md`:

- Format: `feat(api): add X`, `feat(mobile): add Y`, `fix(api|mobile): ...`, `test(...)`, `chore(...)`, `style(...)`.
- Scope each commit tightly: one route or one component per commit where practical.
- The commit message body explains *why*, not *what*. The diff shows what.
- Every commit ends with:
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- **Never** use `git add -A` or `git add .`. Always name specific files. Never commit `.DS_Store`, `.claude/`, `.expo/`, `Notes.md`, repo-root `app.json`, repo-root `tsconfig.json`, `DesignSystem/`, `Eru_Business_Dashboard.html`, `Eru_Consumer_PWA.html`, `DeferredWork/`.
- `main` is currently ~150 commits ahead of `origin`. Don't push without the user's explicit OK.

---

## 8. The PWA vs Dev Spec resolution rule

From the Dev Spec's closing line:

> Build against the Consumer PWA (20 screens) for visual fidelity. Build against this spec for logic, data, and APIs. When in doubt, the spec wins.

Operationally:

- If the PWA *shows* a visual element the Dev Spec doesn't mention → build it (visual fidelity).
- If the Dev Spec *specifies* an endpoint, field, or behavior the PWA doesn't show → implement it (logic).
- If they contradict → **Dev Spec wins**. Note the contradiction in the phase doc and move on.

References you'll open constantly:

- PWA: `/Users/USER/claude_tj/Eru/Eru_Consumer_PWA.html` (2866 lines, 20 screens by id `screen-<name>`).
- Dev Spec: `/Users/USER/claude_tj/Eru/Eru_Consumer_Dev_Spec_final.docx` (20 screens, 25 earning actions, data models, integration matrix).
- Field Drift Lockdown: `/Users/USER/claude_tj/Eru/GapFix/Eru_Field_Drift_Lockdown.md`.
- Project conventions: `/Users/USER/claude_tj/Eru/CLAUDE.md`.

---

## 9. Phase-completion gate

A phase is **done** when every item below is true:

- [ ] All tasks in the phase doc are checked off (`- [x]`).
- [ ] `cd apps/api && ALLOW_DEV_TOKENS=true npm test` is green (including the phase's new tests).
- [ ] `cd apps/mobile && npm test` is green.
- [ ] `cd apps/api && npx tsc --noEmit` shows 0 errors.
- [ ] `cd apps/mobile && npx tsc --noEmit` shows no *new* errors (the 6 pre-existing in CommentInput/SponsorshipCard/useNotifications are documented; unchanged is fine).
- [ ] For P5–P10: a Playwright side-by-side screenshot of the PWA vs mobile was captured for each screen in the phase.
- [ ] For any new or changed contract-locked route: the shared type was updated, the API handler annotated, the mobile service annotated, and any fallback chain removed.
- [ ] One commit per logical change; all commits follow repo convention.
- [ ] The phase's doc is updated (checklists, not the plan itself) to reflect what actually shipped.

---

## 10. Deferred items already known

Items flagged but intentionally not in P4–P10:

- **MediaConvert AWS key subscription** — production logs show transcode requests failing with "AWS Access Key Id needs a subscription for the service" (2026-04-20). Video uploads still succeed; only HLS variants skip. Tracked in `DeferredWork/` — touch only if a phase's scope explicitly requires working HLS (it doesn't).
- **Business Dashboard HTML** (`Eru_Business_Dashboard.html`) — not in scope for P4–P10. Gets its own plan later.
- **Dev Spec "25 earning actions" complete table** — Dev Spec refers to a v1 document for the full action/point/cap table. Each phase doc that involves earning credits references the subset it cares about; the full table is consolidated in P4 §6 for shared reference.
- **Linked Accounts OAuth (Instagram / Google)** — stays deferred per `DeferredWork/DWSet1.md` unless P5 (Settings) explicitly pulls it in.

---

## 11. Agent-first doc conventions in P4–P10

Every phase doc follows this shape so an agent can pick it up cold:

1. **Goal** — one paragraph.
2. **Prerequisites** — checkbox list referencing prior phases.
3. **Existing-implementation audit** — specific greps to run first, with expected results table.
4. **Gap inventory** — what's truly missing per screen after the audit.
5. **Shared-type additions** — exact new types to add in `packages/shared/src/types/`.
6. **Feature sections** — each with: file list, TDD tasks with actual test code, implementation sketches, commit list.
7. **Playwright smoke** — per-screen side-by-side check.
8. **Acceptance criteria** — binary checks.
9. **Commit checklist** — expected commit sequence.

If any phase doc omits one of these sections, it's a bug in the doc. File it as a change request rather than inventing content.
