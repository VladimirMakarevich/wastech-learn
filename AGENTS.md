# AGENTS.md

Guide for AI agents and contributors working in `wastech-learn`.

## What this repo is

`wastech-learn` is the framework half of a personal spaced-repetition learning system (chat → cards, summaries, visuals → FSRS review). The knowledge itself lives in the separate private repo `wastech-learn-content`. See [README.md](README.md) and [docs/README.md](docs/README.md).

**Phase:** documentation (phase 0), M1 (content repo with a golden sample) and M2 (the headless packages `core`, `srs`, `content-fs` and the CLI `check`, `build`, `render`, `simulate`) are done; M3 — capture through MCP and skills — is next. Do not scaffold a new package unless the user asks. The UI stack is decided: desktop-first Angular + CDK in the Evening Glass look, Capacitor in phase 2 (ADR-0006).

**UI design work** starts from [PRODUCT.md](PRODUCT.md): users, purpose, constraints and principles condensed from `docs/` for the `impeccable` skill. The visual world lives in [DESIGN.md](DESIGN.md) (iOS-inspired, frosted glass, dark-first); the prototype's Review screen is built in it, the other screens only inherit its tokens.

## Rules — read before working

The [rules index](.rules/README.md) is the canonical "how to work here". The non-negotiables in short:

1. **Headless core.** All logic in `core`, `srs`, `content-fs`; hosts (`cli`, `mcp-server`, `server`, `app`) stay thin. `core` and `srs` are pure, independent of each other, free of Node APIs — [architecture](.rules/architecture.md).
2. **Data invariants.** Markdown never stores scheduling state; the review log is append-only JSONL per device and writer; card `id` is random and stable, never a hash; replay is deterministic — [architecture](.rules/architecture.md).
3. **Validate at the edge.** Zod schemas from `core` parse every input once; no `any`, no enums, no default exports; **comments explain why, never what**, with no links — [coding-style](.rules/coding-style.md).
4. **No keys, no model calls, no telemetry.** AI runs in subscription chats via skills and MCP — [security](.rules/security.md).
5. **Tests ship with logic**, deterministic, with golden content and replay checks — [testing](.rules/testing.md).
6. **Git:** Conventional Commits in English, scoped staging, never `git add -A`, **no agent attribution** (no `Co-Authored-By`, no "Generated with"), commit or push only when asked — [git-workflow](.rules/git-workflow.md).
7. **Docs move with the code:** Russian docs, English rules; FR status and ADRs updated in the same change — [documentation](.rules/documentation.md).
8. **User-facing text** in ru/en/pl, calm and guilt-free — [values-and-philosophy](.rules/values-and-philosophy.md), [tone-of-voice](.rules/tone-of-voice.md).

## Skills

`implement` (runs `assess-refactor` first), `spec-task`, `interview`, `interview-to-spec`, `handoff`, `park` (backlog cards in `docs/backlog/`) — installed from `wastech-skills`, pinned in `skills-lock.json`. `implement` and `assess-refactor` are edited for this repo; re-apply the edits after `npx skills update`.

## Commands

```bash
npm ci               # Node >=24.17 (.nvmrc); every tool is an exact devDependency
npm run lint         # lint:code (ESLint, Stylelint, Prettier check, tsc -b) + lint:docs (wastech-mdlint)
npm test             # Vitest over packages/*/test, with fast-check property tests
npm run build        # tsc -b; the CLI runs from dist/: npx wastech-learn check --content <dir>
npm run fix          # every autofix: ESLint, Stylelint, Prettier
npm run docs:view    # local viewer for the docs with rendered Mermaid
npm run proto:data   # rebuild the prototype's data.js from ../wastech-learn-content
```

`npm run lint` and `npm test` must be green before a change is done; CI runs it on every push to `main` and every pull request. The `wastech-mdlint` MCP server is registered in [.mcp.json](.mcp.json): use `lint` on a draft before writing it and `impact-analysis` before renaming or splitting a doc.

## Language

Docs in `docs/` and `README.md` are **Russian**; this file, `PRODUCT.md`, `DESIGN.md`, `.rules/` and skills are **English** (the `LLM-001` estimate undercounts Cyrillic). Identifiers, file names and front matter keys are English. Talk to the user in the language they use.
