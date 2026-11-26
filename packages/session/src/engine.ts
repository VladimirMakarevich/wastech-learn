import type { ReviewEvent } from "@wastech-learn/core";
import {
  buildQueue,
  createCalendar,
  estimateDurations,
  prepareEvents,
  type Phase,
  type QueueEntry,
  type QueueMode,
  type Rating,
} from "@wastech-learn/srs";
import type { SessionDeck } from "./deck.js";
import {
  ratingEvent,
  resetEvent,
  suspendEvent,
  undoEvents,
  type EventOrigin,
} from "./event.js";
import { crossesLeechThreshold } from "./leech.js";
import {
  createLogState,
  lastAnsweredHash,
  withEvents,
  type LogState,
  type ReplayContext,
} from "./log.js";
import { previewIntervals, type IntervalPreview } from "./preview.js";

/** "5 minutes" (any length) takes no new cards and stops when time is up; "full" is the whole day's queue. */
export type SessionMode =
  | { readonly kind: "minutes"; readonly minutes: number }
  | { readonly kind: "full" };

export interface SessionContext extends ReplayContext {
  readonly origin: EventOrigin;
}

/** One rating of the session with the item as it stood before it, kept for undo and the summary. */
export interface SessionAnswer {
  readonly entry: QueueEntry;
  readonly rating: Rating;
  readonly confidence: 1 | 2 | 3 | null;
  readonly at: number;
  readonly phase: Phase;
  readonly scheduledDays: number;
  /** The rating and the suspend it triggered, undone together. */
  readonly events: readonly ReviewEvent[];
}

/** A learning step answered in this session that comes back later the same day. */
interface Pending {
  readonly entry: QueueEntry;
  readonly dueAt: number;
}

/**
 * A review session as plain data. Every transition is a pure function of the state, the context and
 * `now`, returning a new state and the events to append, so the screen only renders and forwards keys.
 */
export interface SessionState {
  readonly mode: SessionMode;
  readonly startedAt: number;
  readonly deck: SessionDeck;
  readonly log: LogState;
  /** The card on screen; `undefined` once the session is over. */
  readonly current: QueueEntry | undefined;
  readonly queue: readonly QueueEntry[];
  readonly pending: readonly Pending[];
  /** Cards hidden until the session ends; nothing is written for them. */
  readonly buried: ReadonlySet<string>;
  readonly answers: readonly SessionAnswer[];
}

export interface Transition {
  readonly state: SessionState;
  /** What to append to the log, in order; empty when nothing was written. */
  readonly events: readonly ReviewEvent[];
}

const MINUTE_MS = 60_000;

// With nothing else left, a learning step due within this window is shown early instead of ending the
// session for a card that comes back in a few minutes.
const LEARN_AHEAD_MS = 20 * MINUTE_MS;

const cardOf = (item: string): string => item.slice(0, item.indexOf(":"));

const timeIsUp = (state: SessionState, now: Date): boolean =>
  state.mode.kind === "minutes" &&
  now.getTime() - state.startedAt >= state.mode.minutes * MINUTE_MS;

/** An entry can still be asked: its card exists and is active, the item is neither suspended nor a leech. */
const isAskable = (state: SessionState, item: string): boolean => {
  if (state.buried.has(cardOf(item))) return false;
  if (state.deck.byItem.get(item)?.status !== "active") return false;
  const memory = state.log.state.items.get(item);
  return memory?.suspended !== true && memory?.leech !== true;
};

/** Puts the next card on screen: due learning steps first, then the queue, then a learning step ahead. */
const advance = (state: SessionState, now: Date): SessionState => {
  const idle = { ...state, current: undefined };
  if (state.answers.length > 0 && timeIsUp(state, now)) return idle;
  const at = now.getTime();
  const pending = state.pending
    .filter((step) => isAskable(state, step.entry.item))
    .sort((a, b) => a.dueAt - b.dueAt);
  const due = pending.find((step) => step.dueAt <= at);
  if (due !== undefined)
    return {
      ...state,
      current: due.entry,
      pending: pending.filter((step) => step !== due),
    };
  const queue = state.queue.filter((entry) => isAskable(state, entry.item));
  const [head, ...rest] = queue;
  if (head !== undefined)
    return { ...state, current: head, queue: rest, pending };
  const ahead = pending.find((step) => step.dueAt <= at + LEARN_AHEAD_MS);
  if (ahead !== undefined)
    return {
      ...state,
      current: ahead.entry,
      queue: [],
      pending: pending.filter((step) => step !== ahead),
    };
  return { ...idle, queue: [], pending };
};

