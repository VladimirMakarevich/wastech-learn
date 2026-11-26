import type { ReplayEvent } from "./ports.js";

const sortKey = (event: ReplayEvent): string =>
  JSON.stringify([
    event.kind,
    event.item,
    event.rating ?? null,
    event.target ?? null,
    event.due ?? null,
  ]);

/**
 * Total order of the log. Two devices can write events in the same millisecond, and git can hand the
 * files over in any order, so ties break on the event id and then on the event's content: replay must
 * not depend on the order in which lines were read.
 */
export const compareEvents = (a: ReplayEvent, b: ReplayEvent): number =>
  Date.parse(a.ts) - Date.parse(b.ts) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) ||
  (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0);

/**
 * Turns the raw log into the events that shape the schedule: duplicates (the same event synced from two
 * places) collapse to one by id, events are put in total order, and every undone event goes together with
 * its undo. Undos are resolved newest first, so undoing an undo brings the original event back.
 */
export const prepareEvents = <Event extends ReplayEvent>(
  events: readonly Event[],
): Event[] => {
  const sorted = [...events].sort(compareEvents);
  const seen = new Set<string>();
  const unique = sorted.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
  const undone = new Set<string>();
  for (let index = unique.length - 1; index >= 0; index--) {
    const event = unique[index];
    if (
      event?.kind === "undo" &&
      !undone.has(event.id) &&
      event.target !== undefined
    ) {
      undone.add(event.target);
    }
  }
  return unique.filter(
    (event) => event.kind !== "undo" && !undone.has(event.id),
  );
};
