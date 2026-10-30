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

### Changed

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
