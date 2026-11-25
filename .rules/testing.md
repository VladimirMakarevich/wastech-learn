# Rules: testing

> One of the main development rules for `wastech-learn`. Index — [.rules/README.md](README.md). Strategy behind it — NFR-04, NFR-05, NFR-14 in [nfr.md](../docs/requirements/nfr.md).

## Current state

No package and no test exists yet. **Vitest** (with **fast-check** for property tests) is installed together with the first package in M2, and `npm test` joins the DoD from that commit on. Until then the gate is `npm run lint`.

## Tiers and what each must cover

| Tier | Where | What it proves |
| --- | --- | --- |
| Unit | `core`, `srs` | Schemas, parser, `check` rules, queue and backlog policy as pure functions |
| Golden content | `fixtures/golden/` (copy of the golden sample) | The compiler, `check` and the mdlint preset on real topics: 3 topics, 30 cards, ru/en/pl |
| Replay determinism | `srs` | A fixed log of ~1000 events replays to a byte-identical state snapshot; the same under a shuffled input order |
| Property | `srs` (fast-check) | For any log: limits hold, siblings never share a day, learning steps come first, undo restores the previous state |
| Backlog simulation | `srs` | A synthetic 14-day break clears in 15-minute sessions within 5 days with new cards paused (MVP exit criterion) |
| Contract | `mcp-server`, `server` | Each tool or route on a temp copy of the golden sample: validation, idempotency by `requestId`, path confinement, `quiz_next` hides the answer |
| UI | `app` | Decided with the UI stack (Q-13); the prototype walkthrough is the baseline scenario |

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
- Performance budgets from NFR-05 (cache rebuild < 5 s for 5k cards / 50k events, next card < 50 ms) get a benchmark test once the code they measure exists.
