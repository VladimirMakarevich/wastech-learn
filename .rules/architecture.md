# Rules: architecture

> One of the main development rules for `wastech-learn`. Index — [.rules/README.md](README.md). Decisions behind these rules — [docs/adr/](../docs/adr/README.md); the full picture — [docs/architecture/](../docs/architecture/overview.md).

## Stack

- TypeScript monorepo on npm workspaces: `packages/<name>`, published as `@wastech-learn/<name>`. ESM only, Node ≥ 24.17.
- Markdown pipeline: unified/remark (the same parser wastech-mdlint uses), rehype, Shiki, KaTeX, `rehype-sanitize`. Validation: Zod. Scheduler: `ts-fsrs` pinned to an exact version. Cache: `node:sqlite`. Local server: Hono. MCP: `@modelcontextprotocol/sdk` over stdio.
- UI: **pending** (ADR-0006 `proposed`, Q-13). Whatever wins must consume the content bundle and `ReviewStore` only.

## Packages and dependencies

| Package | Owns | May import |
| --- | --- | --- |
| `core` | Schemas, Markdown parser, content-bundle compiler, `check` rules | Third-party libraries only |
| `srs` | ts-fsrs adapter, replay, queue, backlog policy, metrics | Third-party libraries only |
| `content-fs` | Repository IO, JSONL appends, cache, file watching, diagram rendering | `core`, `srs`, Node APIs |
| `cli`, `mcp-server`, `server` | Thin hosts: argument parsing, transport, exit codes | `core`, `srs`, `content-fs` |
| `app` | UI | `core` (bundle types), `srs` (queue in the client) |

- `core` and `srs` **do not depend on each other**, never import Node APIs and never touch the file system or the network: they run in the browser too.
- **Hosts are thin.** Logic that a second host could need goes into `core`, `srs` or `content-fs`, never into a host.
- The boundaries are enforced by `no-restricted-imports` in [eslint.config.js](../eslint.config.js). Do not loosen a boundary in the config to make an import compile; move the code instead.

## Data invariants (non-negotiable)

1. **Content Markdown never stores scheduling state.** State is derived from the append-only event log `reviews/<device>/<writer>-YYYY-MM.jsonl` (ADR-0003, [review-log](../docs/content/review-log.md)).
2. **The log is append-only.** Never rewrite or delete a line; an undo is a new `undo` event. Duplicates are dropped by event `id`. Every writer appends only to its own file.
3. **Card identity:** `id` is 8 random Crockford base32 characters in the front matter, never a content hash, never reused. The scheduled unit is the review item `<id>:<variant>` (ADR-0002).
4. **Determinism:** the same log and the same scheduler version replay to a byte-identical state. Time and randomness are inputs (`now`, a seeded RNG), never read inside `core` or `srs`. Every event records `sched` (scheduler + model version).
5. **Event schema changes** add optional fields freely; renaming a field or changing its meaning bumps `v`, and readers keep understanding every older version.
6. **Every write to content passes validation first:** wastech-mdlint and `check` (ADR-0012). A tool that writes an invalid file is a bug.

## Boundaries of the hosts

- **The UI reaches state only through `ReviewStore`** and content only through the content bundle ([components](../docs/architecture/components.md)). It never imports `content-fs` or reads files.
- **The local server binds `127.0.0.1` only** and validates every incoming event with the `core` schema.
- **MCP tools:** mutating tools are idempotent by `requestId` and support `dryRun`; paths are confined to `--content`; `quiz_next` never returns the answer (`reveal` does) — [mcp-tools](../docs/ai/mcp-tools.md).
- **No model calls from code.** The app, server and CLI never call an LLM API (NFR-02); AI work happens in subscription chats through skills and MCP (ADR-0008). A future API grader is a pluggable `Grader` behind an explicit opt-in.

## Changing the architecture

A change to a package boundary, a data invariant or a host contract needs a new ADR (or supersedes one) **before** the code. Update [components.md](../docs/architecture/components.md) and the boundaries in `eslint.config.js` in the same change.
