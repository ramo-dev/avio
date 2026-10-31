# Avio Threat Model

Status: draft for review. Updated with the static SPA build, the generated CSP,
the attachment URL fix, and the passphrase policy. Update this file whenever
storage, transport, rendering, the build output, or the CSP changes.

Avio is a web XMPP client. Its code runs in the browser, so anything that
compromises the page compromises the user's session. The TLS layer protects
transport, not message contents. OMEMO is experimental and unaudited.

## Assets

| Asset | Where it lives | Protection |
| --- | --- | --- |
| XMPP password | `sessionStorage` (tab only) | Cleared on logout and auth failure. Never `localStorage`. |
| JID, transport URLs, resource | `localStorage` | Not secret. |
| OMEMO identity and session keys | IndexedDB `avio-omemo`, as an envelope | AES-GCM under a PBKDF2 key (600,000 iterations), with the account JID and KDF metadata bound as AAD. |
| OMEMO passphrase | User memory only | Never stored. New passphrases must be at least 12 characters and not common or repetitive. |
| Remembered unlock key | IndexedDB `avio-omemo-unlock` | Non-extractable AES-GCM key. Opt-in. Cleared by Lock, logout, and auto-lock (10 minutes idle). |
| Decrypted messages and roster | In-memory store | Not cached to disk. No IndexedDB message cache yet. |
| Settings | `localStorage` | Not secret. |

## Actors and trust boundaries

- **Network attacker:** can observe or modify traffic between the browser and
  the XMPP server or HTTP upload host.
- **Server operator:** trusted for availability and routing. Not trusted for
  message confidentiality outside OMEMO.
- **Remote contact:** sends arbitrary stanzas and content. All incoming content
  is untrusted.
- **Injected script:** code running in the app origin through XSS, a
  compromised dependency, or a malicious browser extension.
- **Local user or profile reader:** someone with access to the browser profile
  or the unlocked device.

Trust boundaries:

1. Browser to XMPP server (WSS, TLS certificate validation).
2. Browser to HTTP upload and file hosts (HTTPS).
3. Incoming stanza to normalized domain model (`src/lib/xmpp`).
4. Domain model to React render tree (text only; links limited to http(s)).
5. App origin to browser storage (`localStorage`, `sessionStorage`, IndexedDB).
6. Static host to browser (the CSP is delivered with the shell).

## Threats and mitigations

| ID | Threat | Mitigation in code | Residual risk |
| --- | --- | --- | --- |
| T1 | Passive network eavesdropping | Production endpoints must be `wss://` or `https://`. A `ws://` endpoint is blocked on HTTPS pages (mixed content). | Server and network can see metadata (who talks to whom, when, sizes). |
| T2 | Malicious or curious server reads non-OMEMO messages | None by design. Transport encryption only. | High for non-OMEMO chats. Users must opt into OMEMO per chat, and it is off by default. |
| T3 | Malicious server or contact spoofs roster, presence, or invites | Invites are inviter-only and visible only to the inviter; members-only rooms; invite state reconciled through MUC member queries. | Server controls roster and presence. A spoofed invite can still show a preview until the user declines. |
| T4 | Contact sends HTML or script in a message body | Bodies render as text through React. Only `dangerouslySetInnerHTML` is in the vendored chart component, and it interpolates theme colors only. | Low. |
| T5 | Contact sends an unsafe attachment URL (`javascript:`, `data:`, `blob:`, `file:`) | `isSafeAttachmentUrl` drops non-http(s) links at normalization (`src/lib/xmpp/message-attachments.ts`). Remote images, video, and audio render a placeholder until the user explicitly loads them, so reading a chat does not contact file hosts. Covered by tests. | Low. HTTP links from remote hosts remain allowed and show their hostname. |
| T6 | XSS in the app origin | React escaping; no `innerHTML` on message data; production CSP with hashed inline scripts, no `'unsafe-eval'`, and no inline event handlers (see CSP below). | Reduced, not removed. Injected script can still use the session, read the XMPP password, use an unlocked OMEMO session, or use a remembered unlock key. It can also send data to any `wss:` or `https:` host (the CSP must allow those because users pick their server). |
| T7 | Local profile reader obtains the remembered unlock key | Key is non-extractable and cannot be exported as bytes. Opt-in, cleared on lock and auto-lock. | Medium. Anyone with the unlocked profile can unlock OMEMO while the key is stored. |
| T8 | Force-closed tab keeps the remembered key | Auto-lock after 10 minutes idle clears it; remembered keys expire after 24 hours (`REMEMBERED_UNLOCK_TTL_MS`) and the expiry refreshes only on a successful remembered unlock. | Medium. Within 24 hours, reopening the app auto-unlocks. |
| T9 | Offline brute force of the OMEMO passphrase from the envelope | 600,000 PBKDF2 iterations; envelope metadata authenticated. New passphrases must be at least 12 characters, reject common phrases, and need at least four distinct characters. | Medium. Shorter passphrases created before this change still unlock, and a user can still choose a weak 12-character phrase. |
| T10 | Lost passphrase | Keys are unrecoverable by design. No backup. | Operational. Users must understand this before setup. |
| T11 | Contact's device key changes (MITM or new device) | Trust is bound to the reviewed fingerprint. Identity changes block reuse until reviewed. | Trust-on-review is only as good as the user's comparison. |
| T16 | Group messages inferred as encrypted | Group chats show a "Not encrypted" badge with a tooltip; the composer exposes no group encryption toggle. | None for group confidentiality until group OMEMO lands. |
| T12 | Silent downgrade to plaintext for OMEMO chats | No automatic plaintext fallback. Sending unencrypted requires a confirmation dialog and shows an **Unencrypted** marker. Per-chat encryption choices persist per account, including explicit off, so a refresh cannot silently reset a chat to the default. The default itself can only be enabled once OMEMO is set up and unlocked. | Users can still choose plaintext. |
| T13 | Dependency compromise (`libomemo.js`, GPLv3, unaudited) | Isolated in `src/lib/omemo`. OMEMO labeled experimental. | High until audited. |
| T14 | Secrets in logs | Production code does not log passwords, passphrases, or raw stanzas. The render error boundary logs the error and component stack (`console.error`). | Low. Error objects could contain user text. Review before release. |
| T15 | Cross-account replay of OMEMO envelopes or unlock keys | Account JID bound as AAD; remembered keys are per account and fail on another account. | Low. Covered by tests. |

