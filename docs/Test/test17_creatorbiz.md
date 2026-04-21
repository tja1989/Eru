# Test 17 — Creator × Business (Sponsorship dashboard)

**Route:** `/sponsorship`
**Mobile source:** `apps/mobile/app/sponsorship/index.tsx` (+ `SponsorshipCard.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 2962-3099
**Screenshot:** `docs/pwa-screenshots/17-creator-biz.png`

## Visual parity

### Header
- [ ] Back `←` (22px g800), title `Creator × Business` (16px/700 g900), right 24-wide spacer.
- [ ] 14 horizontal / 8 vertical padding, 0.5 bottom border g100.

### Earnings banner (top)
- [ ] Navy-gradient card (or solid navy) with monthly earnings:
  - [ ] Heading `SPONSORED CONTENT EARNINGS` (green, 10px/700 letter-spacing 1).
  - [ ] Big number `₹{totalEarnings}` (green, 36-42px/800) + `this month` (g500).
  - [ ] Stat row: `₹{commission} Commission (20%)` | `{pointsEarned} Points Earned` | `{count} Sponsored Posts`.

### How-to block
- [ ] Small tip card: `💡 How to earn from businesses`.
- [ ] Bullet copy: `Create a review, vlog, or post about a business → Tag them with @BusinessName → If the business likes your content, they can pay to boost it as a sponsored post → You earn 20% commission on their spend!`
- [ ] Highlighted `You earn 20% commission on their spend!` (green/orange).

### Stats row (3-col)
- [ ] Row below earnings: 3 stat tiles (flex 1 each, g50 bg, 10 radius, 12 padding, centre):
  - [ ] `Active` (value `activeCount`, big orange 22px/800, 12px/g500 label).
  - [ ] `Pending` (value `pendingCount`).
  - [ ] `Completed` (value `completedCount`).

### Active section
- [ ] Section heading `Active ({activeCount})` (16px/700 g800).
- [ ] Stacked `<SponsorshipCard />` — each:
  - [ ] Header row: biz name (15px/700 g800 flex 1) + status badge (LIVE=green, PENDING=orange, DECLINED=red, DONE=g500; white 10px/800 letter-spacing 0.5, 8 horizontal / 3 vertical, 6 radius).
  - [ ] Metric row 4 cols: `Reach {N}`, `Clicks {N}`, `Spend ₹{N}`, `Earnings ₹{N}` — values 14px/700 g800, labels 11px g500.
  - [ ] No action buttons (Active cards are live, not actionable).

### Pending section
- [ ] Section heading `Pending ({pendingCount})`.
- [ ] Pending cards have action row at bottom:
  - [ ] `Decline` (transparent, 1px g300 border, g700 14px/700, flex 1).
  - [ ] `Accept` (orange bg, white 14px/700, flex 1).
  - [ ] 10 gap, 14 top margin.

### Empty state
- [ ] If `pendingCount === 0 && activeCount === 0`:
  - [ ] 🤝 emoji (40px).
  - [ ] Title `No proposals yet` (15px/700 g800).
  - [ ] Body `When a business wants to boost your content, you'll see the proposal here and earn 20% commission when you accept.` (13px g500 centre 18-lh).

## Functional behaviour

### On mount
- [ ] Fires `sponsorshipService.getDashboard()` → `GET /api/v1/sponsorship/dashboard`.
- [ ] Populates `data` state with `{activeCount, pendingCount, completedCount, totalEarnings, active[], pending[]}`.

### Accept tap (on a pending card)
- [ ] Calls `sponsorshipService.accept(id)` → `POST /sponsorship/{id}/accept`.
- [ ] On success: alert `Accepted — The boost is live. Your post is reaching a wider audience.`.
- [ ] Reloads dashboard → card moves from Pending to Active.
- [ ] On error: alert `Could not accept — {error}`.

### Decline tap (on a pending card)
- [ ] Confirm alert: `Decline boost? — The business will be notified. You can always accept future proposals.`.
- [ ] On confirm: `sponsorshipService.decline(id)` → `POST /sponsorship/{id}/decline`.
- [ ] On success: reloads dashboard (card disappears from Pending).
- [ ] On cancel: no-op.
- [ ] On error: alert.

### Negotiate (if surfaced in this screen; currently lives in ProposalContextCard)
- [ ] The creator can counter-offer via the ProposalContextCard in Messages (see test 15).
- [ ] This screen's accept/decline are the primary actions.

### Back tap
- [ ] `router.back()`.

## Edge cases

- [ ] Dashboard fetch fails → ActivityIndicator stays; no crash.
- [ ] `totalEarnings` null/0 → shows ₹0.
- [ ] All 3 counts = 0 → empty state shown instead of sections.
- [ ] Rapid accept+decline clicks → second action should fail gracefully or be no-op; server enforces status gating.
- [ ] Accepted proposal later flips to `active` state once the campaign starts (server-side).
- [ ] Post-accept: server fires `proposal:updated` via Socket.io; this screen doesn't subscribe today but could.

## Notes for Playwright web run

- All testable on web.
- Empty state reached by creating a user with no pending/active proposals in seed script.
- Accept/decline: verify POST /sponsorship/{id}/accept (or decline) via `browser_network_requests`.
