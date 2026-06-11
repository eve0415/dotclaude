# dotclaude

Privacy-first dashboard for Claude Code's `~/.claude` data. **Invariant: user file content never leaves the browser** — no fetch/beacon/server function may carry parsed data; the Cloudflare Worker only serves the SSR shell.

## Layout

- `apps/web` — TanStack Start (RC, pinned) + React 19 + React Compiler on Cloudflare Workers. File-based routes in `src/routes`; colocated private files use `-` prefixes (`-components/`, `-shared/`, `-transcript/`). `routeTree.gen.ts` is generated — never edit.
- `packages/schemas` — zod v4 tolerant parsers + pure aggregation for `~/.claude` formats. No DOM, no React. Unknown record/block types must keep parsing (loose objects, fallback unions).
- `packages/ui` — vendored shadcn on **Base UI** (`render` prop, not `asChild`), style base-rhea, Mauve OKLCH. Don't restyle; relaxed lint rules apply only here.

## Commands

- `pnpm lint` (fix) / `pnpm lint:ci` — oxlint type-aware + oxfmt; this is the type gate (no tsc; editor uses tsgo)
- `pnpm test` — vitest, colocated `*.test.ts`
- `pnpm build` / `pnpm deploy` — vite build / wrangler
- After changing routes, the dev server or build regenerates `routeTree.gen.ts`

## Conventions

- Strict types: no `as` (except `as const`), no `any`, no non-null `!`, no lint-disable comments — fix the type or add a justified per-file override in `oxlint.config.ts`
- react-perf rules are errors: no inline object/function props — `useCallback`/`useMemo`, or hoist to module scope (see `-shared/meter-bar.tsx`, `-shared/entity-links.tsx` patterns)
- Heavy parsing belongs in `lib/data/parse.worker.ts`; main thread only builds rows/aggregates from already-parsed records
- Query keys embed file identity `path:size:mtime` (`fileEntryKey`) — same key ⇒ cached parse stays valid
- Pricing/model additions: one entry in `packages/schemas/src/cost.ts` PRICING_TABLE (longest-prefix match)
- Syntax highlighting: Shiki css-variables theme in `apps/web/src/lib/highlight.ts` — a new language is one `LANG_LOADERS` entry plus extension/alias mappings; every syntax/diff color is a `--code-token-*` / `--diff-*` var in `packages/ui/src/globals.css`, rendered via static classes (never inline styles or `dangerouslySetInnerHTML`)
- New transcript record types: extend the union in `packages/schemas/src/transcript.ts`; they already pass through `unknownRecordSchema` — only add a schema when the UI needs the fields
- `packages/schemas/src/real-data.validation.test.ts` runs against the machine's real `~/.claude` when present — keep it passing after parser changes
