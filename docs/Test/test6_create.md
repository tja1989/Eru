# Test 6 — Create Post

**Route:** `/(tabs)/create`
**Mobile source:** `apps/mobile/app/(tabs)/create.tsx` (+ `ContentSubtypeSelector.tsx`, `BusinessTagPicker.tsx`, `PointsPreviewCard.tsx`, `ModerationNoticeCard.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 696-851
**Screenshot:** `docs/pwa-screenshots/06-create.png`

## Visual parity

### Header
- [ ] `✕` close icon (left, 20px, g800, padding 4px).
- [ ] Centre title `Create Post` (16px/700, g900).
- [ ] Right `Share` button: **orange** `#E8792B` bg, 20px horizontal / 10px vertical, radius 999 (pill), 14px/700 white, min-width 64.
- [ ] Disabled state: opacity 0.6.
- [ ] While submitting: shows ActivityIndicator white in place of text.
- [ ] Bottom border 0.5px g200.

### Format tabs row
- [ ] Horizontal scroll below header, 8px gap, padding 16h/8v, 0.5px bottom border g100.
- [ ] 5 tab pills:
  - `📷 Photo`, `🎬 Video`, `✍️ Text`, `📊 Poll`, `🧵 Thread`
  - [ ] Each: 12-14px horizontal / 4-6px vertical padding, 999 radius, 1px g300 border.
  - [ ] Inactive: white bg, g600 label 12px/600.
  - [ ] Active: g900 bg + g900 border; white label.

### Content subtype selector
- [ ] Section header row: `📋 What type of content?` (13px/700 g800) + `Shapes reach & earnings` right-aligned (11px g500).
- [ ] Below: 2-column grid, 12 subtype cards (6 rows × 2), 6px gap.
- [ ] Card dimensions: 48.5% width, 8px padding, 8px bottom margin, 8px radius, 1px g200 border, white bg.
- [ ] Selected card: 1.5px orange border, rgba orange 6% bg.
- [ ] Card layout:
  - [ ] Top row: emoji (20px) left, selected-indicator `✓` right (12px/900 orange, only when selected).
  - [ ] Title (13px/700 g900).
  - [ ] Subtitle (11px g500, 2px top margin).
- [ ] All 12 subtypes present in this order:
  1. `⭐ Review` — `Rate a business or product`
  2. `💡 Recommendation` — `Suggest a place or product`
  3. `🎬 Vlog / Day-in-Life` — `Behind-the-scenes, experience`
  4. `📸 Photo Story` — `Visual carousel or album`
  5. `📖 Tutorial / How-to` — `Step-by-step guide or lesson`
  6. `🆚 Comparison` — `A vs B side-by-side`
  7. `📦 Unboxing / First Try` — `Trying something new`
  8. `🎪 Event Coverage` — `Festival, pop-up, opening`
  9. `🔥 Hot Take / Opinion` — `Discussion starter, debate`
  10. `😂 Meme / Fun` — `Humor, entertainment`
  11. `🍳 Recipe` — `Food recipe or cooking guide`
  12. `📍 Local Guide` — `Hidden gems, neighbourhood walks`
- [ ] Each card's testID: `subtype-card-{key}` (e.g., `subtype-card-review`).
- [ ] When a subtype is selected, contextual banner appears below the grid (see next section).

### Contextual banner (subtype-dependent)
- [ ] Rendered only when a subtype is selected. testID `subtype-banner`.
- [ ] Card: rgba teal 4% bg, 0.5px rgba teal 18% border, 8px radius, 8px horizontal / 6px vertical padding.
- [ ] Text: 11px, teal, 16 line-height.
- [ ] Copy per subtype (`SUBTYPE_BANNER` constant in `ContentSubtypeSelector.tsx`):
  - review: `⭐ Review selected: Tag a business with @name to earn 20% commission if they boost your content. Reviews get 3x more reach from local users.`
  - local_guide: `📍 Local Guide selected: Hyper-local posts get 2x reach within your pincode.`
  - recommendation: `💡 Recommendation selected: Reach 1.5x more nearby users interested in this category.`
  - tutorial: `📖 Tutorial selected: Instructional content gets 1.3x reach with learners in your area.`
  - event_coverage: `🎪 Event Coverage selected: Time-sensitive events get 1.3x reach during the event window.`
  - recipe: `🍳 Recipe selected: Recipes get 1.2x reach among food-interested users.`
  - vlog: `🎬 Vlog: Share a day in your life with your followers.`
  - photo_story: `📸 Photo Story: A visual album tells the story.`
  - comparison: `🆚 Comparison: Help others choose by showing A vs B.`
  - unboxing: `📦 Unboxing: First-impression content for new arrivals.`
  - hot_take: `🔥 Hot Take: Start a conversation with a bold opinion.`
  - meme: `😂 Meme: Keep it light — humor posts reach your existing followers.`

### Poll form (only when contentType=poll)
- [ ] `PollForm` component renders: question input + dynamic option list (min 2, add-more button).
- [ ] Question placeholder `Ask a question...`.
- [ ] Each option input has remove `✕`.

### Thread composer (only when contentType=thread)
- [ ] `ThreadComposer` renders: numbered parts list, "Add part" button, min 2 parts.

### Text input (non-poll / non-thread)
- [ ] Text area, 100 min height, 15px font, 22 line-height, 200 letters max `maxLength=2200`.
- [ ] Placeholder: `What's on your mind?` (text format) OR `Add a caption...` (photo/video format).
- [ ] Char count below: `{N}/2200` right-aligned, 11px g400.

### Media picker (photo / video only)
- [ ] Dashed-border tile: `🖼️` icon 22px + text prompt.
  - Prompt: `Choose photos` for photo, `Choose video` for video.
- [ ] When media selected: horizontal scroll of 80×80 thumbnails below picker button.
- [ ] Label updates: `{N} item selected` / `{N} items selected`.

### Hashtags input
- [ ] Label `Hashtags` (13px/700 g700).
- [ ] Placeholder `#food #travel #art` (14px g400).
- [ ] 1px g200 border, 8px radius.

### Business Tag Picker (`🏪 Tag a Business`)
- [ ] Wrapper card: rgba orange 6% bg, 1px rgba orange 20% border, 12px radius, 12px padding.
- [ ] Label row: `🏪 Tag a Business` (13px/700 g800) + `+20% commission` badge (rgba green 12% bg, 999 radius, 10px/700 green).
- [ ] When no selection: search input (placeholder `Search businesses by name...`, 13px g400, 1px g200 border, 8px radius).
- [ ] Typing triggers 150ms debounce → calls `businessService.search(q)` → results dropdown below input.
- [ ] Each result row: name (13px/600 g800) + `{category} • {pincode}` (11px g500).
- [ ] When selected: chip `@{business.name}` with `✕` remove (orange border, rgba orange subtle fill).
- [ ] Help text below: `The business will see your content. If they boost it as sponsored, you earn 20% of their spend — real money, not just points!` (11px, g600, 16 line-height).

### Moderation notice card
- [ ] Title `🛡️ Content Review` (12px/700 gold).
- [ ] Body: `Your post will be reviewed by Eru's moderation team before it appears in the public feed. Most posts are approved within 15 minutes. You'll earn +30 pts once approved.` — `+30 pts` inline bold gold.
- [ ] Gold-tinted card bg.

### Points preview card
- [ ] Title `🪙 Points You'll Earn` (12px/700 green).
- [ ] 3-column layout:
  - Col 1: `+30` (18px/800 green) above `Post approved` (10px g600).
  - Col 2: `+1` green above `Each like received` g600.
  - Col 3: `+200` **orange** (highlighted) above `If it trends` g600.
- [ ] Dividers between cols: 0.5px g200 vertical.
- [ ] Green-tinted card bg.

### Bottom toolbar
- [ ] Row at bottom of scrollable area, 6 icons (26px) with labels (10px g500/600):
  1. 📷 `Photo`
  2. 🎬 `Video`
  3. 📊 `Poll`
  4. 📍 `{pincode or 'Location'}`
  5. 👥 `{N tagged or 'Tag'}`
  6. 🎵 `Audio`
- [ ] Spaced evenly (justify-around).
- [ ] Top border 0.5px g200, padding 20 vertical, 32 bottom-margin.

## Functional behaviour

### Initial state
- [ ] contentType=`photo` default.
- [ ] No subtype selected.
- [ ] Text/hashtag/pincode empty.

### Format tab switch
- [ ] Tap tab → contentType state updates; conditional rendering swaps in/out (poll form shows for poll, thread composer for thread, media picker shows for photo/video).

### Subtype selection
- [ ] Tap subtype card → updates `subtype` state; contextual banner appears/updates.
- [ ] Share button stays disabled until subtype picked (+ text/media validity).

### Text entry
- [ ] Caption char count updates in real time; max 2200 enforced.

### Media picker tap
- [ ] Requests media library permission (`expo-image-picker.requestMediaLibraryPermissionsAsync`).
- [ ] On granted: opens library with Image or Video filter.
- [ ] On selected: updates `media` state with assets.
- [ ] On denied: Alert `Permission required — Please allow access to your photo library.`

### Poll form interactions
- [ ] Add-option: appends empty input (max N options?).
- [ ] Remove: removes input (min 2 enforced).

### Business tag picker
- [ ] Type 1 char → no search (per 150ms debounce + min-length 2).
- [ ] Type 2+ chars → fires `GET /api/v1/businesses/search?q={query}`.
- [ ] Results show 10 items max.
- [ ] Tap result → selects business, chip appears, input clears.
- [ ] Tap `✕` on chip → resets to null.

### Toolbar taps
- [ ] 📷 Photo → `setContentType('photo')` + opens picker.
- [ ] 🎬 Video → `setContentType('video')` + opens picker.
- [ ] 📊 Poll → `setContentType('poll')`.
- [ ] 📍 Location → opens `LocationPicker` modal; on select, updates `selectedPincode` + toolbar label.
- [ ] 👥 Tag users → opens `UserTagPicker` modal; on confirm, updates taggedUsers.
- [ ] 🎵 Audio → shows Alert `Audio coming soon — Background audio picker is on the roadmap.`

### Share button
- [ ] Disabled when: no subtype picked, no text AND no media (for photo/video/text), or poll/thread invalid (< 2 options/parts or empty).
- [ ] On tap:
  - [ ] For each media asset: calls `mediaService.upload()` to get pre-signed S3 URL + media row, then `mediaService.uploadFileToS3()`.
  - [ ] Then calls `contentService.create()` with `{type, subtype, text?, mediaIds, hashtags[], locationPincode?, pollOptions?, threadParts?, taggedUserIds?, businessTagId?}`.
  - [ ] Alert `Submitted! — Your content is being reviewed.` with OK → `router.push('/my-content')`.
- [ ] Error → Alert with API error message.

## Edge cases

- [ ] No subtype selected + Share tapped → Alert `Pick a type — Choose what kind of content this is so the feed can route it to the right audience.`
- [ ] Poll with <2 options + Share → Alert `Incomplete poll — Add a question and at least 2 options.`
- [ ] Thread with <2 parts or empty part → Alert `Incomplete thread — Each part must have text, and you need at least 2 parts.`
- [ ] Photo/video with no media AND no text → Alert `Nothing to post — Add some text or media before submitting.`
- [ ] Upload fails mid-way (3 of 5 photos uploaded, 4th errors) → error surfaced; partial uploads NOT submitted.
- [ ] 2200-char caption limit reached → typing doesn't add more chars.
- [ ] Business search returns empty → "No businesses found" or empty results dropdown.
- [ ] Business search errors → silently empty results (user can retry by typing more).
- [ ] Tagged users > 10 → toolbar label shows `10+ tagged`.
- [ ] Content creation 500 → Share button re-enables; error Alert with server message.

## Notes for Playwright web run

- **Media picker is native-only.** On web, `expo-image-picker.launchImageLibraryAsync` fails or opens a web file dialog; items relating to media upload are `⚠ skip-on-web`.
- Business tag picker search IS testable (uses standard fetch).
- All 12 subtype cards + contextual banners testable on web.
- Share button submission without media (text-only) IS testable end-to-end.
- Toolbar tap behaviours testable except photo/video (picker) and audio (alert only).
