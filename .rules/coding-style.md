# Rules: coding style

> One of the main development rules for `wastech-learn`. Index - [.rules/README.md](README.md).

Formatting is Prettier's job and correctness is ESLint's ([eslint.config.js](../eslint.config.js), strict type-checked rules). Do not hand-format against them and do not silence a rule without a reason in the disable comment. `npm run fix` applies every autofix; `npm run lint:code` must be green.

## TypeScript (non-negotiable)

- Strict compiler settings from [tsconfig.base.json](../tsconfig.base.json) stay on: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. A package never weakens them.
- **No `any`.** Untrusted input is `unknown` until a Zod schema parses it. No non-null assertions outside tests.
- **No enums, no default exports** (tool configs excepted): use `as const` objects or unions of literals, and named exports.
- `import type` for types. One concept per file, kebab-case file names, a file past ~300 lines is two concepts.
- Data is `readonly` by default; functions return new values instead of mutating their arguments.

## Boundaries and validation

- **Validate at the edge, trust inside.** Front matter, `learn.config.json`, review events, learning packages, HTTP bodies and MCP inputs are parsed with the Zod schemas in `core` exactly once, where they enter. Inside, rely on the types.
- One schema per shape, owned by `core`. Never a second, hand-written type for the same thing.

## Pure core, deterministic results

- `core` and `srs` are pure functions over data: no clock, no randomness, no IO. Pass `now` and a seeded RNG in.
- No module-level mutable state. Caches live in `content-fs` and can always be rebuilt from the files.
- Sorting is total and stable: ties break on `id`, so replay never depends on input order.

## Errors

- Throw typed errors with a stable `code` (one error type per package, e.g. `LearnError`). Never throw strings or bare `Error` across a package boundary.
- Hosts map codes to their surface: CLI exit codes `0` clean, `1` findings, `2` operational error (as in wastech-mdlint); MCP errors as `{ code, message, hint }`. The one exception is `wastech-learn hook post-tool-use`, which speaks Claude Code's hook protocol: `2` hands the findings back to the agent, `1` means the hook could not check (shown to the person, the agent goes on).
- Never swallow an error. An empty `catch` needs a comment saying why the failure is expected.
- Async: `async`/`await` only, no floating promises (ESLint enforces it), `AbortSignal` for anything long-running.

## Naming

- Use the domain terms from the [glossary](../docs/glossary.md) in English: card, variant, review item, topic, domain, idea, summary, materials, event, writer, replay, leech, backlog. Do not invent synonyms for them.
- Booleans read as predicates (`isNew`, `hasRubric`); functions are verbs; units go into names (`durMs`, `maxIntervalDays`).

## User-facing text and i18n

- Every string a user reads goes through an i18n key present in **all** of `ru`, `en` and `pl`, with CLDR plural forms. No concatenated sentences, no strings built from fragments.
- Content (cards, summaries) stays in the topic's language and is never translated by code.
- Wording follows [tone-of-voice.md](tone-of-voice.md).

## Comments: WHY, not WHAT (mandatory)

**Every comment explains why the code exists and what it is for - the reason, the intent, the constraint - never what it does.** What the code does is visible from the code; a comment that retells it adds noise and goes stale the first time the code changes. Clear names are part of this rule: a good name replaces a caption comment.

```ts
// Bad: retells the code.
// Sort events by timestamp, then by id.
events.sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));

// Good: says why it has to be this way.
// Two devices can log events in the same millisecond; breaking ties on the event id keeps replay
// byte-identical whatever order the log files were read in.
events.sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));
```

```ts
// Bad: "Clamp the duration to 120 seconds."
// Good: a card left open overnight would teach the optimizer that recall takes hours; past two minutes
// the time says nothing about memory.
const durMs = Math.min(raw, 120_000);
```

- **Comment the non-obvious:** the reason for a choice, an invariant the code protects, a trade-off, a limit of a library or platform, the essence of a workaround, where a number comes from. **Don't comment the obvious** (`// increment i`, `// return the result`).
- **JSDoc/TSDoc on exported functions and types** states the contract and the intent - what it guarantees, what it expects, why it is shaped this way - not a line-by-line retelling of the implementation.
- **Comments are self-contained.** No links, URLs, ticket or PR numbers, and no paths or anchors into `docs/`, `.rules/`, `AGENTS.md` or any other file - in comments, JSDoc, string literals and log messages. Documentation tags that point elsewhere (`@see`, `@link`, `{@link …}`) are banned for the same reason. Docs move and get renamed while code lives on; if knowledge matters, state its substance in words where it applies. Links belong in commit messages and PR descriptions.
- **Not banned:** functional URLs that are behavior (an endpoint the code calls), and the Markdown in `docs/` and `.rules/`, which cross-references itself and is checked by wastech-mdlint.
- **No historical narrative** ("used to be X, now Y", "kept for compatibility") - git history keeps that. Commented-out code and tombstone comments are deleted together with the code they replaced.
- **A `TODO` needs a reason and a condition** (`// TODO: drop once ts-fsrs exposes same-day steps - the replay test pins the current workaround`); a bare `TODO` is placeholder code and fails the DoD.
- Reviewers treat a WHAT comment as a defect: replace it with a better name, or rewrite it as the WHY.

## Logs

- Logs are structured and never contain card, summary or answer text - identifiers and counts only (NFR-16).

## Dependencies

- Exact versions only (`--save-exact`), committed lockfile, `npm ci` in CI.
- Prefer the platform (`node:sqlite`, `fetch`, `node:fs` globbing) and libraries already in the tree (unified, Zod, Shiki). A new dependency needs a reason a reviewer can check: what it replaces, its license, its maintenance.
