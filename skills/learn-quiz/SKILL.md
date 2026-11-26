---
name: learn-quiz
description: Run a spaced-repetition quiz in the chat over the wastech-learn content repository — due review items in batches of 5–10, the learner answers before seeing anything, the AI grades open answers by their rubric and suggests a rating, the learner confirms it, and the rating is appended to the review log through the wastech-learn MCP tools. Use when the user wants to review or drill — "quiz me", "let's review", "10 minutes of cards", "погоняй меня", "квиз 10 минут", "повторим", "przepytaj mnie", "powtórka". Also practice without moving the schedule ("drill this topic before the interview"). Not for capturing a new topic (learn-capture).
compatibility: Needs the wastech-learn MCP server (@wastech-learn/mcp-server) in the content repository.
---

# learn-quiz

Recall first, then the answer, then a rating the learner owns. The server never sends the answer with the question; keep it that way in the conversation too.

## Ground rules

- Speak the user's language; quote cards in their own language.
- Never show, hint at or paraphrase the answer before the learner has answered. Do not show a card's title either: it can give the answer away.
- The AI suggests a rating with one line of reasons; the learner's rating is the one recorded.
- Calm and brief: no praise, no guilt, no "only N left". Numbers, not adjectives ("≈ 6 min").
- Batches of 5–10 items, then ask whether to go on: the subscription pays for every turn.

## Steps

1. **Status.** `queue_status`, then one line: "Due 18 ≈ 5 min. Start?". Nothing due: say so in one line and offer practice of a topic instead. Paused new cards: mention it once, calmly.
2. **Batch.** `quiz_next` with `limit` 5 (at most 10), a `scope` (domain, topic or tag) when the user named one, `mode: practice` for drilling without moving the schedule.
3. **Ask.** Show the item's `question` Markdown as it is; a hidden cloze gap shows as `[…]`. Ask for the answer and the confidence: 1 guess, 2 unsure, 3 sure.
4. **Reveal** with `reveal` only after the answer.
   - Types graded by the learner (basic, cloze, reversed, vocab, grammar-cloze): show the answer and ask for the rating.
   - Open answers (scenario, design, explain, and any card with a rubric): grade in the format of [templates/grading.md](templates/grading.md) — each rubric point present, partial or missing with a quote from the answer, then the suggested rating.
   - Rating rules: a required `(!)` point missing → Again (1); all required points with mistakes or slowly → Hard (2); all required points → Good (3); everything, quickly and with extra precision → Easy (4).
   - After a miss, explain it in 1–3 sentences and name the summary section to reread.
5. **Record** with `record_review`: the rating the learner settled on, `aiSuggested` when you suggested one, `grader: ai:claude-code` when you graded and `self` when the learner did, the confidence, `mode` as in step 2, and a `requestId` unique to this answer, such as `quiz-<YYYYMMDD-HHMM>-<item>`. Reuse an id only to retry the same call after a lost reply.
6. **Follow up.**
   - `suspended: true` means the card lapsed too often and was set aside: say in one line that it waits to be rewritten, not repeated.
   - A wrong answer given with confidence 3 is worth a card that tells the two ideas apart: offer it, and write it only through learn-capture's picking step.
   - "That rating was wrong": `undo_last` with its own unique `requestId`, then record the corrected rating.
7. **Next batch or stop.** One line with how many were done; ask before the next batch. Stopping is fine at any point.

## Done when

- Every item asked in the batch is answered and recorded, or the learner stopped.
- Every recorded rating is one the learner confirmed.

## What not to do

- Do not reveal before the answer, and do not call `reveal` before the learner has answered.
- Do not record a rating the learner did not confirm, and do not record twice for one answer.
- Do not ask for more than 10 items in one batch.
- Do not edit cards during the quiz; note the wording problem and fix it later with `update_card` when the learner agrees.
- Do not use guilt or pressure ("you forgot again", "streak"): a miss is a normal step.
