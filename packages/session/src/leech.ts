import type { ItemState } from "@wastech-learn/srs";

/**
 * Whether a rating has just made its item a leech, so the same write suspends it: drilling a leech again
 * wastes the session, and the learner meets it in the fix list instead. Only the rating that crosses the
 * threshold counts; an item already past it, unsuspended after a rewrite, is not suspended again by its
 * next answer. `before` and `after` are the item's state without and with the rating.
 */
export const crossesLeechThreshold = (
  before: Pick<ItemState, "lapses"> | undefined,
  after: Pick<ItemState, "leech" | "suspended"> | undefined,
  leechThreshold: number,
): boolean =>
  after !== undefined &&
  after.leech &&
  !after.suspended &&
  (before?.lapses ?? 0) < leechThreshold;
