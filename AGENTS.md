# Avio — Agent Rules

Avio is a web-first XMPP client. The web app must work before any Tauri packaging work begins.

## Stack

- TanStack Start, React 19, TypeScript, Vite, Tailwind CSS v4
- shadcn/ui with the **Base UI** registry (`base-nova`), never Radix
- `@remixicon/react` for icons, never Lucide or inline SVGs
- `stanza` for XMPP, `@shadcn/react` for message scrolling
- pnpm only. Never run `npm`, `npx`, or `yarn` in this repo.

## Commands

```bash
pnpm dev             # dev server on :3000
pnpm typecheck       # tsc --noEmit
pnpm check           # biome check
pnpm check:fix       # biome check --write
pnpm test            # vitest run
pnpm test:integration # real Stanza + local Prosody (requires pnpm xmpp:up)
pnpm audit:rules     # file-size, TODO, forbidden deps
pnpm react:doctor    # react-doctor scan of src
pnpm build           # production build
pnpm verify          # all of the above, in order

pnpm xmpp:up         # start local Prosody with alice/bob test accounts
pnpm xmpp:down       # stop local Prosody
```

Run `pnpm verify` before considering a task done. For XMPP changes, also run `pnpm test:integration` with the local Prosody container (see `dev/xmpp/README.md`). After React changes, also run `pnpm react:doctor` (the `react-doctor` skill).

## Architecture

```text
src/
  components/
    ui/          generated shadcn primitives (vendored; exempt from LOC rule)
    auth/        connect screen and form
    layout/      app shell, sidebar, mobile navigation
    chat/        roster, header, messages, composer, contacts
    common/      shared presentational pieces
  types/         shared domain types; no logic
  lib/
    xmpp/        stanza client, adapters, store, selectors, JID/error helpers
    storage/     session persistence boundary
    format/      time, avatar, message grouping
    scroll/      transcript scroll behavior
  hooks/         React bindings for stores and browser APIs
  providers/     app-wide context providers
  config/        app and XMPP defaults
  routes/        thin TanStack route files
  styles/        CSS split by responsibility
docs/
  architecture.md
  backlog.md
```

Data flow:

```text
Stanza events -> lib/xmpp adapters -> store -> selectors/hooks -> components
UI actions    -> store actions     -> lib/xmpp client
```

Never import stanza types into components. Normalize at the adapter boundary.

## Rules

### File size
- Hand-written files must be **under 300 lines**.
- Generated `src/components/ui/**` and `src/routeTree.gen.ts` are exempt.
- If a file grows past the limit, split by responsibility. Do not use `// biome-ignore` to hide it.

### Components
- Every component lives in its own folder named after it.
- Split by intent, not by convenience:
  - `src/components/chat/header/header.tsx`
  - `src/components/chat/header/header-actions.tsx`
  - `src/components/chat/messages/message-row.tsx`
- Never build a monolith such as `chat-header.tsx` that contains logo, actions, responsive logic, and sheets.
- Components compose and render. Parsing, formatting, grouping, and protocol logic belong in `src/lib`.
- Keep file names kebab-case and component exports PascalCase.

### Types
- Domain and shared types live in `src/types`.
- Component-local prop types may stay inline.
- Do not duplicate types between files. Import from `src/types`.

### Helpers and DRY
- JID parsing, message normalization, presence selection, time formatting, avatar initials, and grouping are helpers in `src/lib`.
- Do not hardcode protocol details, regexes, or display logic inside components.
- No copy-pasted logic across components. Extract on the second use.

### No TODO comments
- Do not write `TODO`, `FIXME`, or “implement later” comments.
- If work cannot be finished now, write it in `docs/backlog.md` with enough context to pick it up later.
- Never start a half-finished feature just to leave it disabled.

### Dependencies
- pnpm only.
- Base UI only. Do not add Radix packages or import `@radix-ui/*`.
- Remix Icon only. Do not add Lucide or hand-roll SVG icons.
- Do not add a new dependency without approval. Use the existing stack first.
- shadcn components must be added with the CLI, not written by hand:
  ```bash
  pnpm dlx shadcn@latest add <component>
  ```

### Client/server boundary
- XMPP connects from the browser only.
- `stanza`, `staydown`, `webrtc-adapter`, `@shadcn/react`, and anything touching `window`/`document` must be imported inside client-only effects or dynamically.
- Never connect during SSR.
- Use `ClientOnly` or `useHydrated` for URL/state that depends on the connection.
- Keep `src/lib/xmpp` free of DOM APIs so it can be tested and reused.

### XMPP and security
- Render message bodies as text. Never render XHTML-IM or raw HTML.
- Never persist passwords in `localStorage`. The web client may keep a tab-scoped password in `sessionStorage` for refresh restore; clear it on logout and auth failure. Tauri must use the OS keychain.
- Never log passwords or raw stanzas in production.
- Normalize stanza events before storing them.
- Deduplicate messages by stanza ID with a stable fallback key.
- Every network action must have a typed error path.

### Errors
- Surface user-facing failures through `react-hot-toast`; the shared `XmppErrorToaster` bridges store errors.
- Do not add inline error banners or alert blocks. Form validation also uses toasts.
- Deduplicate toasts by message id so retries do not stack duplicates.

### Styling
- Use semantic Tailwind tokens (`bg-background`, `text-muted-foreground`, `border-border`). No hardcoded hex colors.
- Use `cn()` from `cn` / `#/lib/utils`.
- Keep global CSS in `src/styles/*` and import it from `src/styles.css`.
- Fonts are self-hosted in `src/assets/fonts` and declared with `@font-face` in `src/styles/fonts.css`. Never add Google Fonts or CDN font imports.
- Base UI portals require the app root to have `isolation: isolate`.

## Backlog

All deferred work goes in `docs/backlog.md`. Current out-of-scope items include advanced MUC features (room configuration, moderation, room MAM), OMEMO, Jingle/WebRTC calls, push notifications, IndexedDB caching, multi-account support, and Tauri packaging.
