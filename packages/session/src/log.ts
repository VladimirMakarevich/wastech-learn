import type { ReviewEvent } from "@wastech-learn/core";
import {
  prepareEvents,
  replay,
  type HistorySegment,
  type ItemState,
  type ReplayState,
  type Scheduler,
  type SrsConfig,
} from "@wastech-learn/srs";

/** Who replays the log: the scheduler built from `learn.config.json` and the config itself. */
export interface ReplayContext {
  readonly scheduler: Scheduler;
  readonly config: SrsConfig;
}

/**
 * The review log in memory with its replayed state. Review items never influence each other in replay, so
 * an appended event changes only its own item: `withEvents` replays that item's events alone instead of
 * the whole log, which keeps a rating in the app to a fraction of a millisecond on a log of 50k events.
 */
export interface LogState {
  readonly events: readonly ReviewEvent[];
  readonly byItem: ReadonlyMap<string, readonly ReviewEvent[]>;
  readonly ids: ReadonlySet<string>;
  readonly state: ReplayState;
}

const indexByItem = (
  events: readonly ReviewEvent[],
): Map<string, ReviewEvent[]> => {
  const byItem = new Map<string, ReviewEvent[]>();
  for (const event of events) {
    const own = byItem.get(event.item);
    if (own === undefined) byItem.set(event.item, [event]);
    else own.push(event);
  }
  return byItem;
};

/** Replays the whole log once: on load and whenever the log changed outside this client. */
export const createLogState = (
  context: ReplayContext,
  events: readonly ReviewEvent[],
  now: Date,
): LogState => ({
  events,
  byItem: indexByItem(events),
  ids: new Set(events.map((event) => event.id)),
  state: replay(events, context.scheduler, context.config, now),
});

/**
 * Adds events this client wrote and replays only the items they touch, at `now`. Other items keep the
 * retrievability of the moment they were last replayed; everything else about them is exactly what a full
 * replay gives. An event already in the log is skipped, as the log files skip it.
 */
export const withEvents = (
  context: ReplayContext,
  log: LogState,
  added: readonly ReviewEvent[],
  now: Date,
): LogState => {
  const fresh = added.filter((event) => !log.ids.has(event.id));
  if (fresh.length === 0) return log;
  const byItem = new Map(log.byItem);
  for (const event of fresh)
    byItem.set(event.item, [...(byItem.get(event.item) ?? []), event]);
  const items = new Map<string, ItemState>(log.state.items);
  const history = new Map<string, readonly HistorySegment[]>(log.state.history);
  for (const item of new Set(fresh.map((event) => event.item))) {
    const own = replay(
      byItem.get(item) ?? [],
      context.scheduler,
      context.config,
      now,
    );
    const itemState = own.items.get(item);
    if (itemState === undefined) {
      items.delete(item);
      history.delete(item);
    } else {
      items.set(item, itemState);
      history.set(item, own.history.get(item) ?? []);
    }
  }
  const ids = new Set(log.ids);
  for (const event of fresh) ids.add(event.id);
  return {
    events: [...log.events, ...fresh],
    byItem,
    ids,
    state: { ...log.state, now: now.getTime(), items, history },
  };
};

/**
 * The content hash the item was last answered on, to tell when its card changed since. An undone answer
 * does not count: the learner took it back.
 */
export const lastAnsweredHash = (
  log: LogState,
  item: string,
): string | undefined =>
  prepareEvents(log.byItem.get(item) ?? []).findLast(
    (event) =>
      (event.kind === "review" || event.kind === "practice") &&
      event.contentHash !== undefined,
  )?.contentHash;
