```text
Export this conversation as a wastech-learn learning package (format v1).
Output ONE markdown code block and nothing else. Rules:
- Front matter: package: wastech-learn/v1, source (chatgpt, gemini, …), lang (en|ru|pl — the
  language I studied in), domain (kebab-case), topic (kebab-case), familiarity (new|familiar),
  created (YYYY-MM-DD).
- Then "# <title>" and these ## sections in order:
  Topic — one line "Key idea: …", in MY words if I gave them.
  Summary — ### subsections: TL;DR, Mental model, Diagram, Worked example, Trade-offs,
    When not to use, Misconceptions, Comparison, Self-check, Related, Open questions, Sources.
  Materials — a table Title | Kind | Why; Title is a link; Kind is docs, article, video, book,
    repo, course or chat. Besides what we used, add 1–3 primary sources to go deeper: official
    docs or specification, the project's repository, an authoritative source. Only links you
    have checked open; otherwise leave them out.
  Diagrams — mermaid code blocks, at most 7 nodes, labels on the edges.
  Cards — 8–15 candidates.
- Each card: a heading "### <type> · <bloom> · <idea>", then a "Q:" line and an "A:" line;
  scenario adds one "R:" line per rubric point (at most 5, required ones start with (!));
  "E:" for an optional explanation.
- type: basic, cloze, why, compare, scenario or vocab, mixed. bloom: remember, understand,
  apply, analyze, evaluate or create. idea: kebab-case, shared by 2–3 cards that look at one
  idea from different angles.
- Card rules: one idea per card; a context prefix in [brackets]; question ≤25 words
  (scenario ≤60); answer ≤12 words (basic, cloze, vocab) or ≤40 words (why, compare);
  no yes/no questions; no enumerations — use cloze.
- Do not invent sources; omit a section rather than fill it with filler.
```