const queueMode = (state: SessionState, now: Date): QueueMode => {
  if (state.mode.kind === "full") return { kind: "full" };
  const elapsed = (now.getTime() - state.startedAt) / MINUTE_MS;
  return {
    kind: "minutes",
    minutes: Math.max(0, state.mode.minutes - elapsed),
  };
};

/** The day's queue from the replayed state, without what is on screen or waiting as a learning step. */
const dayQueue = (
  context: SessionContext,
  state: SessionState,
  now: Date,
): readonly QueueEntry[] => {
  const taken = new Set([
    ...(state.current === undefined ? [] : [state.current.item]),
    ...state.pending.map((step) => step.entry.item),
  ]);
  const estimates = estimateDurations(
    prepareEvents(state.log.events),
    state.deck.cards,
  );
  return buildQueue(state.log.state, state.deck.cards, context.config, now, {
    mode: queueMode(state, now),
    estimates,
  }).entries.filter(
    (entry) => !taken.has(entry.item) && isAskable(state, entry.item),
  );
};

export interface SessionStart {
  readonly deck: SessionDeck;
  readonly events: readonly ReviewEvent[];
  readonly mode: SessionMode;
  readonly now: Date;
}

/** Replays the whole log once and lines up the day's queue in the order srs builds it. */
export const startSession = (
  context: SessionContext,
  start: SessionStart,
): SessionState => {
  const state: SessionState = {
    mode: start.mode,
    startedAt: start.now.getTime(),
    deck: start.deck,
    log: createLogState(context, start.events, start.now),
    current: undefined,
    queue: [],
    pending: [],
    buried: new Set(),
    answers: [],
  };
  return advance(
    { ...state, queue: dayQueue(context, state, start.now) },
    start.now,
  );
};

export interface RatingChoice {
  readonly rating: Rating;
  readonly confidence?: 1 | 2 | 3 | undefined;
  readonly durMs?: number | undefined;
}

/**
 * Records the learner's rating of the card on screen. Only that item is replayed again; a learning step
 * that comes back today waits in the session, and a rating that makes the item a leech suspends it in the
 * same write, as the chat quiz does.
 */
export const rate = (
  context: SessionContext,
  state: SessionState,
  choice: RatingChoice,
  now: Date,
): Transition => {
  const entry = state.current;
  if (entry === undefined) return { state, events: [] };
  const { item } = entry;
  const before = state.log.state.items.get(item);
  const review = ratingEvent(context.origin, now, {
    item,
    kind: "review",
    rating: choice.rating,
    contentHash: state.deck.contentHash.get(entry.cardId) ?? "",
    confidence: choice.confidence,
    durMs: choice.durMs,
  });
  const rated = withEvents(context, state.log, [review], now);
  const suspend = crossesLeechThreshold(
    before,
    rated.state.items.get(item),
    context.config.leechThreshold,
  );
  const events = suspend
    ? [review, suspendEvent(context.origin, now, item)]
    : [review];
  const log = suspend ? withEvents(context, rated, events, now) : rated;
  const after = log.state.items.get(item);
  const dayEnd = createCalendar(
    context.config.timezone,
    context.config.dayStartsAt,
  ).dayOf(now.getTime()).end;
  const comesBack =
    after !== undefined &&
    !after.suspended &&
    (after.phase === "learning" || after.phase === "relearning") &&
    after.dueAt !== null &&
    after.dueAt < dayEnd;
  const pending = state.pending.filter((step) => step.entry.item !== item);
  const answer: SessionAnswer = {
    entry,
    rating: choice.rating,
    confidence: choice.confidence ?? null,
    at: now.getTime(),
    phase: before?.phase ?? "new",
    scheduledDays: before?.scheduledDays ?? 0,
    events,
  };
  return {
    state: advance(
      {
        ...state,
        log,
        current: undefined,
        pending: comesBack
          ? [...pending, { entry, dueAt: after.dueAt }]
          : pending,
        answers: [...state.answers, answer],
      },
      now,
    ),
    events,
  };
};

