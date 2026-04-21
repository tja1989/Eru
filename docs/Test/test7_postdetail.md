# Test 7 — Post Detail

**Route:** `/post/[id]`
**Mobile source:** `apps/mobile/app/post/[id].tsx` (+ `PostCard.tsx`, `CommentInput.tsx`, `CommentSortDropdown.tsx`, `BusinessReplyCard.tsx`)
**PWA reference:** `Eru_Consumer_PWA.html` lines 2739-2848
**Screenshot:** `docs/pwa-screenshots/07-post-detail.png`

## Visual parity

### Header
- [ ] Back arrow `←` (22px g800 600-weight, left, padding xs).
- [ ] Centre title `Post` (16px/700 g900).
- [ ] Right spacer 30px (PWA has `⋯` action sheet; current impl may omit).
- [ ] 0.5px bottom border g100.

### Post block (renders `<PostCard post={post} />`)
- [ ] Same card layout as feed; verify all PostCard items per test 5 apply here too.
- [ ] For sponsored posts: CTA bar overlay on image `🎂 Claim 20% off →` (PWA line 2760) or generic `Claim Offer →`.
- [ ] Action row + likes-dislikes combined line: `890 likes • 12 dislikes` (PWA 2773).
- [ ] Time-ago: `2 hours ago` (not the short `• 2h` — full phrase).
- [ ] Caption with inline blue hashtags.
- [ ] No "View all comments" link (since we're already on detail).

### Comments section
- [ ] Border-top 8px g100 (thick separator from post).
- [ ] Header row: `Comments ({N})` (14px/700 g800) + **CommentSortDropdown** pill right.
  - [ ] Sort pill: 8px horizontal / 4px vertical padding, 999 radius, g100 bg, 11px/600 g700.
  - [ ] Shows current sort label: `Most liked ▾` (top) or `Most recent ▾` (recent).
  - [ ] Tap toggles between the two; triggers re-fetch with `?sort=top` or `?sort=recent`.
  - [ ] a11yLabel: `Change comment sort, currently Most liked` (or `Most recent`).

### Comment rows
- [ ] Each comment row:
  - [ ] Avatar 32×32 (g100 bg if no image).
  - [ ] Body: `{username}` (13px/600) + space + comment text (13px/g800/18-lh).
  - [ ] Review comments prefix with stars (`★★★★☆`) if `subtype=review` (future — may not be wired yet).
  - [ ] Meta row below body: time (`32m`/11px g400) + `— View N {reply|replies}` (11px/g500/600) if replies exist.
  - [ ] Right-aligned heart icon 🤍 (14px, 50% opacity).
  - [ ] Row padding 10 vertical, 0.5 bottom border g100.

### Business replies (nested under parent)
- [ ] If a comment's user has `kind='business'`, render **`<BusinessReplyCard />`** instead of regular row:
  - [ ] Orange left border accent.
  - [ ] Avatar 26×26.
  - [ ] Card bg: rgba orange 6%; 0.5px rgba orange 20% border.
  - [ ] Username: orange 12px/700.
  - [ ] ✓ verified badge next to username (orange 10px/800).
  - [ ] Body: 12px g800 17-lh.
  - [ ] Indented — padding-left 30 on wrapper.

### Comment input (footer, sticky or fixed)
- [ ] Row at bottom, 0.5px top border, white bg, 12px padding.
- [ ] Avatar 32×32 left.
- [ ] Text input:
  - [ ] Bg g50, 1px g200 border, 20px radius, 16 horizontal / 10 vertical padding.
  - [ ] 14px g800 text.
  - [ ] Placeholder `Add a comment... (+3 pts for 10+ words)` (g400).
  - [ ] Max-height 100px (grows to wrap text).
- [ ] Submit button (right):
  - [ ] Blue `#0095F6` bg, 20px radius, 16 horizontal / 10 vertical padding, min-width 60.
  - [ ] Label `Post` (white, 14px/600).
  - [ ] Disabled when input empty: opacity 0.4.
  - [ ] Submitting: ActivityIndicator white.
- [ ] testID `comment-submit`.

## Functional behaviour

### Initial mount
- [ ] Reads `id` from `useLocalSearchParams`.
- [ ] Fires `GET /api/v1/content/{id}` → `setPost(res.content)`.
- [ ] Fires `GET /api/v1/posts/{id}/comments?sort=top&page=1` (default sort=top now) → populates comments + total.

### Sort dropdown
- [ ] Tap sort pill → calls `handleSortChange('recent' or 'top')` → `loadComments(1, newSort)`.
- [ ] Re-renders with new ordering.
- [ ] State resets `commentsPage=1`.

### Load more
- [ ] Scroll to bottom → on `hasMoreComments`, button `Load {remaining} more` appears.
- [ ] Tap → `loadComments(page+1, sort)` → appends.

### Post a comment
- [ ] User types ≥1 char → submit button enabled (basic check), not greyed out.
- [ ] Tap Post:
  - [ ] POST `/api/v1/posts/{id}/comments` with `{text}`.
  - [ ] On success: comment prepended to local list.
  - [ ] If word count ≥ 10: server credits +3 pts via `earnPoints('comment', contentId, {wordCount})`.
  - [ ] If word count < 10: no credit.
  - [ ] Input clears.
  - [ ] Post's commentCount increments locally.
- [ ] On error: shows error line `Couldn't post — try again`.

### Business reply rendering
- [ ] Reply with `user.kind='business'` under a parent comment renders as `<BusinessReplyCard />` (orange-tint, indented).
- [ ] Regular user replies do NOT use BusinessReplyCard.

### Like comment
- [ ] Tap 🤍 on a comment → optimistic flip + POST `/api/v1/comments/{id}/like` (if implemented).

### Navigate back
- [ ] `←` tap → `router.back()` (returns to whatever referrer; feed, explore, etc.).

## Edge cases

- [ ] Post not found (404 on GET content) → error screen with `🚫` icon + error text + back works.
- [ ] Loading state: ActivityIndicator in centre until post fetched.
- [ ] Post has 0 comments → empty state: `💬 No comments yet. Be the first to comment.`
- [ ] Post is a reel → PostCard still renders with reel media (4:5 aspect); comment flow identical.
- [ ] Long comment (10+ lines) → wraps; no truncation by default.
- [ ] Business reply under a top-level comment that has no other replies → still renders correctly.
- [ ] User posts comment that's whitespace-only → submit button disabled (`.trim().length === 0`).
- [ ] Server 500 on comment POST → error shown, input text preserved.
- [ ] API returns `commentsPreview` on post detail that matches the full /comments query? No — we ignore `commentsPreview` here; full list used.
- [ ] Changing sort with < 1 full page of comments → no scroll needed; full list re-renders.

## Notes for Playwright web run

- All items testable on web.
- Sticky footer (`KeyboardAvoidingView`) works on web; verify CommentInput stays visible above bottom.
- Hashtag links in captions are inline `<Text>` spans; verify color (blue) via computed styles.
- Comment sort toggle: verify `browser_network_requests` shows `?sort=top` → `?sort=recent` query change.
