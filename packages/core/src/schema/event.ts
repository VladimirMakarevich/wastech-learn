import { z } from "zod";
import { CARD_ID_PATTERN, KEBAB_PATTERN, fieldPath } from "./common.js";

export const EVENT_KINDS = [
  "review",
  "practice",
  "reset",
  "suspend",
  "unsuspend",
  "undo",
  "manual_due",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** The newest event schema this reader understands; a newer line is reported, never guessed at. */
export const EVENT_VERSION = 1;

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const REVIEW_ITEM_PATTERN = new RegExp(
  `^${CARD_ID_PATTERN.source.slice(1, -1)}:[a-z0-9]+$`,
);
// Validating every event's zone through Intl would cost more than the replay itself on a large log; the
// zone only feeds the optimizer export, so its shape is enough here.
const TIME_ZONE_SHAPE = /^[A-Za-z][A-Za-z0-9_+\-/]*$/;

const ratingSchema = z.literal([1, 2, 3, 4]);

/**
 * One line of `reviews/<device>/<writer>-YYYY-MM.jsonl`, schema version 1. Unknown optional fields are
 * dropped rather than rejected: a newer writer may add them without bumping `v`, and an older reader must
 * keep replaying the log.
 */
export const reviewEventSchema = z
  .object({
    v: z.literal(EVENT_VERSION),
    id: z.string().regex(ULID_PATTERN, { error: "Expected a ULID" }),
    ts: z.iso.datetime({ error: "Expected an ISO-8601 UTC timestamp" }),
    tz: z
      .string()
      .regex(TIME_ZONE_SHAPE, { error: "Expected an IANA time zone" }),
    device: z.string().regex(KEBAB_PATTERN),
    writer: z.string().regex(KEBAB_PATTERN),
    kind: z.enum(EVENT_KINDS),
    item: z
      .string()
      .regex(REVIEW_ITEM_PATTERN, { error: "Expected <cardId>:<variant>" }),
    rating: ratingSchema.optional(),
    aiSuggested: ratingSchema.nullable().optional(),
    grader: z.string().optional(),
    confidence: z.literal([1, 2, 3]).nullable().optional(),
    durMs: z.int().nonnegative().optional(),
    contentHash: z.string().optional(),
    sched: z.string().min(1),
    target: z
      .string()
      .regex(ULID_PATTERN, { error: "Expected a ULID" })
      .optional(),
    due: z.iso
      .datetime({ error: "Expected an ISO-8601 UTC timestamp" })
      .optional(),
  })
  .superRefine((event, ctx) => {
    if (
      (event.kind === "review" || event.kind === "practice") &&
      event.rating === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["rating"],
        message: `A ${event.kind} needs a rating`,
      });
    }
    if (event.kind === "undo" && event.target === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: "An undo needs a target",
      });
    }
    if (event.kind === "manual_due" && event.due === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["due"],
        message: "A manual_due needs a due date",
      });
    }
  });

export type ReviewEvent = z.infer<typeof reviewEventSchema>;

export type ReviewEventParse =
  | { readonly ok: true; readonly event: ReviewEvent }
  | {
      readonly ok: false;
      readonly reason: "version-unsupported";
      readonly version: number;
    }
  | {
      readonly ok: false;
      readonly reason: "invalid";
      readonly field: string;
      readonly message: string;
    };

/**
 * Parses one decoded log line. A line from a newer schema version is told apart from a broken one, so a
 * reader can say "update the framework" instead of "the log is corrupt".
 */
export const parseReviewEvent = (raw: unknown): ReviewEventParse => {
  if (typeof raw === "object" && raw !== null && "v" in raw) {
    const version: unknown = raw.v;
    if (
      typeof version === "number" &&
      Number.isInteger(version) &&
      version > EVENT_VERSION
    ) {
      return { ok: false, reason: "version-unsupported", version };
    }
  }
  const parsed = reviewEventSchema.safeParse(raw);
  if (parsed.success) return { ok: true, event: parsed.data };
  const issue = parsed.error.issues[0];
  return {
    ok: false,
    reason: "invalid",
    field: issue === undefined ? "" : fieldPath(issue.path),
    message: issue?.message ?? "Invalid event",
  };
};
