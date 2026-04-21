# Test 8 — Wallet

**Route:** `/wallet`
**Mobile source:** `apps/mobile/app/wallet/index.tsx` (+ `WalletQuickActions.tsx`, `TierProgressCard.tsx`, `PointsBadge.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 1201-1338
**Screenshot:** `docs/pwa-screenshots/08-wallet.png`

## Visual parity

### Header
- [ ] Back arrow `←` (22px, g800), title `Eru Wallet` (16px/700 g900, centred), right spacer 30px.
- [ ] 0.5px bottom border g100, white bg.

### Balance card (navy)
- [ ] Margin 16px, padding 24px, radius 16, bg navy `#1A3C6E`, content centred.
- [ ] Top label: `TOTAL BALANCE` (13px, rgba white 70%, letter-spacing 0.5, uppercase, 4px bottom margin).
- [ ] Balance number: `{balance.toLocaleString()}` (48px/800 white, 56 line-height).
- [ ] Rupee value: `≈ ₹{rupeeValue.toLocaleString()}` (16px, rgba white 80%, 4px top margin).

### Expiry warning banner (inside balance card, conditional)
- [ ] Only when `expiringPoints > 0 && expiringDays`:
  - [ ] Margin-top 16, bg rgba red 25%, radius 12, padding 12h/8v.
  - [ ] Text: `⚠️ {expiringPoints} pts expiring in {expiringDays} days` (13px/600 `#FCA5A5`).

### Quick Actions row (inside balance card, bottom)
- [ ] Margin-top 16, padding-top 12, 0.5px top border rgba white 15%.
- [ ] Self-stretch (full width of card).
- [ ] 5 tiles in a justify-between row:
  1. 🛒 `Shop`
  2. 🏪 `Local Offers`
  3. 🎁 `Gift Cards`
  4. 📱 `Recharge`
  5. 💝 `Donate`
- [ ] Each tile: emoji (22px) + label (11px, 4px top margin, g800 — but since this is on navy bg, needs white or light color).
- [ ] testIDs: `wallet-action-{key}` (all, local, giftcard, recharge, donate).

### Tier progress card
- [ ] Rendered only when `currentTier` present.
- [ ] Margin 16px horizontal.
- [ ] `TierProgressCard` component (`components/TierProgressCard.tsx`):
  - [ ] Row 1: Tier emoji (32px) + label `Influencer Tier` (16px/700 g900) + multiplier `1.5x multiplier` (13px g500).
  - [ ] `Next: 👑 Champion` chip right-aligned: 8px horizontal / 3px vertical padding, radius 999, g50 bg, 11px/600 g500.
  - [ ] Progress bar: 8px height, bg g100 (track), navy fill proportional to progress; overflow hidden, 4px radius.
  - [ ] Progress text below: `{lifetimePoints} / {threshold}` (12px g500 6px top margin).
  - [ ] Hint: `{pointsToNext} pts away from Champion (2.0x) 🚀` (12px green).
- [ ] Max-tier case: no bar, no hint; just tier emoji + label + multiplier.

### Daily progress card
- [ ] Margin 16h, bg card white, radius 16, 16px padding, 0.5 g100 border.
- [ ] Header row: `Today's Earnings` (15px/700 g800) + `{dailyEarned} / {dailyGoal} pts` (13px/600 g500).
- [ ] Progress bar: 8px height, g100 track, navy fill, radius 999, 8px top & bottom margins.
- [ ] Footer row: `🔥 {streak}-day streak` (12px/600 g500) left + hint right.
  - [ ] Hint: `{pointsToGoal} pts to daily goal!` (12px/600 teal) from API `dailyGoalHintCopy`.
  - [ ] When goal hit: `Daily goal hit 🎉` (teal/600).

### Earning history
- [ ] Section title `Earning History` (17px/700 g900, 16px bottom margin).
- [ ] Rows:
  - [ ] Each: title (14px/600 g800, title-case) + optional description (12px g500) + date (11px g400).
  - [ ] Right: points (15px/700, green for +, red for -), formatted `+{N} pts` or `-{N} pts`.
  - [ ] 0.5px bottom border g100 per row, 12 padding vertical.
- [ ] Action labels mapped via `ACTION_LABELS` const (e.g. `daily_login → Daily login bonus`).
- [ ] Date format: `DD Mon HH:MM` (e.g., `21 Apr 14:35`).

### Loading / pagination
- [ ] Initial load shows centred ActivityIndicator with navy color.
- [ ] Infinite scroll — approaching end of ScrollView (within 80px) triggers `loadMore`.
- [ ] While loading more: ActivityIndicator below last row.
- [ ] End-of-list: `You've seen it all` (12px g400, centre, 16 padding vertical).

## Functional behaviour

### On mount
- [ ] Fires `walletService.getWallet()` → `GET /api/v1/wallet` → populates balance card.
- [ ] Fires `walletService.getHistory(1)` → `GET /api/v1/wallet/history?page=1` → populates history.

### Pull-to-refresh
- [ ] Triggers `handleRefresh` → re-fetches wallet + history page 1, resets pagination.

### Scroll to end
- [ ] Triggers `handleLoadMore` → fetches next page, appends to history.

### Quick Action taps
- [ ] `wallet-action-all` → `router.push({pathname:'/redeem', params:{type:'all'}})`.
- [ ] `wallet-action-local` → `/redeem?type=local`.
- [ ] `wallet-action-giftcard` → `/redeem?type=giftcard`.
- [ ] `wallet-action-recharge` → `/redeem?type=recharge`.
- [ ] `wallet-action-donate` → `/redeem?type=donate`.

### Back tap
- [ ] `router.back()` to previous screen.

## Edge cases

- [ ] New user, 0 balance, 0 history → balance shows `0`, rupee `≈ ₹0`, history empty state `💰 No transactions yet`.
- [ ] API fails on getWallet → falls back to `storeBalance` from pointsStore (authenticated user's cached balance).
- [ ] API fails on getHistory → empty history, no crash.
- [ ] ExpiringPoints = 0 → banner hidden.
- [ ] Tier progress at 100% (lifetimePoints ≥ threshold) → full orange bar; hint might read "ready to level up".
- [ ] Champion tier (no next tier) → progress card shows emoji + label only; no bar, no hint.
- [ ] No `dailyGoalHintCopy` from API → local fallback: `{(100-pct).toFixed(0)}% to go` or `Daily goal hit 🎉`.
- [ ] Balance card overflows on long numbers (> 1B pts) → number may shrink or wrap; verify no clipping.
- [ ] Very long history row description → numberOfLines=1 truncates with ellipsis.

## Notes for Playwright web run

- All items testable on web.
- LinearGradient on balance card is a solid bg `#1A3C6E` (not gradient) — verify computed bg.
- Quick actions tap: `browser_click` + verify URL change via `browser_navigate` or location check.
- Pull-to-refresh and infinite scroll require gesture simulation — skip on web or mock by directly scrolling `scrollTo`.
