# Rules: documentation

> One of the main development rules for `wastech-learn`. Index - [.rules/README.md](README.md). Map of the docs - [docs/README.md](../docs/README.md).

## Languages

- **`docs/` and `README.md` are written in Russian.** File names, front matter keys, IDs, code identifiers and machine-checked table headers (`ID`, `Priority`, `Status`, `Principles`, `Journeys`) are English.
- **`AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `.rules/` and skills are English**: they are loaded into agent context (the last two by the `impeccable` design skill), and the `LLM-001` token estimate undercounts Cyrillic.
- Use the canonical terms from the [glossary](../docs/glossary.md); `CTX-003` flags the listed aliases.
- **Dashes are the ASCII hyphen-minus `-`** in docs, rules, code, comments, UI copy and commit messages, Russian and Polish included, ranges too (`3-5`): no em dash (U+2014), no en dash (U+2013). Agents copy the typography around them, so one stray dash brings more back. `npm run lint:dashes` (part of `lint:code`) checks every file except installed third-party skills and the frozen prototype, the hook in `.claude/settings.json` reports a dash in each file Claude Code writes, and `npm run fix` replaces them.

## IDs and traceability

- Prefixes: `G-xx` goals, `J-xx` journeys, `LP-xx` learning principles, `FR-xxx` / `NFR-xx` requirements, `ADR-xxxx`, `R-xx` risks, `Q-xx` open questions. **IDs are never reused**, even after a requirement is dropped (`Status: dropped`).
- Every `LP-xx` and every `J-xx` is carried into at least one FR (`GRP-003`); IDs are unique across the corpus (`TBL-006`).
- When code implements a requirement, move its `Status` (`proposed` → `accepted` → `done`) in the same commit.

## Decisions

- A decision that is costly to change gets an ADR from the [template](../docs/adr/0000-template.md): front matter `id`, `status`, `date`; sections Контекст / Решение / Альтернативы / Последствия.
- An accepted ADR is not rewritten. A new ADR supersedes it, and the old one gets `status: superseded`. A reopened decision goes back to `proposed` with the reason recorded (as ADR-0006 did).
- A closed open question links to the ADR or page that settled it.

## Size and shape

- One topic per page. Budgets are enforced by `SIZE-001` ([wastech-mdlint.config.json](../wastech-mdlint.config.json)): 120 lines / 12 KB warn, 180 lines / 18 KB error; ADRs 60 / 90 lines.
- A page over budget is **first compressed** (same meaning, fewer words), **then split** by meaning into sibling pages behind an index. Content is never cut to fit.
- Every page is reachable from `README.md` or `docs/README.md` (`GRP-002`); links, anchors and images resolve (`REF-*`); code fences name their language.
- Mermaid blocks must render. Hand-drawn diagrams are generated from source (`docs/assets/happy-path/generate.py`) and both are committed.

## Specs for planned work

- Planned work is specified under `docs/tasks/<slug>/` with the `spec-task` skill, in Russian, linking the FR it implements. The spec's plan and status are kept current while `implement` works through it.
- Shelved work is parked under `docs/backlog/` with the `park` skill: one card per task plus the `README.md` index, in Russian. A card references the spec, branch or patch instead of copying them; when the task ships or is dropped, the card's status says so.

## When docs must change

- **Behavior changed** → the `docs/` page describing it, in the same commit.
- **A pattern or rule changed** → the matching file in `.rules/`, in the same commit.
- **A decision changed** → an ADR first, then the code.
- `npm run lint:docs` is part of `npm run lint` and of CI.
