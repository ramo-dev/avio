# OMEMO Integration Plan (`libomemo.js`)

Status: analysis for GPLv3 Avio. No OMEMO code is enabled yet.

## Recommendation

Use `libomemo.js` as the crypto engine and build the OMEMO/PEP/stanza/UI layers
inside Avio. It is GPLv3, TypeScript-first, browser-friendly, and supports both
OMEMO 0.3.0 and OMEMO2 (`urn:xmpp:omemo:2`).

It is explicitly **not formally audited**. That is a release blocker, not a detail.
Pin an audited version before enabling encryption.

`libomemo.js` is crypto-only. It implements X3DH and the Double Ratchet and
produces/consumes the per-device ciphertext. It does not build XMPP stanzas, PEP
bundles/device lists, or XEP-0420 SCE payloads. Avio must implement those.

## Why not copy another client

- Gajim, Conversations, and Dino are GPLv3-compatible but Python/Java/Vala; not
  portable to React/TypeScript.
- Monal is BSD-2-Clause but Swift/Apple-specific.
- Converse.js is MPL-2.0, but its OMEMO path is `libomemo.js` (GPLv3). Use it as
  an architecture reference, not a source dump.
- The XMPP specs are implementation-neutral. Build to XEP-0384, XEP-0420, and the
  bundled test vectors.

## Architecture

```text
components/chat
  -> hooks/use-omemo
  -> store (encryption policy, decrypted message state)
  -> lib/omemo/engine (libomemo.js)
       -> lib/omemo/store (IndexedDB + in-memory mirror)
       -> lib/omemo/pep (device lists, bundles)
       -> lib/omemo/message (SCE/OMEMO envelope)
  -> lib/xmpp/client (stanza send/receive)
```

### Proposed modules

- `src/lib/omemo/engine.ts` — wraps KeyHelper, SessionBuilder, SessionCipher,
  worker startup, version selection.
- `src/lib/omemo/store.ts` — libomemo.js storage interface, in-memory mirror,
  IndexedDB persistence, passphrase-derived AES-GCM at rest.
- `src/lib/omemo/pep.ts` — publish/fetch device lists and bundles over PEP.
- `src/lib/omemo/session.ts` — device discovery, bundle fetch, session build,
  prekey rotation, stale-device cleanup.
- `src/lib/omemo/message.ts` — OMEMO header + XEP-0420 SCE wrapping/unwrapping.
- `src/lib/omemo/trust.ts` — TOFU, fingerprints, identity-change detection.
- `src/types/omemo.ts` — normalized device, trust, encryption status types.

Keep every file under 300 lines. No stanza types in components.

## Critical storage constraint

The `OMEMOStore` interface is hybrid: `store`, `put`, `get`, and `remove` are
synchronous, while session/prekey/identity methods may return promises. IndexedDB
cannot back the synchronous generic map directly.

Design:

- Use an in-memory `Map` for the generic `store`/`put`/`get`/`remove` surface.
- Back session, prekey, signed-prekey, identity, and registration methods with
  IndexedDB asynchronously (the interface permits `Promise<T>`).
- Hydrate the in-memory map at unlock; flush dirty entries on
  `visibilitychange`/`pagehide`.
- Never use `localStorage` for key material.
- Encrypt private key material at rest with a passphrase-derived key
  (PBKDF2/Argon2 choice) or OS keychain in Tauri.

## PEP and device lifecycle

Per OMEMO version, publish and fetch:

- Device list node.
- Per-device bundle node.
- Own device list and bundles.
- Subscribe to contacts' device-list nodes.

Version-specific node names are centralized in `pep.ts`. The library requires the
version to be passed explicitly for every `SessionBuilder`/`SessionCipher`.

Lifecycle:

1. On first unlock: generate registration ID, identity key, signed prekey, prekeys.
2. Publish bundle and device list.
3. On login: refresh own device list, fetch contact bundles on demand.
4. Rotate prekeys; republish.
5. On logout: clear in-memory keys; keep encrypted store only if the user opted in.
6. On device removal: republish list; delete local sessions.

## Spike findings (verified with libomemo.js 3.0.0)

- Two `InMemoryStore` parties can establish a session and encrypt/decrypt in both
  directions.
- `EncryptResult.body` is a **binary string**, not base64. Decrypt with
  `encoding: "binary"`; base64 fails on arbitrary ciphertext.
- Pre-key messages use `type === 3` and require
  `decryptPreKeyWhisperMessage`; subsequent messages use
  `decryptWhisperMessage`.
- `InMemoryStore` is a valid reference store for tests and for validating the
  protocol layer before IndexedDB is wired.
- The spike is isolated in `src/lib/omemo/spike.test.ts` and is not imported by
  the app.

