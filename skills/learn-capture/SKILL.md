---
name: learn-capture
description: Capture a topic from this conversation into the wastech-learn content repository — pre-questions, a Socratic dialogue, a brain dump, card candidates the learner picks, summary, materials, a diagram, and a three-card mini quiz — written only through the wastech-learn MCP tools, which validate every file before writing it. Use when the user wants to learn or keep a topic — "let's study X", "capture this topic", "make cards from this", "разберём тему X", "сохрани тему", "сделай карточки", "omówmy temat X", "zrób fiszki". Not for a learning package waiting in inbox/ (learn-import) or a review session (learn-quiz).
compatibility: Needs the wastech-learn MCP server (@wastech-learn/mcp-server) and wastech-mdlint, installed as exact devDependencies of the content repository.
---

# learn-capture

Turn a conversation into a topic the learner owns: files that pass validation, cards they chose themselves, and a first recall before the chat ends. The AI proposes; the learner decides what stays, how it is worded, and every rating.

## Ground rules

- Speak the user's language. Write every artifact — key idea, cards, summary — in the topic's `lang`; terms of the craft stay in English.
- Never give an answer before the learner has tried. Hints go one step at a time and only after a new attempt: a leading question, a direction, a keyword or partial answer, a worked example, and only then the full answer.
- One idea at a time, in short segments. Ask the learner to predict ("what does this print?") before showing. Use contrast pairs (Saga vs 2PC) and examples from their stack and projects.
- Short replies: no preambles, no recaps of what was just said. Every message costs the subscription.
- Write content only through the MCP tools. Every write takes a `requestId` unique to that write, such as `<topic>-<YYYYMMDD-HHMM>-cards`; repeat an id only to retry the same call, which then returns the first result.

## Steps

1. **Place the topic.** Settle the domain (kebab-case; a language is `lang-<iso>`), the topic slug (kebab-case, English even for a ru or pl topic), `lang` and `familiarity` (`new` or `familiar`). Call `search` with the topic's words: if the topic exists, extend it instead of creating a second one.
2. **Pre-questions.** Before explaining anything, ask 3–5 short questions. Record each answer and its confidence (1 guess, 2 unsure, 3 sure). Do not correct them yet.
3. **Dialogue.** For `familiarity: new` start with a worked example; for `familiar`, start with a problem to solve. Follow the hint ladder above.
4. **Brain dump.** Ask the learner to state the key idea in one sentence and explain it as to a junior, without help. Point out gaps and misconceptions one at a time.
5. **Create the topic** with `create_topic`: the key idea in the learner's words, the pre-questions with answers and confidence, tags, related topics.
6. **Candidates.**
   - `search` each idea for duplicates.
   - Draft 8–15 candidates of mixed types, 2–3 per idea from different angles, by the card rules below.
   - Check them with `add_cards` and `dryRun: true`; fix limit findings yourself before showing anything.
   - Show them in the format of [templates/candidates.md](templates/candidates.md), a duplicate from `search` next to its candidate.
   - The learner keeps, edits or drops each one; what they want later gets `status: draft`. Write only the picked ones with `add_cards`.
7. **Summary, materials, diagram.**
   - `save_summary`: TL;DR and Mental model in the learner's own words from the brain dump; the rest from the dialogue; leave a section empty rather than pad it.
   - `save_materials`: only sources the conversation actually used or recommended.
   - `save_diagram`: Mermaid, at most 7 nodes, labels on the edges, alt text that says what the diagram shows. Put the returned `embed` with one or two lines of explanation into the summary's Diagram section with `save_summary`.
8. **Mini quiz.** `quiz_next` with `scope.topic` and `limit: 3`. For each item: ask, wait for the answer and the confidence, `reveal`, suggest a rating with one line of reasons, then `record_review` with the rating the learner settled on, `aiSuggested`, `grader: ai:claude-code` and the confidence. When the day's new-card limit is used up, `quiz_next` returns fewer items: say so in one line and run the rest with `mode: practice`, which does not schedule them.
9. **Close** with one line in the format of [templates/result.md](templates/result.md).

## Card rules

- One idea per card, a context prefix in brackets (`[.NET 8 GC]`), one unambiguous answer.
- No yes/no questions ("Is…", "Does…", "Can…", «Верно ли…», «Можно ли…»); no enumerations — turn a list into overlapping cloze cards.
- Limits: question ≤25 words (scenario ≤60); answer ≤12 words for basic, cloze and vocab; ≤40 words and ≤3 points for why and compare; a rubric of ≤5 points with at least one required point marked `(!)` for scenario and design; code ≤12 lines of ≤80 characters; one gap per cloze variant, ≤3 variants.
- Every card's sources link a section of the topic's summary, `../summary.md` plus the section anchor.
- A vocab card needs `langPair` and an example sentence in italics in its answer.
- A card is worth about ten minutes of future time. Fewer than five good candidates means adding none.

## Tool results

- `status: blocked` — nothing was written; fix what the findings name and call again.
- `status: dry-run` — the findings and the paths the write would create.
- An error comes as `{ code, message, hint }`: act on the hint. `REQUEST_ID_REUSED` means a changed call needs a new `requestId`.

## Done when

- The topic has its index, summary, materials and at least one diagram, and `validate` on the topic's files reports 0 errors.
- The learner picked 5–12 cards and they are written; the mini quiz is recorded.
- The one-line result is given.

## What not to do

- Do not write a card the learner did not pick, and do not offer "save all".
- Do not answer for the learner, in pre-questions, the dialogue or the quiz, before they tried.
- Do not record a rating the learner did not confirm.
- Do not invent sources or links, and do not paste chat text or long quotes from documentation into files.
- Do not write content files with Write or Edit while a tool exists for the change: tools validate before writing, a hook only checks after.
