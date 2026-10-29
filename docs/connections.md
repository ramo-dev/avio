# Connection Setup Guide

Avio talks directly to an XMPP server. There is no Avio backend, relay, or
account service. This guide covers the user flow, the server requirements, and
the Tauri-specific setup.

For the local development server, see `dev/xmpp/README.md`.

## 1. What you need

| Thing | Required | Notes |
|---|---|---|
| XMPP address (JID) | Yes | `you@example.com` |
| Password | Yes | Kept in memory and tab-scoped session storage; never `localStorage` |
| WebSocket or BOSH endpoint | Usually no | Discovery can supply it; advanced fields override it |
| Valid TLS certificate | Yes | Browsers reject `ws://` from an `https://` page |
| Server origin allowlist | For custom domains | The app origin must be allowed to open the WebSocket |
| MUC component | For group chats | A conference service such as `conference.example.com` |

## 2. Connect in Avio

1. Open the app.
2. Enter your full JID, including the domain.
3. Enter your password.
4. Press **Connect**.
5. Only if connection fails, open **Connection options** and fill in the
   WebSocket or BOSH URL.

The advanced fields:

- **WebSocket URL** — preferred. Example:
  `wss://chat.example.com/xmpp-websocket`
- **BOSH URL** — fallback. Example:
  `https://chat.example.com/http-bind`
- **Resource** — optional session label. Avio generates
  `avio-web-<random>` when empty.

Leave the endpoint fields empty when the server publishes discovery records.
Do not mix `https://` pages with `ws://` endpoints in production.

### How discovery works

Avio uses Stanza's host-meta discovery: it requests
`https://<domain>/.well-known/host-meta.json` and
`https://<domain>/.well-known/host-meta` and looks for alternate-connection
links:

```xml
<Link rel="urn:xmpp:alt-connections:websocket"
      href="wss://chat.example.com/xmpp-websocket"/>
<Link rel="urn:xmpp:alt-connections:xbosh"
      href="https://chat.example.com/http-bind"/>
```

Browsers cannot perform DNS SRV lookups. Host-meta is therefore the reliable
discovery path for the web app. If discovery returns no endpoint, the
connection has nothing to dial — fill in **Connection options**.

## 3. Server requirements

Any standards-compliant server works. The server must expose:

1. **C2S over WebSocket (WSS) or BOSH (HTTPS).** Plain TCP XMPP is not
   reachable from a browser.
2. **A trusted certificate** for the host used in the URL.
3. **The app origin allowlisted** where the server checks `Origin`.
4. **Normal XMPP features** Avio relies on: roster, presence, carbons,
   receipts, chat markers, and stream management.
5. **A MUC component** for group chats. Avio discovers it through service
   discovery and creates rooms under it.

### Prosody

A minimal starting point for a self-hosted deployment:

```lua
-- /etc/prosody/prosody.cfg.lua
modules_enabled = {
  "roster";
  "saslauth";
  "tls";
  "dialback";
  "disco";
  "carbons";
  "pep";
  "private";
  "blocklist";
  "vcard4";
  "vcard_legacy";
  "websocket";
  "bosh";
}

consider_websocket_secure = true
consider_bosh_secure = true

cross_domain_websocket = { "https://chat.example.com" }
cross_domain_bosh = { "https://chat.example.com" }

http_ports = { 5280 }
https_ports = { 5281 }

ssl = {
  certificate = "/etc/letsencrypt/live/example.com/fullchain.pem";
  key = "/etc/letsencrypt/live/example.com/privkey.pem";
}

VirtualHost "example.com"

Component "conference.example.com" "muc"
  restrict_room_creation = false
```

Endpoints:

```text
wss://example.com:5281/xmpp-websocket
https://example.com:5281/http-bind
```

Verify the configuration:

```bash
prosodyctl check
```

### Reverse proxy

Terminate TLS at the proxy and forward the upgrade:

```nginx
location /xmpp-websocket {
  proxy_pass http://127.0.0.1:5280/xmpp-websocket;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 3600s;
}

location /http-bind {
  proxy_pass http://127.0.0.1:5280/http-bind;
  proxy_set_header Host $host;
  proxy_buffering off;
}
```

If the app is served from a different origin, add it to
`cross_domain_websocket` / `cross_domain_bosh`. WebSocket itself is not
governed by CORS, but Prosody checks `Origin` for cross-domain WebSockets.

### ejabberd and others

The requirements are the same: expose a WSS or HTTPS BOSH endpoint, use a
trusted certificate, and allow the app origin. Consult the server's
documentation for the exact listener names and module settings.

## 4. Local development

