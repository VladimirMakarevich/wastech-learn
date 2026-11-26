import { defineTool, idempotent, type Tool } from "./tool.js";

export const quizTools: readonly Tool[] = [
  defineTool(
    "queue_status",
    "What is due now: learning and review items, new cards allowed today, the backlog, the estimated minutes, and domains whose new cards are paused.",
    (_input, ctx) => ctx.study.queueStatus(),
  ),
  defineTool(
    "quiz_next",
    "The next review items to ask (at most 10), optionally scoped to a domain, topic or tag; mode practice drills without moving the schedule. Returns the question only: call reveal after the learner has answered.",
    async (input, ctx) => ({ items: await ctx.study.next(input) }),
  ),
  defineTool(
    "reveal",
    "The expected answer, rubric, explanation and contentHash of a review item, for grading after the learner's attempt.",
    (input, ctx) => ctx.study.reveal(input),
  ),
  defineTool(
    "record_review",
    "Record the rating the learner settled on (1 Again, 2 Hard, 3 Good, 4 Easy) with what the AI suggested, the grader and the learner's confidence. Returns when the item is due next. A leech is suspended automatically. Needs a requestId; a retry records nothing twice.",
    (input, ctx) =>
      idempotent(ctx, "record_review", input, async () => ({
        payload: await ctx.study.record(input),
        written: true,
      })),
  ),
  defineTool(
    "undo_last",
    "Undo the last rating recorded through record_review on this device (and the suspend it caused) by appending undo events. Needs a requestId.",
    (input, ctx) =>
      idempotent(ctx, "undo_last", input, async () => ({
        payload: await ctx.study.undoLast(),
        written: true,
      })),
  ),
];