## Static SPA build and CSP

The app is a static SPA. `vite.config.ts` enables TanStack Start `spa` mode, so
`pnpm build` prerenders one shell, `.output/public/_shell.html`, and the host
serves it for every app route. The XMPP client is already browser-only, so the
app does not need server rendering.

`pnpm build` runs `scripts/generate-csp.mjs` after the Vite build. The script:

1. Hashes every inline `<script>` in the shell. External module scripts are
   excluded because `'self'` covers them.
2. Fails the build if the shell has inline event handlers.
3. Inserts the policy as a `<meta http-equiv="Content-Security-Policy">` tag
   after `<head>` in `_shell.html` and `index.html`. This works on any host.
4. Writes `_headers` with the same policy plus `frame-ancestors 'none'`, for
   hosts such as Netlify and Cloudflare Pages.

Dev mode (`pnpm dev`) has no CSP, because Vite HMR needs inline code.

Current policy shape (script hashes change with each build):

```text
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' 'sha256-…' …;  # hashes per inline shell script
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https:;
media-src 'self' blob: https:;
font-src 'self';
connect-src 'self' wss: https:;
worker-src 'none';
frame-src 'none';
manifest-src 'self';
object-src 'none';
base-uri 'none';
form-action 'self';
frame-ancestors 'none';                    # _headers only
```

Why these values:

- `script-src` has no `'unsafe-inline'` or `'unsafe-eval'`. `'wasm-unsafe-eval'`
  is required because libsignal compiles WebAssembly for OMEMO; it does not
  enable JavaScript eval. The only inline scripts are the hashed shell scripts,
  and the client bundle has no `eval` or `new Function`.
- `style-src 'unsafe-inline'` stays because React and Base UI set `style`
  attributes. Nonces cannot cover attributes, and style injection is a
  lower-risk relaxation than script injection.
- `connect-src wss: https:` is broad because users choose their own XMPP server
  and upload hosts. A CSP cannot limit exfiltration to that server. This is the
  main residual part of T6.
- `img-src` allows `https:` for remote attachments and avatars. `http:` is not
  allowed because mixed content is blocked on HTTPS pages.
- `worker-src`, `frame-src`, and `object-src` are `'none'`. The app uses no
  workers, iframes, or plugins.

Hosting requirements:

- Serve `.output/public` with SPA fallback: unknown app routes return
  `/index.html`, while missing asset files return 404. `pnpm serve:static` does
  this locally, but it does not send `_headers`.
- Do not minify or rewrite `index.html` after the build. The hashes depend on
  the exact bytes of the inline scripts.
- Production XMPP and upload hosts must use `wss://` and `https://`. A local
  `ws://localhost` Prosody is blocked by the policy when the static build is
  tested, so use a TLS proxy or the dev server for local XMPP work.

Verification status:

- Checked statically: the hashes match the shipped `index.html`; the policy has
  no `'unsafe-eval'`; the bundle has no `eval`; app routes fall back to the
  shell; asset 404s and path traversal are refused.
- Browser-checked with Playwright against `.output/public`: `/`, `/connect`,
  SPA fallbacks, an authenticated login, and Settings > Security all load with
  zero `securitypolicyviolation` events and no console/page errors. Two-account
  DM and group UX audits produced no CSP violations; they found and led to fixes
  for transcript scrolling and a nested-button hydration error. The first
  run caught a real bug: WebAssembly compilation was blocked (`wasm-eval`), so
  the policy now allows `'wasm-unsafe-eval'`. The authenticated run rewrote only
  `connect-src` to add `ws://localhost:5280` for the local Prosody, because the
  shipped policy requires `wss:`/`https:`.

## Accepted risks

- OMEMO is unaudited. Do not use it for sensitive conversations until the audit
  is complete.
- Remembered unlock trades convenience against profile access. It is off by
  default.
- The XMPP password lives in `sessionStorage`, so XSS can read it while the tab
  is open. This follows the existing `AGENTS.md` exception for web refresh
  restore. Tauri must use the OS keychain.
- Read receipts and typing indicators can be disabled in Settings > Chats; the
  tradeoff is that contacts then cannot see read/typing activity.
- Passphrases created before the 12-character rule still unlock. The app cannot
  check them without the passphrase, so it does not force a change.

## Open items

1. Review the render error boundary log for user content before release.
2. Complete the independent OMEMO audit before enabling OMEMO by default.
3. Verify group message send/receive against the production CSP on a TLS
   endpoint (the browser check used a test-only local `ws://` allowance).
5. Add a regression check that `dangerouslySetInnerHTML` is never used with message data.
6. For Tauri, give the desktop origin its own policy. The web policy is not
   reused, and `connect-src` must still allow the user's XMPP host.
7. Group OMEMO: group messages are not end-to-end encrypted. The header now says
   "Not encrypted"; supporting encrypted groups remains a feature project.
