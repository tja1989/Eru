# GapFix — Business Dashboard (BD)

Owner-facing business dashboard implementation. Source of truth for the autonomous reviewer loop. The reviewer agent ticks items off only when the corresponding API + mobile tests and `tsc --noEmit` are green.

Spec source: `Eru_Business_Dashboard.html` (17 screens).
Reuse audit + architecture: see the approved ultraplan in the conversation that introduced this file.

---

## Conventions for the reviewer

- One task = one RED → GREEN → commit cycle.
- Each task references the file(s) it must create or modify.
- "Done" means: tests for that task pass + `npx tsc --noEmit` clean in `apps/api` and `apps/mobile` (no NEW errors beyond the 6 pre-existing) + one focused commit.
- Never use `git add -A` or `.`; name files explicitly per CLAUDE.md.
- Schema changes apply with `npx prisma db push` (not migrate).
- Always update `packages/shared/src/types/biz.ts` BEFORE the API handler — field-drift lockdown.

---

## Phase B1 — Schema + auth gate

- [x] **B1.1** Prisma: add `enum CampaignType`, `enum CampaignStatus`, `model Campaign`, `model CampaignEvent`, `model BusinessPlan`, `model BusinessTransaction`, plus `Business.targetPincodes String[]`. Wire all relations to `Business`. Run `npx prisma db push` + `npx prisma generate`.
  - Files: `apps/api/prisma/schema.prisma`.
- [x] **B1.2** Extend `tests/helpers/db.ts#cleanupTestData` to delete in FK-safe order: `CampaignEvent → Campaign → BusinessTransaction → BusinessPlan` for `dev-test-*` owners.
  - Files: `apps/api/tests/helpers/db.ts`.
- [x] **B1.3** Create `packages/shared/src/types/biz.ts` with `BizMeResponse`, `BizOnboardingInput`, plus stubs for `BizDashboardResponse`, `BizCampaign`, `BizCampaignListResponse`, `BizCampaignCreateInput`, `BizUgcResponse`, `BizFeedbackResponse`, `BizAudienceResponse`, `BizPlansResponse`, `BizBillingResponse`, `BizTransaction`. Export from `packages/shared/src/types/index.ts` (and `packages/shared/src/index.ts` if used). NOTE: no `types/index.ts` barrel exists in this repo — exports go through `packages/shared/src/index.ts` directly per existing convention.
  - Files: `packages/shared/src/types/biz.ts`, `packages/shared/src/index.ts`.
- [x] **B1.4** Create `apps/api/src/routes/biz.ts` with `app.addHook('preHandler', authMiddleware)`, the `requireBusinessOwner(userId)` helper, and `GET /biz/me`. Register in `apps/api/src/app.ts`. Add `apps/api/tests/routes/biz-onboarding.test.ts` covering 200 (owner) + 200 with `business:null` (no owned business).
  - Files: `apps/api/src/routes/biz.ts`, `apps/api/src/app.ts`, `apps/api/tests/routes/biz-onboarding.test.ts`.
- [ ] **B1.5** Mobile `(biz)` layout skeleton: `apps/mobile/app/(biz)/_layout.tsx` with the Instagram-style tab bar geometry from `(tabs)/_layout.tsx`, plus `apps/mobile/services/bizService.ts` with `getMe()` only. Layout gates: unauthed → `/(auth)/login`; authed + no business → `/(biz)/onboarding/welcome`.
  - Files: `apps/mobile/app/(biz)/_layout.tsx`, `apps/mobile/services/bizService.ts`.

## Phase B2 — Overview + Campaigns CRUD

- [ ] **B2.1** API `GET /biz/dashboard?period=week|month|90d`. Aggregates KPIs from `Campaign.counters` + `CampaignEvent` + `Content` sentiment for the owner's business. Type-annotated `: Promise<BizDashboardResponse>`. Tests in `biz-dashboard.test.ts`.
- [ ] **B2.2** API `GET /biz/campaigns?status=`, `POST /biz/campaigns` (validated by Zod in `utils/validators.ts`), `PATCH /biz/campaigns/:id` (drafts only), `POST /biz/campaigns/:id/launch` (flip → active, debit `BusinessTransaction`, emit `CampaignEvent { kind:'launch' }`). Tests in `biz-campaigns.test.ts`.
- [ ] **B2.3** Mobile `apps/mobile/app/(biz)/overview.tsx`: KPI tiles, 7-day bar chart, sentiment row, recent activity. Reuses `colors/spacing/radius` tokens.
- [ ] **B2.4** Mobile `apps/mobile/app/(biz)/campaigns/index.tsx`: status-tab filter (All/Active/Completed/Draft), card list, deep link to detail.
- [ ] **B2.5** Mobile `apps/mobile/app/(biz)/campaigns/[id].tsx`: campaign detail + edit (drafts only). Edit calls `PATCH /biz/campaigns/:id`.

