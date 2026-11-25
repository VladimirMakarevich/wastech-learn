---
name: implement
description: Implement a task in wastech-learn end to end.
---

# implement

**Before writing any code, check the area the task touches for refactoring:** run the [assess-refactor](../assess-refactor/SKILL.md) skill and act on its verdict. If it calls for a refactor first, do that bounded, behavior-preserving refactor, then build the task on top of it — both belong to one finished task, but the refactor lands as its own `refactor:` commit ahead of the `feat:`/`fix:` commit ([refactoring](../../../.rules/refactoring.md)).

Implement the task. If it has a spec under `docs/tasks/<slug>/`, work from its `plan/` and keep the spec's status and phase table current. Name the requirement it implements (`FR-xxx` / `NFR-xx` in [docs/requirements](../../../docs/requirements/README.md)) and move its `Status` when the work lands.

Strictly follow the project rules: start from [AGENTS.md](../../../AGENTS.md) and the [rules index](../../../.rules/README.md), then the `docs/` page for the area ([architecture](../../../docs/architecture/overview.md), [content model](../../../docs/content/repo-layout.md), [scheduling](../../../docs/scheduling/srs.md), [AI integration](../../../docs/ai/capture.md)) and the ADRs it rests on. In particular, observe the following rules:

- [architecture](../../../.rules/architecture.md)
- [coding-style](../../../.rules/coding-style.md)
- [refactoring](../../../.rules/refactoring.md)
- [git-workflow](../../../.rules/git-workflow.md)
- [security](../../../.rules/security.md)
- [testing](../../../.rules/testing.md)

When the task writes or changes text a user reads — UI strings in ru/en/pl, the AI tutor's prompts, CLI or MCP messages — these rules apply as well:

- [values-and-philosophy](../../../.rules/values-and-philosophy.md)
- [tone-of-voice](../../../.rules/tone-of-voice.md)

When it changes behavior, a decision or a pattern, update the docs in the same change — [documentation](../../../.rules/documentation.md). Learning content itself (cards, summaries) follows [card-writing-rules](../../../docs/learning/card-writing-rules.md).

Before calling it done, meet the "Before committing (DoD)" section of [git-workflow](../../../.rules/git-workflow.md): `npm run lint` (and `npm test` once a package exists) is green, new or changed logic has tests, the touched docs and FR statuses are updated, and the cleanup done or the debt left is named. Stage specific paths only, commit without any agent attribution, and do not commit or push unless the user asks.

**Once you’ve finished the implementation, invoke the `/code-review` skill using subagents.**
