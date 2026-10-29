# Avio Backlog

Deferred work lives here instead of `TODO` comments. Each item should include enough context to start without rediscovering the design.

## Messaging

- **MAM history pagination (XEP-0313)** — initial history loads the latest 50 messages and replays archived reactions/corrections. Apply the same action replay when older pages are added on scroll-top; initial pagination work is on `feat/mam-drafts`.
- **Retractions (XEP-0424)** — message actions currently remove a message locally; add protocol retraction with a tombstone.
- **Upload cancellation and retry** — the XEP-0363 upload path stages files, reports progress, sends OOB links, and renders image/file/video cards. Add per-file cancel/retry controls for failed uploads.
- **Message search** — local search over the in-memory conversation store first, then MAM search.
- **Delivery/read receipt parity** — verify server support and surface `marker:displayed` consistently for all clients.

## Chat UI

- **Server-side roster removal** — deleting a chat currently removes the local conversation/contact; add `removeRosterItem` so it stays gone after roster reload.
- **Message actions polish** — hover, right-click, long-press, and swipe gestures expose reply, reaction, forward, copy, edit, and local removal. Add keyboard shortcuts and review discoverability on touch.
- **Message virtualization** — add `@tanstack/react-virtual` to the list and thread once either exceeds roughly 200 items.

## Presence and roster

- **Roster group management** — roster item groups are preserved on contacts, but the sidebar grouping and group editor were removed while the group chat UX is being built. Revisit after MUC settles.
- **Subscription request decline** — add a decline action next to Accept. The adapter currently only accepts.
- **Contact profile sheet** — show full JID, subscription state, presence, and actions.
- **Avatar metadata (XEP-0084 / XEP-0153)** — fetch and cache avatars instead of initials.

## Rooms and calls

- **MUC (XEP-0045)** — basic create/join, groupchat messages, invitations, bookmarks, and occupant info are implemented. Remaining: room discovery UI, room configuration, moderation, room MAM, and inviting by bare JID (Add members currently lists roster contacts only).
- **Jingle / WebRTC** — use `webrtc-adapter` before creating `RTCPeerConnection`; add audio/video call UI and permission handling.
- **Screen sharing** — depends on Jingle negotiation.

## Client features

- **IndexedDB cache** — persist messages and roster for offline startup; keep MAM as the source of truth.
- **Multi-account** — extend `SessionStore` to an account list and key store state by account.
- **Theme toggle** — the CSS already supports `.dark`; add a persisted preference.
- **Accessibility pass** — verify message log announcements, dialog focus traps, and keyboard navigation with a screen reader.
- **Typing indicator polish** — stop composing on blur and on conversation switch.

## Tauri

- **Static/SPA build** — verify the TanStack Start output can run without the Nitro server.
- **Secure storage** — replace localStorage session persistence with a Tauri store/keychain adapter.
- **CSP** — allow the configured `wss://` XMPP hosts and block everything else.
- **Auto-update and packaging** — after the web MVP is signed off.

## Research notes

- `staydown` is installed as requested, but v2.0.3 has no `destroy()` API and adds a non-removable `window.resize` listener. The app uses `@shadcn/react` `MessageScroller` instead. Revisit only if a Tauri-only, app-lifetime scroll container needs it.
- Base UI portals require `.root { isolation: isolate }`, already applied in `src/styles/base.css`.
