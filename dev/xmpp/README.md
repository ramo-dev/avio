# Local XMPP test server

A minimal Prosody container for developing Avio against a real XMPP server.

## Start

From the repository root:

```bash
pnpm xmpp:up
```

This creates two accounts:

```text
alice@localhost / alice123
bob@localhost   / bob123
```

WebSocket endpoint:

```text
ws://localhost:5280/xmpp-websocket
```

On the Avio connect screen, open **Connection options** and enter the WebSocket URL above.

## Reset

```bash
pnpm xmpp:wipe
```

This stops the container and removes the Prosody data volume, including the
test accounts. `pnpm xmpp:up` recreates them.

## Integration test

With the container running:

```bash
pnpm test:integration
```

The test connects two Stanza clients, sends a message, and waits for the delivery receipt.

## End-to-end smoke

The live Playwright smoke exercises two accounts, mutual presence, DM delivery,
group invite/join, group reactions (including refresh restore), transcript
scrolling, the URL-backed info panel, and console errors.

```bash
pnpm exec playwright install chromium   # once
pnpm xmpp:up
pnpm test:e2e
```

The script starts `pnpm dev` itself if the app is not already running. Set
`APP_URL`, `XMPP_WS`, or `XMPP_PASSWORD` to target a different setup. It uses
`phiey@localhost` and `sam@localhost` from the compose file.

CSP smoke runs against the static build:

```bash
pnpm build
pnpm test:csp
```

It serves `.output/public` locally, logs in with a test-only `ws://` allowance
for the local Prosody, opens Settings > Security, and fails on any
`securitypolicyviolation`, page error, or console error.
