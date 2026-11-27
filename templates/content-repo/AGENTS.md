# AGENTS.md

Private knowledge repo for `wastech-learn`. The format is specified in the framework docs:
https://github.com/VladimirMakarevich/wastech-learn/tree/main/docs (content/, learning/, quality/).

## Rules

- One card = one file `content/<domain>/<topic>/cards/<id>.md`. The `id` is 8 random Crockford base32
  characters (lowercase, no `i l o u`), never a content hash, never reused. Link every card from the
  topic's `index.md` `## Cards` list.
- Card sections in order: `Question`, `Answer`, then optional `Rubric`, `Explanation`, `Sources`.
  Section headings are fixed English keys in every language; the content is in the topic's `lang`.
- Propose cards as candidates; the user selects and edits them. Never add cards without approval.
- Fixing a typo keeps the `id`. A change of meaning means a new card and `status: retired` on the old one.
- Never edit or delete lines in `reviews/**/*.jsonl`. They are append-only; undo is a new event.
- Diagrams: edit `diagrams/*.mmd`, then run `npm run render:diagrams`. Do not hand-edit the SVG.
- Card size limits and writing rules: `docs/learning/card-writing-rules.md` in the framework repo.

## Checks

```bash
npm run lint                          # must report zero errors before a commit
npx wastech-learn check --content .   # card limits, cloze, ids; CI runs both
```

The `wastech-mdlint` MCP server is registered in [.mcp.json](.mcp.json). Use its `lint` tool on a draft
card before writing the file.

## Capture and quiz

- The `wastech-learn` MCP server in [.mcp.json](.mcp.json) (Claude Code) and
  [.codex/config.toml](.codex/config.toml) (Codex, once the folder is trusted) writes topics, cards, summaries, materials and
  diagrams after validating them, and runs the quiz. Prefer its tools to editing content files by hand.
- Skills: `learn-capture` (study a topic in this chat), `learn-import` (a learning package in `inbox/`),
  `learn-quiz` (review due cards). They live in `.claude/skills/` and, for Codex, `.agents/skills/`, pinned in
  `skills-lock.json`. Pass `origin` and the `ai:<origin>` grader of the client you run in.
- A `PostToolUse` hook in `.claude/settings.json` checks every Write or Edit under `content/` and hands
  errors back to the agent. Codex has no such hook: after editing a file by hand there, run
  `npm run lint` and `npx wastech-learn check --content .`.
- Until the framework is published, `@wastech-learn/*` link to the sibling checkout `../wastech-learn`:
  run `npm run build` there and restart the session after changing the framework.
  `npx wastech-learn doctor` checks the whole setup and names the fix for each problem.

## Do not

- Commit or push without the user's consent.
- Copy chat transcripts into the repo; summarize in the user's words instead.