/**
 * Takes back the last rating of this session, with the suspend it triggered: one `undo` per event, and the
 * item is on screen again with its earlier schedule. The card that was on screen goes back to the front.
 */
export const undo = (
  context: SessionContext,
  state: SessionState,
  now: Date,
): Transition => {
  const last = state.answers.at(-1);
  if (last === undefined) return { state, events: [] };
  const events = undoEvents(context.origin, now, last.events);
  return {
    state: {
      ...state,
      log: withEvents(context, state.log, events, now),
      current: last.entry,
      // A forgotten card shown again at once (nothing else was left) is both the answer undone and the
      // card on screen; it must not come back twice.
      queue:
        state.current === undefined || state.current.item === last.entry.item
          ? state.queue
          : [state.current, ...state.queue],
      pending: state.pending.filter(
        (step) => step.entry.item !== last.entry.item,
      ),
      answers: state.answers.slice(0, -1),
    },
    events,
  };
};

/** Hides the card on screen, all its variants, until the session ends; the log is not touched. */
export const bury = (state: SessionState, now: Date): SessionState => {
  if (state.current === undefined) return state;
  return advance(
    {
      ...state,
      current: undefined,
      buried: new Set([...state.buried, state.current.cardId]),
    },
    now,
  );
};

/** Suspends the item on screen: out of the queue until it is unsuspended, its schedule kept. */
export const suspend = (
  context: SessionContext,
  state: SessionState,
  now: Date,
): Transition => {
  if (state.current === undefined) return { state, events: [] };
  const events = [suspendEvent(context.origin, now, state.current.item)];
  return {
    state: advance(
      {
        ...state,
        log: withEvents(context, state.log, events, now),
        current: undefined,
      },
      now,
    ),
    events,
  };
};

/**
 * Forgets the memory of the item on screen, for a card rewritten so much that its history no longer
 * applies. The card stays on screen and is answered as new.
 */
export const reset = (
  context: SessionContext,
  state: SessionState,
  now: Date,
): Transition => {
  if (state.current === undefined) return { state, events: [] };
  const events = [resetEvent(context.origin, now, state.current.item)];
  return {
    state: { ...state, log: withEvents(context, state.log, events, now) },
    events,
  };
};

export interface ExternalChange {
  readonly deck: SessionDeck;
  /** The whole log as it is now, this session's own events included. */
  readonly events: readonly ReviewEvent[];
}

/**
 * The content or the log changed outside the session (an edit in VS Code, a pull, another writer): the log
 * is replayed in full and the queue rebuilt, while the card on screen stays if it can still be asked. A
 * card that disappeared or stopped being active is passed over silently.
 */
export const refresh = (
  context: SessionContext,
  state: SessionState,
  change: ExternalChange,
  now: Date,
): SessionState => {
  const replayed: SessionState = {
    ...state,
    deck: change.deck,
    log: createLogState(context, change.events, now),
  };
  const current =
    replayed.current !== undefined && isAskable(replayed, replayed.current.item)
      ? replayed.current
      : undefined;
  const rebuilt = { ...replayed, current };
  const queue = dayQueue(context, rebuilt, now);
  return current === undefined
    ? advance({ ...rebuilt, queue }, now)
    : { ...rebuilt, queue };
};

/** The due date each button would give the card on screen, for the labels under the buttons. */
export const previewCurrent = (
  context: SessionContext,
  state: SessionState,
  now: Date,
): readonly IntervalPreview[] =>
  state.current === undefined
    ? []
    : previewIntervals(
        state.log.byItem.get(state.current.item) ?? [],
        state.current.item,
        context.scheduler,
        context.config,
        now,
      );

/** The card changed since the item was last answered: its history may no longer fit, so offer a reset. */
export const isChanged = (state: SessionState, item: string): boolean => {
  const answered = lastAnsweredHash(state.log, item);
  const current = state.deck.contentHash.get(cardOf(item));
  return (
    answered !== undefined && current !== undefined && answered !== current
  );
};

/** "7 / 23": answers given and everything the session still holds, so the counter never jumps back. */
export const progress = (
  state: SessionState,
): { readonly done: number; readonly total: number } => {
  const done = state.answers.length;
  return {
    done,
    total:
      done +
      (state.current === undefined ? 0 : 1) +
      state.queue.length +
      state.pending.length,
  };
};
