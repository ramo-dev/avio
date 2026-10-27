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
pnpm xmpp:down
docker compose -f dev/xmpp/compose.yml down -v
```

Removing the volume also removes the test accounts. `pnpm xmpp:up` recreates them.

## Integration test

With the container running:

```bash
pnpm test:integration
```

The test connects two Stanza clients, sends a message, and waits for the delivery receipt.
