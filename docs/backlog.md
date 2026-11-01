# Avio Backlog

Deferred work lives here instead of `TODO` comments. Each item should include enough context to start without rediscovering the design.

## Messaging

- **MAM history pagination (XEP-0313)** — initial history loads the latest 50 messages and replays archived reactions/corrections. Apply the same action replay when older pages are added on scroll-top; initial pagination work is on `feat/mam-drafts`.
- **Retractions (XEP-0424)** — message actions currently remove a message locally; add protocol retraction with a tombstone.
- **Upload cancellation and retry** — the XEP-0363 upload path stages files, reports progress, sends OOB links, and renders image/file/video cards. Add per-file cancel/retry controls for failed uploads.
- **Message search** — local search over the in-memory conversation store first, then MAM search.
- **Delivery/read receipt parity** — displayed markers are sent for direct
  chats while the conversation is open and the tab is visible, and delivered/read
  state is stored locally so refresh replays show it. Settings > Chats can stop
  sending receipts. Remaining: group/room receipts (not sent yet).

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

- **Room invites** — inviter-only pending invites, sidebar request actions, a
  read-only MAM preview before joining, and an invite-only fallback are
  implemented. Remaining: invite cancellation, server-specific MAM preview
  edge cases, and live invite acceptance tests.
- **MUC (XEP-0045)** — basic create/join, groupchat messages, invitations, bookmarks, and occupant info are implemented. Remaining: room discovery UI, room configuration, moderation, room MAM, and inviting by bare JID (Add members currently lists roster contacts only).
- **Room reactions** — reaction stanzas are now broadcast as `groupchat` and
  shown with author tooltips. Rooms created by Avio are non-anonymous so member
  JIDs are visible. On refresh, reactions are restored from a tab-scoped
  `sessionStorage` snapshot because Prosody does not replay body-less reaction
  stanzas. The snapshot is cleared on logout. Pending: confirm other servers'
  behavior, and replace the snapshot with room MAM once reaction archiving is
  reliable.
- **Jingle / WebRTC** — use `webrtc-adapter` before creating `RTCPeerConnection`; add audio/video call UI and permission handling.
- **Screen sharing** — depends on Jingle negotiation.

## Security and encryption

- **OMEMO 1:1 (XEP-0384)** — primary E2EE goal. The project is GPLv3, so
  `libomemo.js` (GPLv3) is the crypto engine. It is not audited yet. The key
  store, passphrase-encrypted storage, legacy 0.3.0 device-list/bundle PEP
  boundary, lifecycle engine, and message codec live in `src/lib/omemo` and
  `src/lib/xmpp/omemo-*.ts`. The opt-in app layer is now wired: `OmemoAccount`
  probes/sets up/unlocks per account, the provider decrypts incoming envelopes
  and sends only encrypted envelopes, settings/contact UI expose device
  fingerprints and trust (including your other devices), and the composer has a
  per-chat lock. Remaining:
  forwarding, attachments, and MAM history, and independent audit. Per-chat encryption choices are persisted; locked
  placeholders retry automatically after unlock or device verification;
  outgoing encrypted carbons are decrypted without duplicating the originating
  device's copy.
- **Live OMEMO device-list updates** — device lists are fetched on each encrypted
  send and when contact info opens, so trust works without reconnecting. Add PEP
  subscriptions to surface new/removed devices proactively and avoid discovering
  them only through a failed send or an opened contact panel.
- **OMEMO2 PEP (XEP-0384)** — legacy 0.3.0 device lists and bundles are
  implemented. Add the `urn:xmpp:omemo:2` device-list/bundle nodes and
  version-aware selection after 1:1 messaging works.
- **OpenPGP for XMPP (XEP-0374)** — Gajim supports it for 1:1, groups, and files.
  Defer until OMEMO 1:1 is stable; `openpgp` is LGPL-3.0+ and GPLv3-compatible.
- **Key storage** — passphrase-encrypted IndexedDB storage exists in
  `src/lib/omemo` (PBKDF2-HMAC-SHA-256, AES-GCM, authenticated KDF metadata,
  legacy plaintext store deleted) and is wired through `OmemoAccount` with a
  10-minute idle auto-lock, repair/reset, and remembered unlock. Remaining:
  OS keychain for Tauri, explicit passphrase recovery/backup design, browser
  IndexedDB upgrade coverage, and independent audit.
- **Remembered unlock on web (option B, done)** — "Remember unlock on this
  device" stores the non-extractable AES-GCM key derived from the passphrase in
  IndexedDB (`avio-omemo-unlock`), never the passphrase. The key is cleared by
  Lock, logout, and auto-lock, and expires after 24 hours. Remaining: make the
  expiry configurable, and rely on CSP because script running in the page can
  still use the key.
