# Rules: security and privacy

> One of the main development rules for `wastech-learn`. Index — [.rules/README.md](README.md). Requirements behind it — NFR-02, NFR-03, NFR-17 in [nfr.md](../docs/requirements/nfr.md).

## No keys, no model calls

- The MVP holds **no API keys** and calls **no model API** (ADR-0008, NFR-02). AI work happens inside subscription chats through skills and MCP.
- A future API grader keeps its key server-side only (a Worker secret), behind an explicit opt-in. A key never reaches the client, the content bundle, the repository or a log.

## Privacy

- The user's knowledge is private: the content repository is private, and nothing from it is copied here except the golden sample ([git-workflow.md](git-workflow.md)).
- **No telemetry, no analytics, no third-party requests** from the app, server, CLI or MCP server. No CDN-hosted fonts or scripts in the product UI. The only network traffic is what the user starts (git, the chat client).
- Logs never contain card, summary or answer text — identifiers and counts only.

## The local server

- Binds **`127.0.0.1` only**, no wildcard CORS, no authentication needed because nothing leaves the machine.
- Validates every incoming event with the `core` schema, caps body size, and appends only to its own writer file.

## The MCP server

- Paths are resolved inside `--content` and rejected when they escape it (absolute paths, `..`, symlinks out).
- Tools never execute user-provided code, never fetch URLs, never run shell commands built from input.
- Mutating tools validate before writing and are idempotent by `requestId`; `quiz_next` never returns the answer.
- **No remote mode.** Everything runs on the owner's computer: the MCP server speaks stdio only and `serve` binds to `127.0.0.1`. Cloud and mobile are out of scope (ADR-0016); bringing them back needs a new ADR and a security review.

## Rendering content

- HTML is produced only by the `core` compiler from the content repository and passes **`rehype-sanitize`** with an allowlist (SVG, KaTeX, Shiki classes). The UI renders the bundle's HTML and nothing else.
- No `eval`, `new Function` or string-built `<script>`. User input is rendered as text, never as HTML.
- External links open with `rel="noopener"`.

## Supply chain

- Exact dependency versions, committed lockfile, `npm ci` in CI, `engine-strict=true`.
- A new dependency is reviewed for license (MIT-compatible), maintenance and what it pulls in. Fewer dependencies is a security property.
- GitHub Actions run with `permissions: contents: read` unless a job needs more, and say why.

## DoD

- No secret, token or personal path in the diff; no new network call from product code; every new input validated at its edge.
