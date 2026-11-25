# Rules: local refactoring

> One of the main development rules for `wastech-learn`. Index — [.rules/README.md](README.md).

## The principle

**Every feature and every bug fix leaves the code it touched better than it found it.** A local refactor is a normal part of the task, not extra work needing its own ticket, and it doesn't need to be requested — but it does need to stay **bounded**.

## Scope: only what you touch

The cleanup area is the **blast radius of the task** — the files you are editing anyway plus the seams they call directly. Code outside that radius stays as it is, however tempting. One task is one small step, not a sweep across the repository.

## What to clean up while you are already in the file

Ordered by value — do what applies, skip the rest:

- **Logic in a host → a core package.** Rules in a CLI command, MCP tool or server route move into `core`, `srs` or `content-fs`, where a second host can use them ([architecture.md](architecture.md)).
- **IO or a clock inside `core`/`srs` → an input.** A `Date.now()`, a random call or a file read in pure code becomes a parameter.
- **A hand-written type next to a Zod schema → the inferred type.** One shape, one schema.
- **An oversized file your change would grow** — extract the piece you touch instead of piling on.
- **The third copy gets extracted.** About to copy a helper a third time — lift it into the owning package and reuse it.
- **Restoring a mandatory rule is never optional cleanup:** a boundary violation, mutable module state, an unvalidated input, a hardcoded user-facing string, a comment with a link. If the task touches it, fix it as part of the task.
- **Free cleanups in files you are editing:** dead code, unused exports, commented-out blocks, WHAT comments, names that no longer say what the thing is.

## Hard boundaries

- **A refactor preserves behavior.** It changes structure, never observable behavior — including the replayed state, the content bundle and the files a tool writes. Anything that changes behavior belongs to the feature/fix.
- **The test gate:** no refactor starts until its scope is covered by tests that pass on the current code, and the tests stay unchanged through it. If an assertion has to change, it is a behavior change, not a refactor ([testing.md](testing.md)).
- **Data is not refactored.** Never rewrite `reviews/**/*.jsonl`, never change an event field's meaning without a version bump, never reassign a card `id`.
- **The cleanup must not outgrow the task.** If the refactor diff is bigger than the change it serves, stop — that is no longer local.
- **Repo-wide renames for aesthetics are not local** — they need the user's explicit go-ahead.
- **A pattern change comes with its documentation** — the matching `docs/` page and, if a rule changes, the file here, in the same change.

## When the debt is bigger than the task

Don't swallow it silently and don't quietly expand the change. Name it: what is wrong, what leaving it costs, what a bounded fix would take. Offer it as a **separate `refactor:` change** — its own commit, or a spec under `docs/tasks/` — and let the user decide when.

## How it lands

- A behavior-preserving refactor goes into a **separate `refactor:` commit ahead of** the `feat:`/`fix:` commit ([git-workflow.md](git-workflow.md)). Trivial in-file cleanups may ride along.
- The full DoD applies to a refactor commit too.
- The task summary states **either the cleanup you did or the debt you consciously left**. Saying nothing is not an option.
