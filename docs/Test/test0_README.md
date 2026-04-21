# Eru Mobile — Exhaustive Test Spec

One file per screen. Every test case is an observable assertion; Playwright MCP will flip each checkbox.

## Files

| # | Screen | Route | Reference |
|---|---|---|---|
| 01 | [Welcome](./test1_welcome.md) | `/(auth)/welcome` | PWA 200-289; `docs/pwa-screenshots/01-welcome.png` |
| 02 | [OTP (Verify Phone)](./test2_otp.md) | `/(auth)/otp` | PWA 291-371; `02-otp.png` |
| 03 | [Personalize](./test3_personalize.md) | `/(auth)/personalize` | PWA 373-435; `03-personalize.png` |
| 04 | [Tutorial](./test4_tutorial.md) | `/(auth)/tutorial` | PWA 437-483; `04-tutorial.png` |
| 05 | [Home Feed](./test5_home.md) | `/(tabs)/index` | PWA 485-693; `05-home.png` |
| 06 | [Create Post](./test6_create.md) | `/(tabs)/create` | PWA 696-851; `06-create.png` |
| 07 | [Post Detail](./test7_postdetail.md) | `/post/[id]` | PWA 2739-2848; `07-post-detail.png` |
| 08 | [Wallet](./test8_wallet.md) | `/wallet` | PWA 1201-1338; `08-wallet.png` |
| 09 | [Redeem](./test9_redeem.md) | `/redeem` | PWA 1341-1510; `09-redeem.png` |
| 10 | [My Rewards](./test10_myrewards.md) | `/my-rewards` | PWA 1513-1778; `10-my-rewards.png` |
| 11 | [Profile](./test11_profile.md) | `/(tabs)/profile` | PWA 853-1000; `11-profile.png` |
| 12 | [Explore](./test12_explore.md) | `/(tabs)/explore` | PWA 1002-1099; `12-explore.png` |
| 13 | [Reels](./test13_reels.md) | `/(tabs)/reels` | PWA 1101-1199; `13-reels.png` |
| 14 | [Notifications](./test14_notifications.md) | `/notifications` | PWA 3220-3320; `14-notifications.png` |
| 15 | [Messages](./test15_messages.md) | `/messages` | PWA 3322-3410; `15-messages.png` |
| 16 | [Business Storefront](./test16_storefront.md) | `/business/[id]` | PWA 3101-3218; `16-storefront.png` |
| 17 | [Creator × Business](./test17_creatorbiz.md) | `/sponsorship` | PWA 2962-3099; `17-creator-biz.png` |
| 18 | [My Content](./test18_mycontent.md) | `/my-content` | PWA 2852-2960; `18-my-content.png` |
| 19 | [Settings](./test19_settings.md) | `/settings` | PWA 1780-1969; `19-settings.png` |
| 20 | [Leaderboard](./test20_leaderboard.md) | `/leaderboard` | PWA 3412-3548; `20-leaderboard.png` |

## How to read each file

Each screen doc has three checklists:

1. **Visual parity** — every badge, tile, copy string, icon, color, size, layout element the PWA renders. The mobile implementation must match.
2. **Functional behaviour** — every tap / input / gesture that produces an observable outcome (navigation, API call, state change).
3. **Edge cases** — empty / loading / error / unauthenticated / offline states.

### Checkbox conventions

- `[ ]` — not yet verified.
- `[x]` — verified passing against localhost build.
- `[!]` — drift from PWA spec (see inline note).
- `[X]` — broken on localhost (see inline note).

## Shared legends

**Colors (`apps/mobile/constants/theme.ts`):**
- navy `#1A3C6E`, orange `#E8792B`, teal `#0D9488`, green `#10B981`, red `#ED4956`, gold `#D97706`, blue `#0095F6`, purple `#7C3AED`, pink `#EC4899`
- gray scale `g50..g900`: g50 `#FAFAFA`, g100 `#EFEFEF`, g200 `#DBDBDB`, g300 `#C7C7C7`, g400 `#8E8E8E`, g500 `#737373`, g600 `#595959`, g700 `#363636`, g800 `#262626`, g900 `#121212`

**Tier colors (`theme.ts#tierColors`):** explorer g400, engager teal, influencer orange, champion gold.

**Tier ring / emoji (`LeaderboardPodium.tsx` + `TierProgressCard.tsx`):** explorer 🌱 1.0x, engager ⚡ 1.2x, influencer 🔥 1.5x, champion 👑 2.0x.

**UGC badges (`UgcBadge.tsx`):** `creator` → `✓ CREATOR`, `user_created` → `✓ USER CREATED`.

**Moderation badges (`ModerationBadge.tsx`):** `approved` → `✓ APPROVED` (green), `pending` → `⏳ PENDING` (gold), `declined` → `✕ DECLINED` (red).

**Copy strings MUST match PWA character-for-character** — case, punctuation, emoji, spacing included. Typos in the PWA are intentional and kept.

## Web-degradation disclaimer

Three screens are partially unreachable on the web build (`expo start --web`):
- **Reels** — `expo-video` doesn't bundle for web; video playback items are marked `⚠ skip-on-web` and verified on phone.
- **Create** — `expo-image-picker` is native-only; the picker tap item is `⚠ skip-on-web`.
- **Settings DOB** — `@react-native-community/datetimepicker` has no web impl; the modal item is `⚠ skip-on-web`.

Every other item in those screens IS testable on web.

## How Playwright MCP runs these

For each screen file:
1. `browser_resize` → 390×844.
2. `browser_navigate` → route.
3. Walk each `[ ]` item:
   - Visual → `browser_snapshot` / `browser_evaluate` for computed styles / `browser_take_screenshot` for archive.
   - Functional → `browser_click` / `browser_fill_form` / `browser_press_key` + `browser_network_requests` to verify API calls.
   - Edge → prepare state via API or UI, then re-check.
4. Flip `[ ]` → `[x]` / `[!]` / `[X]`.
5. Save the updated file.

Final report: `docs/Test/_results.md` (produced after all 20 runs).
