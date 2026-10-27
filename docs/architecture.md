# Avio Architecture

Avio is a web-first XMPP client built with TanStack Start. The browser connects directly to an XMPP server over WebSocket or BOSH. There is no Avio backend.

## Layers

```text
routes/components  -> render state, dispatch user actions
hooks              -> bind the store to React
providers          -> create the store once per app
lib/xmpp/store     -> connection actions + session lifecycle
lib/xmpp/reducers  -> pure state transitions
lib/xmpp/client    -> stanza adapter and reconnect lifecycle
lib/xmpp/stanza-*  -> stanza -> domain mapping
types              -> shared domain contracts
```

The UI never sees stanza types. `stanza-events.ts` maps protocol events to `XmppEvent`, `reducers.ts` applies them to `XmppState`, and components read normalized data.

## Connection lifecycle

```text
idle -> connecting -> connected
                   -> error (auth/stream failure)
connected -> reconnecting -> connected
connected -> disconnected (manual)
```

- The adapter owns the stanza client, event subscriptions, timeout, and reconnect timer.
- Reconnect uses exponential backoff with jitter (`lib/xmpp/backoff.ts`).
- Manual disconnect cancels pending reconnects.
- Stream management and resumption are enabled.

## Store

`XmppState` contains:

- `connection`: status, error, JID
- `account`: parsed account
- `contacts`: roster entries + presence
- `conversations`: normalized message history + unread + typing
- `activeJid`: currently open conversation
- `subscriptionRequests`: pending inbound subscriptions

Updates are immutable. Selectors in `lib/xmpp/selectors.ts` derive sidebar summaries and totals.

## Messages

- Incoming `chat`, carbons, and receipts are normalized into `ChatMessage`.
- Outgoing messages are optimistic with `pending` status.
- Status progression: `pending -> sent -> delivered -> read`, or `failed`.
- Deduplication uses stanza ID with a stable fallback key.
- Message bodies render as text, never HTML/XHTML-IM.

## Client/server boundary

- The store is created during render but never opens a socket during SSR.
- `connect()` dynamically imports the stanza adapter, so `stanza` is not evaluated on the server.
- `MessageScroller` and Base UI portals run only in the browser.
- Session persistence stores JID and transport URLs in `localStorage`. A tab-scoped password lives in `sessionStorage` so refresh can restore the session; it is cleared on logout and auth failure.
- On session start the adapter loads the latest 50 MAM messages so the chat list and open conversation survive a refresh.
- Presence is aggregated per resource, so a contact stays online while any of their resources is available.

## Tauri readiness

- `lib/xmpp` has no DOM dependency.
- Storage is behind `SessionStore`; a Tauri keychain/store adapter can replace the web one.
- `webrtc-adapter` is installed but not imported until Jingle/WebRTC work starts.
- The app must remain compatible with a static/SPA build before packaging.
