# Development rules for `wastech-learn`

These are the **main rules** for working in this repository — the framework half of a personal spaced-repetition learning system (chat → cards, summaries, visuals → FSRS review). Read them before starting work; for the details they point into [`docs/`](../docs/README.md), which is written in Russian.

## Code rules (HOW)

| Rule | About |
| --- | --- |
| [architecture.md](architecture.md) | Headless core, packages and their dependency rules, the data invariants (cards, review log, determinism), AI only in chats |
| [coding-style.md](coding-style.md) | Strict TypeScript, validation at boundaries, pure and deterministic core, errors, i18n, comments, dependencies |
| [refactoring.md](refactoring.md) | Local refactoring inside the blast radius, behavior preservation, test gate, a separate `refactor:` commit |
| [git-workflow.md](git-workflow.md) | Conventional Commits, branches, scoped staging, no agent attribution, two repositories, generated files, DoD |
| [security.md](security.md) | No API keys, private content, local-only server, MCP confinement, sanitized HTML, supply chain |
| [testing.md](testing.md) | Vitest tiers, golden content, replay determinism, property tests, MCP contract tests |

## Product and text rules (WHAT and HOW IT SOUNDS)

| Rule | About |
| --- | --- |
| [values-and-philosophy.md](values-and-philosophy.md) | What the product believes in: recall before reading, the human decides, no guilt, private and local-first |
| [tone-of-voice.md](tone-of-voice.md) | UI copy in ru/en/pl, the AI tutor's voice, CLI and MCP messages |
| [documentation.md](documentation.md) | Docs in Russian, ID scheme and traceability, ADR process, size budgets, specs under `docs/tasks/` |

## Source priority

- **`docs/`** holds the requirements and decisions: goals, journeys, learning principles (LP-xx), FR/NFR, ADRs. It says **what** and **why**.
- **`.rules/`** and [`AGENTS.md`](../AGENTS.md) turn those decisions into day-to-day constraints. They say **how**.
- **Specs** for planned work live under `docs/tasks/<slug>/` (the `spec-task` skill writes them).
- **On a conflict**, an accepted ADR wins and the rule is fixed in the same change. For anything no ADR covers, `.rules/` wins and the stale `docs/` page is fixed in the same change.

## Key project facts

- **Phase:** documentation (phase 0) is done; milestone M1 (content repository with a golden sample) is done; M2 — the `core` and `srs` packages — is next ([roadmap](../docs/roadmap.md)). No package exists yet.
- **Two repositories:** this public framework repo (MIT) and the private `wastech-learn-content` (topics, cards, review logs) next to it. Personal content never lands here.
- **Runtime:** Node ≥ 24.17 (`.nvmrc`), npm workspaces under `packages/*`, ESM only, TypeScript 6.0 pinned (typescript-eslint does not support 7 yet).
- **UI stack:** desktop-first Angular + CDK, the Evening Glass look from [DESIGN.md](../DESIGN.md), Capacitor in phase 2 ([ADR-0006](../docs/adr/0006-headless-core-angular-ui.md)). The app is scaffolded in M4, not before; the [prototype](../prototypes/desktop-ui/README.md) is the reference for layout and flows.
- **Commands:** `npm run lint` = `lint:code` (ESLint, Stylelint, Prettier check, `tsc -b`) + `lint:docs` (wastech-mdlint). `npm run fix` runs every autofixer (ESLint, Stylelint, Prettier, wastech-mdlint) even when one leaves findings. CI runs both halves on every push to `main` and every pull request.
- **Every script in `package.json` works.** A dead script or an unused dependency reads as an approved pattern; delete it instead of leaving it.

## Installed skills

`implement`, `assess-refactor`, `spec-task`, `interview`, `interview-to-spec`, `handoff` and `park` come from `VladimirMakarevich/wastech-skills` (pinned in `skills-lock.json`). `park` keeps its backlog in `docs/backlog/`; its WIP commits follow the exception in [git-workflow.md](git-workflow.md). **`implement` and `assess-refactor` are edited for this repository** — `npx skills update` overwrites them, so re-apply the edits after an update.
