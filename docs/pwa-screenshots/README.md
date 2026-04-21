# PWA reference screenshots

Auto-captured from `Eru_Consumer_PWA.html` via Playwright MCP at 390×844 (iPhone 14/15 equivalent). These are the visual targets the mobile app matches for the GapFixP4–P10 phase-completion gates.

| # | File | Covers gate |
|---|---|---|
| 01 | `01-welcome.png` | P5 Welcome |
| 02 | `02-otp.png` | P5 OTP (ProgressSteps + resend countdown) |
| 03 | `03-personalize.png` | P5 Personalize (15 interests + 5 languages) |
| 04 | `04-tutorial.png` | P5 Tutorial (+250 welcome bonus) |
| 05 | `05-home.png` | P6 home feed (app header + stories + V1-V6 post variants) |
| 06 | `06-create.png` | P6 Create (5 format tabs + 12 subtypes + business tag + 6-icon toolbar) |
| 07 | `07-post-detail.png` | P6 Post Detail (sort dropdown + business replies + +3pt input) |
| 08 | `08-wallet.png` | P7 Wallet (5 tiles + tier chip + streak row + expiry banner) |
| 09 | `09-redeem.png` | P7 Redeem (6 tabs + hot deals + gift cards + recharge + donate) |
| 10 | `10-my-rewards.png` | P7 My Rewards (4 tabs + QR card + watchlist row) |
| 11 | `11-profile.png` | P8 Profile (5 grid tabs + HighlightsRow + tier ring) |
| 12 | `12-explore.png` | P8 Explore (masonry + pts/ad/reel/live badges) |
| 13 | `13-reels.png` | P8 Reels (pts/min indicator) |
| 14 | `14-notifications.png` | P8 Notifications (6 filter tabs + NEW/EARLIER + typed CTAs) |
| 15 | `15-messages.png` | P8 Messages (filter tabs + BOOST PROPOSAL pill + chat proposal card) |
| 16 | `16-storefront.png` | P9 Storefront (banner + 4 tabs + Open now + tagged UGC) |
| 17 | `17-creator-biz.png` | P9 Creator×Business (earnings banner + active + pending w/ 3-button row) |
| 18 | `18-my-content.png` | P10 My Content (stats bar + earnings card + score transparency) |
| 19 | `19-settings.png` | P10 Settings (7 cards) |
| 20 | `20-leaderboard.png` | P10 Leaderboard (season prizes + podium + scope tabs) |

## Re-capture

```sh
# Serve the PWA
cd /Users/USER/claude_tj/Eru && python3 -m http.server 8765 --bind 127.0.0.1 &

# In another terminal, use the playwright MCP to:
# 1. resize to 390x844
# 2. navigate to http://127.0.0.1:8765/Eru_Consumer_PWA.html
# 3. for each screen: browser_evaluate('showScreen("<name>")') then browser_take_screenshot
```
