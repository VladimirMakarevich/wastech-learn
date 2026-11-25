# AGENTS.md

Guide for AI agents and contributors working in `wastech-learn`.

## What this repo is

`wastech-learn` is the framework half of a personal spaced-repetition learning system. The knowledge itself
(topics, cards, summaries, diagrams, review logs) lives in a separate private repo, `wastech-learn-content`.
See [README.md](README.md) and [docs/README.md](docs/README.md).

**Current phase: 0 (documentation only).** There is no code yet. The docs in `docs/` are the source of
truth for requirements and architecture. Do not scaffold code unless the user asks for it explicitly.

## Language

- Documentation in `docs/` and `README.md` is written in **Russian**.
- File names, front matter keys, IDs, code identifiers, and machine-checked table headers
  (`ID`, `Priority`, `Status`, `Principles`, `Journeys`) are **English**.
- This file stays in English to keep the always-loaded context small (the `LLM-001` estimate
  undercounts Cyrillic).
- Talk to the user in the language they use.

## ID scheme

| Prefix | Meaning | Defined in |
| --- | --- | --- |
| `G-xx` | Product goal | `docs/product/vision.md` |
| `J-xx` | User journey | `docs/product/journeys.md` |
| `LP-xx` | Learning principle | `docs/learning/principles.md` |
| `FR-xxx` | Functional requirement (1xx capture, 2xx review, 3xx content, 4xx insights, 5xx language) | `docs/requirements/fr-*.md` |
| `NFR-xx` | Non-functional requirement | `docs/requirements/nfr.md` |
| `ADR-xxxx` | Architecture decision | `docs/adr/` |
| `R-xx` / `Q-xx` | Risk / open question | `docs/risks-and-questions.md` |

IDs are never reused. Every `LP-xx` and `J-xx` must be referenced by at least one FR (`GRP-003`).
Use `docs/glossary.md` terms; do not introduce synonyms.

## Document size policy

Every page covers one topic. Budgets are enforced by `SIZE-001` in
[wastech-mdlint.config.json](wastech-mdlint.config.json): 120 lines / 12 KB warn, 180 lines / 18 KB error;
ADRs 60 / 90 lines. When a page outgrows its budget, first compress the wording without losing
meaning, then split it by meaning into sibling pages behind an index. Never cut content to fit.

## Checks

```bash
npm ci              # once; Node >=24.17 (.nvmrc), @wastech-mdlint/* 0.4.1 pinned in devDependencies
npm run lint:docs   # must report zero errors before a change is done
npm run docs:view   # optional: local viewer with rendered Mermaid and a link graph
```

Mermaid blocks must stay valid.

The `wastech-mdlint` MCP server (read-only: `lint`, `lint-files`, `context-graph`, `context-slice`,
`impact-analysis`, `compile-context`) is registered in [.mcp.json](.mcp.json) and runs the locally
installed version. Use `lint` to check a draft before writing it and `impact-analysis` before renaming or
splitting a doc.

## Architecture invariants (for future code)

- **Headless core**: `core`, `srs` and `content-fs` hold all logic; `cli`, `mcp-server`, `server` and `app`
  are thin hosts. See `docs/architecture/components.md`.
- Content Markdown never stores scheduling state. Review state is an append-only JSONL event log.
- Card `id` is stable and random, never a content hash.
- No API keys in MVP: AI features run inside subscription chats (Claude Code, ChatGPT).

## Do not

- Commit, push or `git init` without the user's consent.
- Put secrets or personal data into docs.
- Change an accepted ADR in place: supersede it with a new one.
