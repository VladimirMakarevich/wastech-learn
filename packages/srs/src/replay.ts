import { prepareEvents } from "./events.js";
import type { Rating, ReplayEvent, SrsConfig } from "./ports.js";
import type { MemoryCard, Scheduler } from "./scheduler.js";

export type Phase = "new" | "learning" | "review" | "relearning";

const PHASES: readonly Phase[] = ["new", "learning", "review", "relearning"];

/** The schedule of one review item at the moment of the replay. */
export interface ItemState {
  readonly item: string;
  readonly cardId: string;
  readonly variant: string;
  readonly phase: Phase;
  readonly stability: number;
  readonly difficulty: number;
  /** Probability of recall at the replay's `now`; `null` while the item was never reviewed. */
  readonly retrievability: number | null;
  /** Epoch milliseconds the item is due at; `null` while it is new. */
  readonly dueAt: number | null;
  readonly lastReviewAt: number | null;
  /** First review since the item was new, so the queue can count today's new cards. */
  readonly introducedAt: number | null;
  readonly scheduledDays: number;
  readonly reps: number;
  readonly lapses: number;
  readonly suspended: boolean;
  /** Lapsed `leechThreshold` times or more: it needs rewriting, not more repetition. */
  readonly leech: boolean;
}

/**
 * From `from` until the next segment, the item was due at `dueAt` and counted toward a backlog when
 * `countable` (reviewed at least once, not suspended, not a leech). The backlog policy reads past days
 * from these segments instead of replaying the log once per day.
 */
export interface HistorySegment {
  readonly from: number;
  readonly dueAt: number | null;
  readonly countable: boolean;
}

export interface ReplayState {
  readonly now: number;
  readonly sched: string;
  readonly items: ReadonlyMap<string, ItemState>;
  readonly history: ReadonlyMap<string, readonly HistorySegment[]>;
}

/**
 * One applied review with the item as it stood just before the answer. True retention asks whether an
 * item in the review phase was recalled, and the phase before the answer is gone once the answer applies.
 */
export interface ReviewRecord {
  readonly item: string;
  /** Epoch milliseconds of the answer. */
  readonly at: number;
  readonly rating: Rating;
  readonly phase: Phase;
  /** The interval the item was on when it was answered, in days. */
  readonly scheduledDays: number;
}

interface Memory {
  card: MemoryCard;
  suspended: boolean;
  introducedAt: number | null;
  readonly segments: HistorySegment[];
}

/**
 * Folds events into per-item memory one at a time, in log order. `replay` uses it for a whole log; the
 * backlog simulation appends to it session after session instead of replaying an ever longer log.
 */
export interface Replayer {
  readonly apply: (event: ReplayEvent) => void;
  readonly state: (now: Date) => ReplayState;
}

export const createReplayer = (
  scheduler: Scheduler,
  config: Pick<SrsConfig, "leechThreshold">,
  observe?: (record: ReviewRecord) => void,
): Replayer => {
  const { leechThreshold } = config;
  const memories = new Map<string, Memory>();

  const memoryOf = (item: string, at: Date): Memory => {
    let memory = memories.get(item);
    if (memory === undefined) {
      memory = {
        card: scheduler.newCard(item, at),
        suspended: false,
        introducedAt: null,
        segments: [],
      };
      memories.set(item, memory);
    }
    return memory;
  };

  const record = (memory: Memory, at: number): void => {
    const { card } = memory;
    const reviewed = card.state !== 0;
    memory.segments.push({
      from: at,
      dueAt: reviewed ? card.dueAt.getTime() : null,
      countable: reviewed && !memory.suspended && card.lapses < leechThreshold,
    });
  };

  const apply = (event: ReplayEvent): void => {
    const at = new Date(event.ts);
    const memory = memoryOf(event.item, at);
    switch (event.kind) {
      case "review":
        if (event.rating === undefined) return;
        observe?.({
          item: event.item,
          at: at.getTime(),
          rating: event.rating,
          phase: PHASES[memory.card.state] ?? "new",
          scheduledDays: memory.card.scheduledDays,
        });
        if (memory.card.state === 0) memory.introducedAt = at.getTime();
        memory.card = scheduler.review(memory.card, event.rating, at);
        break;
      case "reset":
        memory.card = scheduler.forget(memory.card, at);
        memory.introducedAt = null;
        break;
      case "suspend":
        memory.suspended = true;
        break;
      case "unsuspend":
        memory.suspended = false;
        break;
      case "manual_due":
        if (event.due === undefined) return;
        memory.card = { ...memory.card, dueAt: new Date(event.due) };
        break;
      case "practice":
      case "undo":
        // Practice is cramming without consequences for the schedule; undos were resolved before replay.
        return;
    }
    record(memory, at.getTime());
  };

  const state = (now: Date): ReplayState => {
    const items = new Map<string, ItemState>();
    const history = new Map<string, readonly HistorySegment[]>();
    for (const [item, memory] of memories) {
      const { card } = memory;
      const separator = item.indexOf(":");
      const reviewed = card.state !== 0;
      items.set(item, {
        item,
        cardId: item.slice(0, separator),
        variant: item.slice(separator + 1),
        phase: PHASES[card.state] ?? "new",
        stability: card.stability,
        difficulty: card.difficulty,
        retrievability: reviewed ? scheduler.retrievability(card, now) : null,
        dueAt: reviewed ? card.dueAt.getTime() : null,
        lastReviewAt: card.lastReviewAt?.getTime() ?? null,
        introducedAt: memory.introducedAt,
        scheduledDays: card.scheduledDays,
        reps: card.reps,
        lapses: card.lapses,
        suspended: memory.suspended,
        leech: card.lapses >= leechThreshold,
      });
      history.set(item, [...memory.segments]);
    }
    return { now: now.getTime(), sched: scheduler.sched, items, history };
  };

  return { apply, state };
};

const applyUntil = (
  replayer: Replayer,
  events: readonly ReplayEvent[],
  now: Date,
): void => {
  const until = now.getTime();
  for (const event of prepareEvents(events)) {
    if (Date.parse(event.ts) > until) break;
    replayer.apply(event);
  }
};

/**
 * Replays the log into the state of every review item at `now`. Pure: the same events, scheduler version
 * and `now` give the same state whatever order the events arrive in. Events after `now` are ignored, so a
 * state can be computed for any moment of the past.
 */
export const replay = (
  events: readonly ReplayEvent[],
  scheduler: Scheduler,
  config: Pick<SrsConfig, "leechThreshold">,
  now: Date,
): ReplayState => {
  const replayer = createReplayer(scheduler, config);
  applyUntil(replayer, events, now);
  return replayer.state(now);
};

/**
 * Every review the log applies up to `now`, in replay order, each with the item's phase and interval
 * before the answer. Undone events are gone, as in `replay`.
 */
export const reviewRecords = (
  events: readonly ReplayEvent[],
  scheduler: Scheduler,
  config: Pick<SrsConfig, "leechThreshold">,
  now: Date,
): readonly ReviewRecord[] => {
  const records: ReviewRecord[] = [];
  const replayer = createReplayer(scheduler, config, (record) =>
    records.push(record),
  );
  applyUntil(replayer, events, now);
  return records;
};
