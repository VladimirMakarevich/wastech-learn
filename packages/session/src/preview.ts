import {
  replay,
  type Rating,
  type ReplayEvent,
  type Scheduler,
  type SrsConfig,
} from "@wastech-learn/srs";

/** Where one button would send the item, shown under the button before the learner presses it. */
export interface IntervalPreview {
  readonly rating: Rating;
  /** Epoch milliseconds the item would be due at. */
  readonly dueAt: number;
  /** From `now` to `dueAt`: minutes for a learning step, days or months for a review. */
  readonly intervalMs: number;
}

const RATINGS: readonly Rating[] = [1, 2, 3, 4];

// Sorts after every ULID of the same millisecond (Crockford base32 is digits and capitals), so the
// hypothetical answer is applied last, exactly where a real answer at `now` would land.
const PREVIEW_ID = "~preview";

/**
 * The due date each of the four ratings would give the item at `now`. The answer is replayed the way a
 * recorded one would be, fuzz included (it is seeded by the item and its repetition count), so the
 * interval under a button is the interval the learner gets. `events` may be the whole log; only the
 * item's own events count.
 */
export const previewIntervals = (
  events: readonly ReplayEvent[],
  item: string,
  scheduler: Scheduler,
  config: Pick<SrsConfig, "leechThreshold">,
  now: Date,
): readonly IntervalPreview[] => {
  const own = events.filter((event) => event.item === item);
  const ts = now.toISOString();
  return RATINGS.map((rating) => {
    const state = replay(
      [...own, { id: PREVIEW_ID, ts, kind: "review", item, rating }],
      scheduler,
      config,
      now,
    ).items.get(item);
    const dueAt = state?.dueAt ?? now.getTime();
    return { rating, dueAt, intervalMs: dueAt - now.getTime() };
  });
};