## Phase B3 — Create-Ad wizard

- [ ] **B3.1** Mobile `apps/mobile/app/(biz)/create.tsx`: 4-step wizard (Content → Target → Budget → Review). Reuses `components/biz/WizardStepper.tsx`, `PincodeMultiSelect.tsx` (wraps existing `LocationPicker`).
- [ ] **B3.2** Mobile `components/biz/AdPreview.tsx`: live preview using the same `PostCard` body that the feed renders.
- [ ] **B3.3** Wire wizard Launch button to `bizService.createCampaign()` then `launchCampaign()`. Navigation back to campaigns list on success. Test in `__tests__/(biz)/create.test.tsx`.

## Phase B4 — UGC + Feedback

- [ ] **B4.1** API `GET /biz/ugc` and `POST /biz/ugc/:contentId/boost`. The boost path wraps existing `SponsorshipProposal` model — do not introduce a new model. Tests in `biz-ugc.test.ts`.
- [ ] **B4.2** API `GET /biz/feedback?sentiment=`, `POST /biz/feedback/:contentId/reply`. Reply persistence reuses whatever `BusinessReplyCard` already reads (audit first). Tests in `biz-feedback.test.ts`.
- [ ] **B4.3** Mobile screens `(biz)/ugc.tsx` and `(biz)/feedback.tsx`, plus feed sentiment counters into `overview.tsx`.

## Phase B5 — Audience + Offers + QR scan + Influencers

- [ ] **B5.1** API `GET /biz/audience` — aggregates age buckets / top pincodes / peak hours / interests of users who interacted with this business's content or claimed its offers. Tests in `biz-audience.test.ts`.
- [ ] **B5.2** API owner-side offers: `GET /biz/offers`, `POST /biz/offers`, `PATCH /biz/offers/:id` (wrap existing offers logic). Tests in `biz-offers-owner.test.ts`.
- [ ] **B5.3** API `POST /biz/qrscan` accepts a `claimCode`, marks the corresponding `UserReward` redeemed via the existing reward-redeem flow, writes a `CampaignEvent { kind:'visit' }` if the offer belongs to a campaign. Tests in `biz-qrscan.test.ts`.
- [ ] **B5.4** Mobile screens `(biz)/audience.tsx`, `(biz)/offers.tsx`, `(biz)/qrscan.tsx` (expo-camera), `(biz)/influencers.tsx` (delegates to `creatorScoreService`).

## Phase B6 — Onboarding flow + Billing

- [ ] **B6.1** API `POST /biz/onboarding/setup`, `POST /biz/onboarding/pincodes`, `POST /biz/onboarding/plan`, `POST /biz/onboarding/payment` (mock topup). Tests in `biz-onboarding.test.ts` (extends B1.4 file).
- [ ] **B6.2** Mobile onboarding chain: `welcome.tsx`, `bizinfo.tsx`, `pincodes.tsx`, `plans.tsx`, `payment.tsx`. OTP screen ROUTES to existing `/(auth)/otp.tsx` — no duplicate auth.
- [ ] **B6.3** API `GET /biz/plans`, `GET /biz/billing`. Tests in `biz-billing.test.ts`.
- [ ] **B6.4** Mobile `(biz)/billing.tsx` + "Switch to Business" entry in `(tabs)/profile.tsx` and `settings/index.tsx`.

---

## Halt conditions (reviewer self-terminates)

The reviewer emits `STATUS=DONE` (loop ends) when any of:

1. All `- [x]` items above checked.
2. Iteration cap (40) reached (handled by hook, not reviewer).
3. Three consecutive iterations fail the same test or tsc error.
4. A destructive action is attempted (`reset --hard`, `db push --accept-data-loss`, force-push) — reviewer halts immediately with `reason: human review required`.
