# Test 15 — Messages

**Routes:** `/messages` (list) and `/messages/[id]` (chat detail)
**Mobile source:**
- List: `apps/mobile/app/messages/index.tsx`
- Chat: `apps/mobile/app/messages/[id].tsx`
- Components: `ConversationRow.tsx`, `MessageBubble.tsx`, `ProposalContextCard.tsx`
**PWA reference:** `Eru_Consumer_PWA.html` lines 3322-3410
**Screenshot:** `docs/pwa-screenshots/15-messages.png`

## Visual parity — List view

### Header
- [ ] Title `Messages` (22px/700 g900, 16 padding).

### Filter tabs
- [ ] Horizontal scroll, 8 gap, bottom border 0.5 g100.
- [ ] 4 pills in order:
  1. `All` (testID `msg-tab-all`)
  2. `Business`
  3. `Creators`
  4. `Friends`
- [ ] Each: 12 horizontal / 5 vertical padding, 999 radius, 1px g300 border.
- [ ] Active: g800 bg, white 12px/600.
- [ ] Inactive: white bg, g600 12px/600.

### Conversation row
- [ ] Avatar 48 (left).
- [ ] Middle body:
  - [ ] Name row: username (15px/700 g800) + optional **BOOST PROPOSAL** pill (orange bg, 6 horizontal / 2 vertical, 4 radius, 9px/800 letter-spacing 0.5 white) if `conversation.proposalId != null`.
  - [ ] Preview text (13px g500, 2 top margin, single line).
- [ ] Right cluster:
  - [ ] Time ago (12px g500).
  - [ ] Unread dot (10×10, orange) when last message is from other user and unreadAt/readAt null.
- [ ] 16 horizontal / 12 vertical padding, 0.5 bottom border `#F0F0F0`.

### Empty state
- [ ] `No conversations yet` (g500, centre, 32 padding).

## Visual parity — Chat detail view

### Header
- [ ] `‹` back arrow (24px) + optional name/avatar.
- [ ] 12 padding, 0.5 bottom border `#eee`.

### Proposal context card (optional, pinned atop)
- [ ] Renders when `?proposalId=xxx` in route AND fetched proposal is non-null.
- [ ] Card: rgba orange 8% bg, 0.5 rgba orange 30% border, 12 radius, 16 margin, 16 padding.
- [ ] Header row: `BOOST PROPOSAL` (10px/800 letter-spacing 1 orange) + status `PENDING`/`ACCEPTED`/etc (10px/800 g500).
- [ ] Business name (15px/700 g900).
- [ ] Metric row (3 cols): `Boost ₹{amount}` / `Commission {pct}%` / `You earn ₹{earnings}` (highlight green).
  - [ ] Values 14px/800 g800 (green for "You earn").
  - [ ] Labels 10px g500 2 top margin.
- [ ] Action row (only when status=pending):
  - [ ] `✕` Decline (flex 1 min, 1px g300 border, white bg, g700 13px/700).
  - [ ] `Negotiate` (flex 2, white bg, 1px orange border, orange 13px/700).
  - [ ] `Accept` (flex 2, orange bg, white 13px/700).

### Negotiate modal (`ProposalContextCard` internal)
- [ ] Bottom sheet: white bg, 16 padding, top-left/right 16 radius.
- [ ] Title `Counter offer` (16px/800 g900).
- [ ] Input `New boost amount (₹)` (number keyboard) — pre-filled with current amount.
- [ ] Input `Note (optional)` (multiline, min 60 height, placeholder `Why this number?`).
- [ ] Actions row: `Cancel` (decline style) + `Send counter` (accept style).

### Messages list
- [ ] `FlatList` of message bubbles, 10 padding.
- [ ] Each `<MessageBubble>`: aligned left for other user, right for self; bubble bg navy (self) vs g100 (other); timestamp small below.

### Input footer
- [ ] Row: text input (flex 1, bg #FAFAFA, 20 radius, 16 horizontal / placeholder `Type a message...`).
- [ ] `Send` button (orange bg, 20 radius, 18 horizontal, white 700, testID `send-btn`).

## Functional behaviour

### List — on mount
- [ ] Fires `messagesService.listConversations()` → `GET /conversations`.
- [ ] Populates list.

### List — filter switch
- [ ] `all` → all conversations.
- [ ] `business` → `otherUser.kind === 'business'`.
- [ ] `creators` → `otherUser.isVerified === true`.
- [ ] `friends` → `otherUser.isFollowing === true`.

### List — tap row
- [ ] `router.push('/messages/{id}')`.

### Chat — on mount
- [ ] Reads `id` + optional `proposalId` from params.
- [ ] Fires `messagesService.listMessages(id)` → `GET /conversations/{id}/messages`.
- [ ] Every 15s: polls list (fallback for realtime).
- [ ] Subscribes to Socket.io `message:new` event; dedupes by message.id.
- [ ] If `proposalId`: fires `sponsorshipService.getDashboard()` and finds matching proposal → sets `proposal` state.

### Chat — send message
- [ ] Type text + tap Send → `messagesService.send(id, text)` → `POST /conversations/{id}/messages`.
- [ ] On success: appends to local list; server also emits `message:new` to both parties.
- [ ] Input clears.

### Chat — proposal accept
- [ ] Tap `Accept` on ProposalContextCard → `sponsorshipService.accept(proposalId)`.
- [ ] On success: alert `Accepted — The boost is live.`.
- [ ] Card updates to `ACCEPTED` status; action row hides.

### Chat — proposal decline
- [ ] Tap `✕` → confirm Alert `Decline boost?`.
- [ ] On confirm: `sponsorshipService.decline(id)`.
- [ ] Card updates to `DECLINED`.

### Chat — proposal negotiate
- [ ] Tap `Negotiate` → bottom sheet opens.
- [ ] Type counter amount (positive number required).
- [ ] Optional note.
- [ ] Tap `Send counter` → `sponsorshipService.negotiate(id, counterBoostAmount, note)`.
- [ ] On success: alert `Counter sent — The business will see your counter-offer.`; sheet closes.

### Realtime
- [ ] Server emits `message:new` when a new message persists.
- [ ] Mobile appends if `conversationId` matches current chat; dedupes.

### Back tap
- [ ] `router.back()`.

## Edge cases

- [ ] No conversations → empty state in list.
- [ ] Conversation with no messages yet (freshly created) → chat view has empty list; input still works.
- [ ] Poll interval keeps the bubbles fresh even if socket drops.
- [ ] Send fails (network) → message not added; no stale bubble.
- [ ] Proposal fetch fails → chat still works; ProposalContextCard just doesn't render.
- [ ] Proposal status != pending → Accept/Decline/Negotiate buttons hidden.
- [ ] Message containing emoji / long text → bubble wraps correctly.
- [ ] Conversation list ordering: most recent `lastMessageAt` at top.

## Notes for Playwright web run

- List + chat testable on web.
- Socket.io client works on web (socket.io-client supports WebSocket).
- Verify `message:new` by: open chat, send a message, check server response triggers socket, new bubble appears instantly (not waiting for 15s poll).
- Proposal context card: set `?proposalId=xxx` in URL to exercise.
