import { z } from "zod";
import { CARD_ID_PATTERN, kebabSchema, topicPathSchema } from "../common.js";
import { requestIdSchema } from "./common.js";

const reviewItemSchema = z
  .string()
  .regex(new RegExp(`^${CARD_ID_PATTERN.source.slice(1, -1)}:[a-z0-9]+$`), {
    error: "Expected <cardId>:<variant>",
  });

export const queueStatusInputSchema = z.strictObject({});

export const quizScopeSchema = z.strictObject({
  domain: kebabSchema.optional(),
  topic: topicPathSchema.optional(),
  tag: kebabSchema.optional(),
});

/**
 * `review` asks what is due and moves the schedule; `practice` drills any active card without touching
 * it, for cramming before an interview or right after capture.
 */
export const QUIZ_MODES = ["review", "practice"] as const;

export const quizNextInputSchema = z.strictObject({
  // A batch of ten keeps one chat turn short and leaves room to stop; the subscription limit pays for each.
  limit: z.int().min(1).max(10).default(5),
  scope: quizScopeSchema.optional(),
  mode: z.enum(QUIZ_MODES).default("review"),
});
export type QuizNextInput = z.infer<typeof quizNextInputSchema>;

export const revealInputSchema = z.strictObject({ item: reviewItemSchema });
export type RevealInput = z.infer<typeof revealInputSchema>;

const ratingSchema = z.literal([1, 2, 3, 4]);

export const recordReviewInputSchema = z.strictObject({
  item: reviewItemSchema,
  /** The learner's final rating: Again 1, Hard 2, Good 3, Easy 4. */
  rating: ratingSchema,
  /** What the AI proposed before the learner decided; kept to see how often the two disagree. */
  aiSuggested: ratingSchema.optional(),
  grader: z
    .string()
    .regex(/^(self|ai:[a-z0-9-]+)$/, {
      error: "Expected self or ai:<client>",
    })
    .default("self"),
  confidence: z.literal([1, 2, 3]).optional(),
  durMs: z.int().nonnegative().max(86_400_000).optional(),
  mode: z.enum(QUIZ_MODES).default("review"),
  requestId: requestIdSchema,
});
export type RecordReviewInput = z.infer<typeof recordReviewInputSchema>;

export const undoLastInputSchema = z.strictObject({
  requestId: requestIdSchema,
});
export type UndoLastInput = z.infer<typeof undoLastInputSchema>;
