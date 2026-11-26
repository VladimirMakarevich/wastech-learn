import {
  EVENT_VERSION,
  newUlid,
  type RandomSource,
  type ReviewEvent,
} from "@wastech-learn/core";
import type { Rating } from "@wastech-learn/srs";

/**
 * Who appends the events and under which scheduler. A host fixes it once per session, so an event from the
 * chat quiz and one from the app differ only in `writer` and `device`.
 */
export interface EventOrigin {
  readonly device: string;
  readonly writer: string;
  /** The zone of `learn.config.json`; the optimizer export needs the learner's local day of each answer. */
  readonly timezone: string;
  /** `<package>/<model>` of the scheduler the event was answered under. */
  readonly sched: string;
  /** The host's source: cryptographic in a host, seeded in a test, so ids are reproducible there. */
  readonly random: RandomSource;
}

/** What the learner settled on for one review item. */
export interface RatingInput {
  readonly item: string;
  /** `practice` drills without moving the schedule; `review` moves it. */
  readonly kind: "review" | "practice";
  readonly rating: Rating;
  readonly contentHash: string;
  readonly confidence?: 1 | 2 | 3 | undefined;
  readonly durMs?: number | undefined;
  /** What an AI grader proposed before the learner decided. */
  readonly aiSuggested?: Rating | undefined;
  /** `self` or `ai:<client>`. */
  readonly grader?: string | undefined;
}

const base = (
  origin: EventOrigin,
  now: Date,
  item: string,
): Pick<
  ReviewEvent,
  "v" | "id" | "ts" | "tz" | "device" | "writer" | "item" | "sched"
> => ({
  v: EVENT_VERSION,
  id: newUlid(now, origin.random),
  ts: now.toISOString(),
  tz: origin.timezone,
  device: origin.device,
  writer: origin.writer,
  item,
  sched: origin.sched,
});

/**
 * The event of one answer. A missing confidence or AI suggestion is written as `null`, so the log tells
 * "the learner skipped it" apart from a writer that never asked.
 */
export const ratingEvent = (
  origin: EventOrigin,
  now: Date,
  input: RatingInput,
): ReviewEvent => ({
  ...base(origin, now, input.item),
  kind: input.kind,
  rating: input.rating,
  aiSuggested: input.aiSuggested ?? null,
  grader: input.grader ?? "self",
  confidence: input.confidence ?? null,
  ...(input.durMs === undefined ? {} : { durMs: input.durMs }),
  contentHash: input.contentHash,
});

/** Takes a review item out of the queue until it is unsuspended; its schedule is kept. */
export const suspendEvent = (
  origin: EventOrigin,
  now: Date,
  item: string,
): ReviewEvent => ({ ...base(origin, now, item), kind: "suspend" });

export const unsuspendEvent = (
  origin: EventOrigin,
  now: Date,
  item: string,
): ReviewEvent => ({ ...base(origin, now, item), kind: "unsuspend" });

/** Forgets the item's memory, for a card rewritten so much that its history no longer applies. */
export const resetEvent = (
  origin: EventOrigin,
  now: Date,
  item: string,
): ReviewEvent => ({ ...base(origin, now, item), kind: "reset" });

/** One `undo` per target, in the targets' order: the log is append-only, so cancelling is a new line. */
export const undoEvents = (
  origin: EventOrigin,
  now: Date,
  targets: readonly Pick<ReviewEvent, "id" | "item">[],
): ReviewEvent[] =>
  targets.map((target) => ({
    ...base(origin, now, target.item),
    kind: "undo",
    target: target.id,
  }));

/**
 * A rating together with the `suspend` it triggered: both were written by one call at one moment, so they
 * are undone together, and undoing the rating alone would leave the item hidden.
 */
export const ratingGroup = <
  Event extends Pick<ReviewEvent, "kind" | "item" | "ts">,
>(
  events: readonly Event[],
  rating: Event,
): Event[] => [
  rating,
  ...events.filter(
    (event) =>
      event.kind === "suspend" &&
      event.item === rating.item &&
      event.ts === rating.ts,
  ),
];