- **Native unlock via OS keychain (option C)** — Tauri should store the unlock
  secret in the OS keychain, not IndexedDB. Add a `passphrase` variant to
  `OmemoUnlockSecret`, handle it in `restoreRememberedUnlock`, and implement
  `OmemoUnlockStore` on top of the keychain.
- **Security settings surface** — transport status, OMEMO setup/unlock/status,
  device ID/fingerprint, per-chat warning, contact device trust, encrypted
  message indicators, repair/reset, and a Server capabilities panel grouped by
  security status (insecure transport callout, active/upcoming services,
  browser limits) are implemented. Remaining: a broader audit checklist and
  unencrypted-send warnings for rare edge cases.
- **Security threat model and CSP** — `docs/threat-model.md` is the working
  draft. Done: attachment URLs are limited to http(s) at normalization; the app
  is a static SPA with a generated CSP (`scripts/generate-csp.mjs`) that hashes
  the shell's inline scripts. Browser-verified with Playwright: boot,
  navigation, authenticated login, and Settings > Security have no violations.
  The check found and fixed a blocked `wasm-eval` (OMEMO's libsignal), now
  allowed narrowly via `'wasm-unsafe-eval'`. Converse.js is MPL-2.0, but its
  OMEMO dependency `libomemo.js` is GPLv3 and unaudited.
- **Storage privacy** — `docs/storage-privacy.md` analyzes everything the web
  client persists (cookies, localStorage, sessionStorage, IndexedDB) and who
  can read it. Remaining follow-ups, ranked there: gate the sessionStorage
  password so crash-restored tabs do not revive it and make refresh-restore
  opt-in; encrypt the password blob with a non-extractable WebCrypto key
  instead of plaintext; encrypt the metadata stores (receipts, invites,
  reactions, encryption preferences) at rest with a device key; verify SCRAM
  negotiation in the pinned Stanza; surface session-storage state in the
  security settings.
- **OMEMO passphrase policy (done)** — new passphrases need at least 12
  characters, must not be common, and need at least four distinct characters
  (`src/lib/omemo/passphrase.ts`). Existing shorter passphrases still unlock.
  Not done: a full strength estimator, which would need a new dependency.
- **Privacy controls** — receipts and typing indicators are configurable in
  Settings > Chats. Remaining: block list, presence visibility, history
  retention, and clear-local-history.
- **Accounts and connections** — Gajim-style onboarding is implemented:
  XEP-0156 autodiscovery with a discovery panel, conventional-endpoint probing,
  and optional host/port overrides used for WebSocket probing. Remaining:
  multi-account, resource/priority, proxies, and custom CA/certificate
  handling.
- **Hosted web deployment (removed)** — Avio no longer ships a container or hosted
  web build. The Docker deployment and `docs/deployment.md` were deleted; the
  static build remains the Tauri frontend and the browser test harness.

## Client features

- **IndexedDB cache** — persist messages and roster for offline startup; keep MAM as the source of truth.
- **Multi-account** — extend `SessionStore` to an account list and key store state by account.
- **Theme toggle** — the CSS already supports `.dark`; add a persisted preference.
- **Accessibility pass** — verify message log announcements, dialog focus traps, and keyboard navigation with a screen reader.
- **Typing indicator polish** — stop composing on blur and on conversation switch.

## Tauri

- **Static/SPA build (done for web)** — `pnpm build` produces a static
  `.output/public` with a prerendered `_shell.html`, and `pnpm serve:static`
  serves it with SPA fallback. Remaining: confirm the Tauri webview loads this
  output with no Nitro server.
- **Secure storage** — replace localStorage session persistence with a Tauri store/keychain adapter.
- **CSP** — allow the configured `wss://` XMPP hosts and block everything else.
- **Auto-update and packaging** — after the web MVP is signed off.

## Research notes

- **Integration flake** — `client.integration.test.ts` intermittently times out
  at its first 5-second "bob connected" wait when `pnpm test:integration` runs
  all four live suites in parallel against one Prosody. It passes alone. Run the
  suites serially or raise the connection wait before trusting a red run.

- `staydown` is installed as requested, but v2.0.3 has no `destroy()` API and adds a non-removable `window.resize` listener. The app uses `@shadcn/react` `MessageScroller` instead. Revisit only if a Tauri-only, app-lifetime scroll container needs it.
- Base UI portals require `.root { isolation: isolate }`, already applied in `src/styles/base.css`.
