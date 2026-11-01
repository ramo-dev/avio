# Client-side storage and privacy analysis

Status: analysis (see backlog for actionable follow-ups). Scope: the web client
only; Tauri packaging replaces this model with the OS keychain. The XMPP
protocol threat model (server-side message storage, MAM metadata) is covered in
`docs/threat-model.md`; this document covers what a browser leaves behind on a
device, and who can read it.

## Inventory of everything Avio persists

| Key / store | Mechanism | Contents | Sensitivity |
| --- | --- | --- | --- |
| `avio.session.v1` | localStorage | Bare JID, resolved endpoints, manual host/port, resource | Low: identifies the account on disk |
| `avio.session.password.v1` | sessionStorage (per tab) | XMPP password, plaintext | High: the account password |
| `avio.settings.v1`, theme, sound/notification prefs | localStorage | UI preferences | Low |
| `avio.message-receipts.v1` | localStorage | Per-conversation read-receipt timestamps | Medium: metadata (who read what, when) |
| `avio.room-invites.v1`, `avio.room-invite-requests.v1` | localStorage | Invite history and pending requests per account | Medium: contact/group metadata |
| `avio.room.reactions.v1` | sessionStorage snapshot | Who reacted with what, per room | Medium: metadata; cleared on logout |
| `avio.encryption.preferences.v1` | localStorage | Per-chat OMEMO on/off choices | Medium: reveals which chats are encrypted |
| `avio-omemo` IndexedDB | IndexedDB | OMEMO device state, session bundles, message keys | High: identity/signal keys |
| `avio-omemo-unlock` IndexedDB | IndexedDB | Passphrase wrap secret (non-extractable WebCrypto key, 24 h TTL) | High while unlock is remembered |
| `sidebar` state | `document.cookie` | Sidebar open/closed flag | Negligible |

No exact match: audit found **no authentication cookies, no third-party
scripts, no service worker, and no HTTP-cacheable sensitive data** (the SPA is
static assets only, served with a hash-based CSP).

## Who can read what

Threat model assumptions: the browser enforces same-origin isolation. The
readers below are the ones that break that assumption.

1. **XSS on Avio's origin.** Any injected script gets everything: the plaintext
   `sessionStorage` password, the localStorage metadata stores, and the OMEMO
   IndexedDB — including the remembered-unlock wrap key, which decrypts OMEMO
   state without user interaction for 24 h after each unlock. Mitigations
   already in place: hash-based CSP (no inline/remote script beyond audited
   hashes), no `dangerouslySetInnerHTML`/raw HTML rendering, attachment URL
   scheme whitelist, no third-party bundles. Residual risk is concentrated in
   any future dependency that executes HTML or URLs.
2. **Restored sessions are a doubled edge.** `sessionStorage` is designed to
   die with the tab, but browsers restore it when the browser is relaunched
   with "continue where you left off" or after a crash. In that scenario the
   plaintext XMPP password survives an app restart indefinitely. This is the
   sharpest edge in the current design.
3. **Forensics / shared devices.** Disk access to the profile (lost laptop,
   family computer, room-mates) yields: the bare JID, endpoint history,
   receipt timestamps, invite/reaction metadata, per-chat encryption choices,
   and OMEMO state. OMEMO state is passphrase-encrypted, but nothing else is;
   and with a remembered unlock (< 24 h) OMEMO is decryptable without knowing
   the passphrase.
4. **Malicious browser extensions** with host permissions can read
   localStorage/IndexedDB like an XSS can. Nothing an app can do beyond
   minimizing what is stored and warning users.

## What is already encrypted vs. not

- Encrypted at rest: OMEMO identity/session state (PBKDF2-HMAC-SHA-256 +
  AES-GCM, non-extractable wrap key, user passphrase, auto-lock, repair/reset).
- Plaintext at rest: everything else — all metadata stores and the password.
- Explicitly not allowed: persisting the password in localStorage (rejected in
  AGENTS.md and enforced by design); cookies for any auth purpose.

## Recommendations, ranked

1. **(High, low cost)** Treat the crash-restore gap: gate the
   `sessionStorage` password on `pagehide`/`unload` clearing, and add a
   Settings toggle "Keep me signed in on refresh" whose value decides whether
   the password is stored at all. Default off; users get explicit consent for
   the weak secret they are asked to keep.
2. **(High, medium cost)** Never store the bare password even in
   `sessionStorage`: store a password-encrypted blob keyed by a
   non-extractable WebCrypto key (same machinery as OMEMO unlock). This buys
   nothing against XSS (the key is reachable) but it removes the
   crash-restore plaintext and the forensic copy entirely.
3. **(Medium, low cost)** Encrypt the metadata stores at rest (receipts,
   invites, reactions, encryption preferences) with a non-extractable device
   key in IndexedDB. Limits disk-forensics exposure; does not stop XSS.
4. **(Medium, undetermined cost)** Prefer SCRAM over PLAIN when the server
   supports it (Stanza already negotiates SCRAM-SHA-1 by priority); verify
   `ws://`/`wss://` order and channel binding in the Stanza version we pin.
   SCRAM reduces password reuse damage across servers.
5. **(Medium, doc work)** Show storage-sensitive state in the security
   surface: the existing OMEMO lock/unlock row plus a "session storage"
   indicator for whether a password is being kept anywhere.
6. **(Long term)** This entire class of issue dissolves under Tauri: password
   in the OS keychain, OMEMO keys likewise, web storage holding only UI
   preferences.

## What this analysis deliberately does not claim

- It does not claim OMEMO protects metadata: timestamps and senders are
  visible in MAM and receipts regardless.
- It does not claim the OMEMO passphrase can be recovered: losing it
  sacrifices the device's key history by design.
- It does not count cookie exposure as a risk: only the sidebar-state cookie
  is set, with no sensitive value and no `Max-Age` beyond 7 days.

## Backlog links

Implemented follow-ups land in `docs/backlog.md` under "Storage privacy".
