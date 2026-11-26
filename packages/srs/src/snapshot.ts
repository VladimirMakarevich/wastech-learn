import type { ReplayState } from "./replay.js";

const iso = (value: number | null): string | null =>
  value === null ? null : new Date(value).toISOString();

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, nested]) => [key, sortKeys(nested)]),
    );
  }
  return value;
};

/**
 * The replayed state as canonical JSON: items ordered by review item, keys in alphabetical order, times
 * as ISO strings in UTC. Two replays of one log are compared byte for byte, and a future cache stores
 * exactly this text.
 */
export const snapshot = (state: ReplayState): string => {
  const items = [...state.items.values()]
    .sort((a, b) => (a.item < b.item ? -1 : a.item > b.item ? 1 : 0))
    .map((item) => ({
      ...item,
      dueAt: iso(item.dueAt),
      lastReviewAt: iso(item.lastReviewAt),
      introducedAt: iso(item.introducedAt),
    }));
  return JSON.stringify(
    sortKeys({ now: iso(state.now), sched: state.sched, items }),
  );
};
