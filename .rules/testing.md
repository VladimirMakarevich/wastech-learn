# Rules: testing

> One of the main development rules for `wastech-learn`. Index — [.rules/README.md](README.md). Strategy behind it — NFR-04, NFR-05, NFR-14 in [nfr.md](../docs/requirements/nfr.md).

## Current state

**Vitest** with **fast-check** runs every `packages/*/test/**/*.test.ts` (`npm test`, also in CI). Packages import each other's TypeScript sources through the `@wastech-learn/source` export condition, so tests never need a build. The suite pins `TZ` to a zone with DST and a half-hour offset, so code that reads the machine's zone fails. Files named `benchmark.test.ts` form a project of their own that runs after the unit tests, one file at a time, so a timing budget measures the code and not a machine busy with the other test files.

| Package | What the tests cover |
| --- | --- |
| `core` | Schemas of the config, front matter and event v1; the parser and `contentHash`; one violating fixture per `check` rule; preset drift; catalog parity (keys, placeholders, CLDR forms); the bundle sanitizer; id and ULID generators with a seed; the learning package parser; serialization of cards, index, summary and materials; MiniSearch; the MCP input schemas |
| `srs` | Replay against direct ts-fsrs calls and the semantics of every event kind; log preparation (duplicates, order, undo); day boundaries across DST; the queue and backlog policy; property tests of the queue; a ~1000-event determinism test under shuffled lines, files and `TZ`; the backlog simulation; the NFR-05 benchmark |
| `session` | Events, the leech rule and the interval preview against direct ts-fsrs calls; every engine transition (modes, learning steps within the session, undo with the automatic suspend, bury, suspend, reset, external changes); property tests that the per-item incremental replay equals a full replay; the rubric suggestion; the summary; the session benchmark on 50k events |
| `content-fs` | Loading the golden copy in `fixtures/golden/` (3 topics, 30 cards); `check` and the reviewed bundle snapshot on it; reading and appending the log in a temp folder; the git baseline; `render` with a stub renderer, end to end only with `WASTECH_RENDER_E2E=1`; every golden content file read and written back byte for byte; the write transaction with a failing file system; path confinement; validation with an overlay; the `requestId` store |
| `cli` | Exit codes and messages of `check`, `build`, `render --check`, `simulate`, `new-id` and `hook post-tool-use` (event JSON on stdin), run in-process on a temp copy of the golden sample |
| `mcp-server` | A contract test per tool through an in-process client of the same MCP SDK, on a temp copy of the golden sample, with sockets and `fetch` disabled: validation, `dryRun`, idempotency by `requestId` across a restart, path confinement, reply size, `quiz_next` hiding the answer, due dates equal to a full replay; the export prompts in three languages |

Property tests run with a fixed fast-check seed: deterministic in CI, widened locally by changing the seed.

## Tiers and what each must cover

| Tier | Where | What it proves |
| --- | --- | --- |
| Unit | `core`, `srs` | Schemas, parser, `check` rules, queue and backlog policy as pure functions |
| Golden content | `fixtures/golden/` (copy of the golden sample) | The compiler, `check` and the mdlint preset on real topics: 3 topics, 30 cards, ru/en/pl |
| Replay determinism | `srs`, `session` | A fixed log of ~1000 events replays to a byte-identical state snapshot; the same under a shuffled input order |
| Property | `srs` (fast-check) | For any log: limits hold, siblings never share a day, learning steps come first, undo restores the previous state |
| Backlog simulation | `srs` | A synthetic 14-day break clears in 15-minute sessions within 5 days with new cards paused (MVP exit criterion) |
| Contract | `mcp-server`, `server` | Each tool or route on a temp copy of the golden sample: validation, idempotency by `requestId`, path confinement, `quiz_next` hides the answer |
| Unit (app) | `app/test` | Vitest over the app's pure modules, without TestBed: the logic of a screen lives in plain TypeScript |
| End to end | `app/e2e` | Playwright in Chromium with `@axe-core/playwright` on `wastech-learn serve` over a fresh golden copy with a seeded log; the browser clock pinned with `page.clock`; every scenario fails on a request outside 127.0.0.1 (`npm run test:e2e`, after `npm run build`) |

## Conventions

- **Tests are mandatory for new or changed logic** in `core`, `srs`, `content-fs` and in every host's tool or route. A change without them is not done; CI catches a failing test, not a missing one — that is the reviewer's job.
- **Deterministic always:** inject `now` and a seeded RNG, no real clock, no network, no dependence on the machine's time zone (set `tz` explicitly).
- Tests that write files work in a fresh temp directory and never touch the real content repository.
- Name tests by behavior (`"pauses new cards when the backlog exceeds twice the daily limit"`), one behavior per test.
- Snapshots only for stable, reviewed outputs (the content bundle of the golden sample); never for incidental HTML.
- A bug fix starts with a failing test that reproduces it.

## Refactoring under tests

The test gate from [refactoring.md](refactoring.md): the scope is covered first, the tests pass on the old code and stay unchanged through the refactor.

## DoD

- New or changed logic ships with tests at the right tier; `npm test` and `npm run lint` are green.
- Performance budgets from NFR-05 (a full replay < 5 s for 5k cards / 50k events, next card < 50 ms) get a benchmark test, in a `benchmark.test.ts`, once the code they measure exists.
