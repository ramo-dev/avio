# Avio Backlog

Deferred work lives here instead of `TODO` comments. Each item should include enough context to start without rediscovering the design.

## Messaging

- **MAM history (XEP-0313)** — call `client.searchHistory(jid, { max: 50 })`, merge with live messages, dedupe by stanza ID, and preserve scroll while prepending. `MessageScroller` already supports prepend preservation.
- **Message corrections (XEP-0308)** — stanza emits `replace`; update the original message body and show an edited marker.
- **Retractions (XEP-0424)** — remove or tombstone a message after a retraction event.
- **Attachments / HTTP Upload (XEP-0363)** — request an upload slot, upload the file, send the URL as an OOB message, and render a download card.
- **Message search** — local search over the in-memory conversation store first, then MAM search.
- **Delivery/read receipt parity** — verify server support and surface `marker:displayed` consistently for all clients.

## Presence and roster

- **Subscription request decline** — add a decline action next to Accept. The adapter currently only accepts.
- **Contact profile sheet** — show full JID, subscription state, presence, and actions.
- **Roster groups** — preserve `item.groups` from the roster and group the sidebar.
- **Avatar metadata (XEP-0084 / XEP-0153)** — fetch and cache avatars instead of initials.

## Rooms and calls

- **MUC (XEP-0045)** — join/leave rooms, occupants, room presence, and groupchat message rendering.
- **Jingle / WebRTC** — use `webrtc-adapter` before creating `RTCPeerConnection`; add audio/video call UI and permission handling.
- **Screen sharing** — depends on Jingle negotiation.

## Client features

- **Notifications** — browser Notification API with per-conversation unread counts and a mute setting.
- **IndexedDB cache** — persist messages and roster for offline startup; keep MAM as the source of truth.
- **Multi-account** — extend `SessionStore` to an account list and key store state by account.
- **Drafts** — persist the composer draft per conversation.
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
