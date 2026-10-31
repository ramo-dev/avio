# Changelog

All notable changes to Avio are documented here.

Avio follows [Semantic Versioning](https://semver.org/). Pre-1.0 releases are
development previews: interfaces, storage formats, and behavior may change
without a deprecation period.

## [0.1.0-dev.0] - 2026-10-29

### Added

- Direct XMPP messaging over WebSocket or BOSH, with discovery fallback.
- Roster, presence, typing indicators, unread counts, receipts, and read markers.
- Persistent optimistic message status, retry, replies, edits, reactions,
  forwarding, and local deletion.
- MUC group chats: room creation, service discovery, configuration, bookmarks,
  direct invites, invite requests, occupants, roles, and group info.
- Thread search, message groups, attachments, and native audio/video playback.
- Settings for appearance, sounds, chat behavior, notifications, and connection
  details.
- Persisted per-account notifications and room invite state.
- Responsive desktop dialog/mobile drawer primitives.
- Local Prosody development environment with a conference component.

### Security

- Relicensed Avio under GPLv3 to allow compatible OMEMO and OpenPGP work.
- Added a security status panel with transport and explicit E2EE state.
- Added an isolated OMEMO cryptographic spike; superseded by the opt-in
  support below.
- Added opt-in, experimental OMEMO 1:1 support with passphrase-encrypted key
  storage, PEP device discovery, explicit device trust, encrypted message
  transport, and locked placeholders. It is off by default and unaudited.
- Added optional "Remember unlock on this device" for OMEMO. It stores only the
  non-exportable key derived from the passphrase in IndexedDB, never the
  passphrase, and is cleared by Lock, logout, or the 10-minute idle lock.
- Added a default encryption preference for new direct chats.
- Added an explicit unencrypted fallback confirmation and message marker when
  no OMEMO device is available.
- Added a development-only warning that this build is not production ready.
- Production builds ship a Content-Security-Policy with hashed inline scripts
  and no `'unsafe-eval'`. See `docs/threat-model.md`.
- Incoming attachment links are limited to http(s), so unsafe schemes such as
  `javascript:` are dropped before rendering.
- New OMEMO passphrases need at least 12 characters and must not be common or
  repetitive. Existing passphrases still unlock.

### Changed

- The web build is now a static SPA with a prerendered shell
  (`.output/public`). Serve it with SPA fallback to `index.html`;
  `pnpm serve:static` does this locally.
- The contact/group info side panel is backed by a `panel` URL search param, so
  a refresh restores the panel for the selected conversation.
- Group reactions are sent as `groupchat` stanzas, rooms expose member JIDs to
  each other, and reaction chips now name who reacted.
- Group reactions are restored after a refresh from a tab-scoped snapshot,
  because Prosody's MUC history and MAM do not replay reaction-only stanzas.
- Accepting a contact request now also subscribes to that contact's presence,
  so presence is mutual instead of one-directional.
- The open conversation sends XEP-0333 displayed markers for new incoming
  messages, so other clients can show read receipts.
- Per-chat encryption choices now persist per account, including an explicit
  "off" under an OMEMO default, so a refresh no longer resets a chat to the
  default and silently changes its protection.
- Remote images, video, and audio load only after an explicit tap. Messages no
  longer contact file hosts automatically, so reading a chat does not reveal
  your IP or read time to the sender's host.
- Remembered OMEMO unlock keys expire after 24 hours; room reaction
  snapshots are cleared on logout.
- Group chats show a "Not encrypted" badge with an explanatory tooltip, since
  group OMEMO is not implemented yet.
- The generated CSP now allows `'wasm-unsafe-eval'` only, so libsignal's
  WebAssembly OMEMO engine works under the production policy. Browser smoke
  checks show no other CSP violations.
- Fixed transcript scrolling where new outgoing messages could leave a large
  un-scrollable blank area. Fixed a nested button in the group info tooltip,
  canonicalized the `?panel=` URL, and clarified invite previews (invite-only
  member label, bare inviter JID, join hint in the composer).
- Read state survives a refresh: delivered/read receipts are stored locally and
  re-applied when MAM replays the conversation. Add a Settings > Chats toggle to
  stop sending read receipts.
- "Encrypt new direct chats by default" is now a guided switch: turning it on
  before OMEMO is ready scrolls to setup/unlock and focuses the passphrase, and
  the default is saved only once OMEMO can encrypt.
- Settings > Security keeps only secondary passphrase-storage mechanics in a
  tooltip. Warnings, current state, and irreversible consequences stay visible.
- Added Repair keys (top up pre-keys and republish without changing identity) and
  Reset OMEMO (new identity/device, fresh passphrase, old device removed from
  the PEP list) to Security settings.
- Nested dialogs opened from Settings (such as Reset OMEMO) now render a
  dimming overlay above the parent dialog instead of inheriting its muted layer.
- Reaction tooltips expose tooltip semantics, and the group "Not encrypted"
  badge becomes icon-only on narrow screens so group names fit.
- README diagrams now show the federation trust boundary and the message/receipt
  lifecycle instead of the basic chain and state sketches.

- Unified the conversation list for DMs and rooms, with stacked participant
  avatars and a group badge.
- Added inviter-only pending room invites, sidebar preview, and read-only room
  MAM preview with an invite-only fallback before joining.
- Pending room invitees now show as "Invited" under Invites instead of appearing
  as members, even when the server already lists them as members-only affiliates.
- Raised the toast layer above dialog and drawer overlays.
- Made reactions single-select per user with animated enter/exit states.
- Added tooltips and a confirmation dialog to message actions.
- Moved the app version into `package.json` and exposed it through XMPP software
  version.