```bash
pnpm xmpp:up
```

The local Prosody container provides:

```text
alice@localhost / alice123
bob@localhost   / bob123
ws://localhost:5280/xmpp-websocket
```

Enter that WebSocket URL in **Connection options**. Local development uses
`ws://` intentionally; production must use `wss://`.

Run the real-client test:

```bash
pnpm test:integration
```

## 5. Tauri

The web client is the source of truth. Tauri wraps it without changing the XMPP
model.

Checklist:

- **CSP**: allow `connect-src` for the XMPP hosts, for example
  `wss://example.com` and `https://example.com`. Do not use `*`.
- **Trusted TLS**: the OS webview uses the system trust store. Self-signed
  certificates need a development-only workaround, not a production setting.
- **Origin allowlist**: add the Tauri app origin used by your build. Tauri v2
  uses `tauri://localhost` on macOS/Linux and `https://tauri.localhost` on
  Windows in many configurations; confirm the origin in your build.
- **Secure storage**: replace the web `SessionStore` with an OS keychain
  adapter. Passwords must not move from `sessionStorage` into a Tauri
  `localStorage`.
- **Static build**: verify the TanStack Start output runs without the Nitro
  server before packaging.
- **Deep links**: a `xmpp:` link handler should open the connect screen with
  the JID prefilled, never auto-connect.

## 6. Session, reconnect, and security

- The JID, transport URLs, and resource are stored in `localStorage`.
- The password is stored in `sessionStorage` only, so it survives a refresh
  and disappears with the tab. It is cleared on logout and on auth failure.
- Reconnect uses exponential backoff with jitter and stream management.
- Messages render as text; attachments are links. Never render XHTML-IM.
- Production endpoints must be `wss://` or `https://`. A `ws://` endpoint on
  an HTTPS page is blocked by the browser and would expose credentials.

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| “Could not reach the XMPP server” | Wrong endpoint, DNS, or proxy | Check the WSS URL and proxy upgrade headers |
| “Server rejected those credentials” | Wrong JID/domain or password | Use the full JID; check app-specific passwords |
| Stuck on “Connecting” | Discovery found no endpoint | Fill in **Connection options** |
| Connects, then closes immediately | TLS or origin rejection | Check server logs and `cross_domain_websocket` |
| Connects but the roster is empty | Roster fetch failed or is pending | Reconnect; check server permissions |
| “No group chat service was found” | No MUC component or disco items | Add a `conference.*` MUC component and check `disco#items` |
| Mixed-content error | `https://` app with `ws://` endpoint | Use `wss://` or `https://` |
| Works in browser, not Tauri | CSP or origin allowlist | Add `connect-src` and the Tauri origin |

Useful checks:

```bash
curl -s https://example.com/.well-known/host-meta.json
curl -I https://example.com/xmpp-websocket
```

Browser DevTools → Network → WS shows the upgrade and stream frames. Server
logs usually name the TLS, SASL, or origin failure directly.

## 8. Design goals

Avio is deliberately closer to a fast native client than to a traditional
desktop XMPP client:

- Lazy-load the Stanza adapter so the first paint does not wait for XMPP.
- Keep the connection lifecycle in one store, not in scattered UI state.
- Prefer one JID/password screen; advanced transport settings stay out of the
  way.
- Reconnect quietly; stream management and receipts catch up in the
  background.
- Cache-first startup and offline reading are planned; MAM remains the source
  of truth.
- Multi-account and connection profiles are deferred until the single-account
  session model is stable.

## 9. Developer map

```text
ConnectForm
  → useXmppActions().connect
  → lib/xmpp/store.connect
  → lib/xmpp/lazy-adapter (dynamic import)
  → lib/xmpp/client.createStanzaAdapter
  → stanza.createClient({ transports, stream management })
  → stanza events → stanza-events → reducers → store → UI
```

Key files:

- `src/components/auth/connect-form/connect-form.tsx` — form and advanced options
- `src/lib/xmpp/store.ts` — connect, session restore, roster, actions
- `src/lib/xmpp/client.ts` — transport and reconnect lifecycle
- `src/lib/xmpp/roster-adapter.ts` — roster fetch, group updates, subscriptions
- `src/lib/storage/session.ts` — `localStorage` session + `sessionStorage` password
- `src/lib/xmpp/session-restore.ts` — refresh restore
- `src/lib/xmpp/backoff.ts` — reconnect delay
- `docs/architecture.md` — layer and lifecycle overview

When adding a connection field, keep it in `ConnectCredentials`, persist only
non-secret values in `StoredSession`, and pass it through the adapter boundary.
Never import Stanza types into components.
