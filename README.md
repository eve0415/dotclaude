# dotclaude

A privacy-first web dashboard for your Claude Code data. Open your `~/.claude` directory — or a single project directory, or one session `.jsonl` — and explore sessions, transcripts, tool calls, subagents, token spend, and memories.

**Your data never leaves your browser.** Files are read via the File System Access API (with file-input and drag-drop fallbacks), parsed in a local Web Worker, and rendered client-side. The server only serves the app shell.

## Views

- **Overview** — sessions, output tokens, cache efficiency, estimated API cost, daily activity, top tools
- **Projects** — per-project session tables: duration, models, turns, tool counts, cost
- **Transcript** — virtualized conversation view with a timeline gutter, collapsible thinking blocks, tool call/result cards, in-memory search, filters, and a subagent drawer
- **Usage** — cost and token charts per day and per model, tool-call frequency
- **Memory** — auto-memory files with frontmatter types and `[[links]]`
- **History** — global prompt history

## Stack

pnpm workspace, Cloudflare Workers:

- `apps/web` — [TanStack Start](https://tanstack.com/start) + React 19 (React Compiler) + Tailwind v4, deployed to Cloudflare Workers
- `packages/schemas` — zod v4 schemas and pure parsers for the `~/.claude` formats (transcript JSONL, usage/cost, memory frontmatter, history)
- `packages/ui` — shadcn/ui components on [Base UI](https://base-ui.com), source-only

Tooling: oxlint (type-aware) + oxfmt, vitest, tsgo for the editor.

## Development

```sh
pnpm install
pnpm dev        # web app on :3000
pnpm lint       # oxlint --fix + oxfmt
pnpm lint:ci    # check only
pnpm test       # vitest across packages
pnpm build      # vite build (client + worker)
pnpm deploy     # wrangler deploy
```

No data handy? The onboarding page has an "Explore with demo data" mode.

### Browser support

The full experience (persistent directory handle, one-click reconnect, rescan) needs the File System Access API — Chrome, Edge, Arc, and other Chromium browsers. Firefox and Safari fall back to a one-shot directory/file picker.

## Privacy

- No telemetry, no analytics, no cookies.
- The only network requests are for the app itself — fonts are bundled, and the production CSP (`connect-src 'self'`) blocks anything else.
- Directory access is requested read-only; the persisted handle lives in your browser's IndexedDB and can be cleared with "Disconnect".

## License

MIT