## Message flow

### Outgoing

1. Resolve recipient devices (contact + own other devices).
2. Fetch missing bundles and build sessions.
3. Encrypt the plaintext for each device.
4. Build the version-specific OMEMO header.
5. Wrap the payload in XEP-0420 SCE.
6. Send a message with the encrypted element and **no plaintext body**.
7. Persist the plaintext locally only after successful send policy checks.

If encryption is enabled and any step fails, **do not fall back to plaintext**.
Mark the message failed with an encryption error.

### Incoming

1. Detect the encrypted element/version.
2. Decrypt the SCE payload.
3. Verify the sender device and trust state.
4. Normalize into `ChatMessage` with `encrypted: true`.
5. On decryption failure, show a locked placeholder and an actionable error.
6. Deduplicate by stanza ID as today.

Carbons, MAM replay, receipts, edits, reactions, replies, and retractions all need
an encrypted-vs-plaintext decision. Do not ship a half-encrypted message model.

## OMEMO versions

`libomemo.js` supports:

- `eu.siacs.conversations.axolotl` — legacy OMEMO 0.3.0, widest ecosystem.
- `urn:xmpp:omemo:2` — OMEMO2, newer.

Plan:

1. Implement 0.3.0 first for interop with Conversations/Dino/Gajim.
2. Add OMEMO2 per-device.
3. Store sessions keyed by JID + device ID + version.
4. Never guess a version; use the device's advertised node.

## Trust and UI

- TOFU initially; store identity keys and device fingerprints.
- Device list in Security settings: device name, ID, last seen, trust state.
- Verification dialog with safety number/QR.
- Identity-key change blocks sending until the user re-trusts; warn loudly.
- Per-chat encryption toggle and lock icon.
- Unencrypted-send warning; encrypted mode never sends plaintext.
- Notification previews must say “Encrypted message” unless the app is unlocked.
- Conversation previews must not leak decrypted text while locked.
- Keep the current Security panel honest until the audit is complete.

## Security requirements

- CSP: `script-src 'self' 'wasm-unsafe-eval'` (verify against the libomemo build),
  `worker-src 'self'`, `connect-src` limited to XMPP hosts.
- Worker script must be same-origin, trusted, and never built from user input.
- No keys/plaintext in logs, analytics, errors, or toasts.
- No `dangerouslySetInnerHTML`; message content stays text.
- Dependency pinning, lockfile review, SBOM, and no postinstall scripts.
- Auto-lock and explicit unlock for the key store.
- Threat model covers malicious server, XSS, local device compromise, metadata,
  key backup, and device removal.

## Testing

- `libomemo.js` known-answer vectors.
- Store hydration/persistence, passphrase failure, quota failure.
- PEP publish/fetch against local Prosody.
- Alice/Bob 1:1 encrypt/decrypt, including carbons and MAM replay.
- Device add/remove, stale bundle, identity-key change.
- Tampered ciphertext, replay, wrong device, missing bundle.
- Interop with Dino/Conversations/Gajim.
- `pnpm test:integration` with a real Prosody account.
- UI tests for lock state, unencrypted warning, failed decrypt placeholder.

## Phased delivery

1. **Spike** — install/pin `libomemo.js`, worker, self-encrypt/decrypt, store
   interface prototype. No UI.
2. **Storage** — IndexedDB + in-memory mirror + passphrase unlock; tests.
3. **PEP** — publish/fetch bundles and device lists; local Prosody integration.
4. **1:1 messages** — send/receive, encryption toggle, lock icon, failure states.
5. **Trust** — TOFU, fingerprints, verification, identity-change handling.
6. **Hardening** — CSP, audit, interop, MAM/carbons/receipts, metadata review.
7. **Group/file E2EE** — OMEMO in MUC and XEP-0454 media; separate epic.
8. **OpenPGP** — XEP-0374; only after OMEMO is stable.

## Acceptance criteria for the first encrypted release

- A new device can publish a bundle and be discovered by a contact.
- Alice/Bob exchange an encrypted message with no plaintext body on the wire.
- Refresh keeps keys and sessions usable after unlock.
- Locked app shows no decrypted previews.
- Identity-key change blocks sends until re-trusted.
- Encryption failure never sends plaintext.
- Local Prosody integration test and one external-client interop pass.
- Security review/audit of the crypto path is complete or the feature remains
  behind an experimental flag with a loud warning.

## Main risks

- `libomemo.js` is unaudited.
- Sync store vs IndexedDB persistence.
- OMEMO version fragmentation.
- MAM/carbons/receipts are easy to half-implement.
- Group and file encryption are much harder than 1:1.
- GPLv3 distribution obligations for Tauri/app stores.
