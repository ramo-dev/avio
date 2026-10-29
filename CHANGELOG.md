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
- Added an honest security status panel: TLS transport, no E2EE yet.
- Added an isolated OMEMO cryptographic spike and integration plan; not wired into
  the UI or enabled for users.
- Added a development-only warning that this build is not production ready.

### Changed

- Unified the conversation list for DMs and rooms, with stacked participant
  avatars and a group badge.
- Made reactions single-select per user with animated enter/exit states.
- Added tooltips and a confirmation dialog to message actions.
- Moved the app version into `package.json` and exposed it through XMPP software
  version.
