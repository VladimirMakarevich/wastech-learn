import { createCalendar, type StudyDay } from "./day.js";
import { DEFAULT_ESTIMATES, estimateFor } from "./estimate.js";
import type { QueueCard, Rating, ReplayEvent, SrsConfig } from "./ports.js";
import {
  DEFAULT_BACKLOG_ORDER,
  buildQueue,
  type BacklogOrder,
  type QueueMode,
} from "./queue.js";
import { createReplayer, type ReplayState } from "./replay.js";
import { seededRng, type Rng } from "./rng.js";
import type { Scheduler } from "./scheduler.js";

export interface SimulationParams {
  /** Cards in the synthetic deck; types and domains follow the golden sample's mix. */
  readonly cards: number;
  /** Days of regular study, the whole queue every day, before the break. */
  readonly warmupDays: number;
  readonly breakDays: number;
  /** Length of each session after the break; sessions take no new cards. */
  readonly sessionMinutes: number;
  /** How many days after the break to simulate at most. */
  readonly recoveryDays: number;
  /**
   * Order of overdue items after the break. The warm-up always uses the default order and the same
   * seed, so runs that compare orders share one history and differ only after the break.
   */
  readonly order: BacklogOrder;
  /** First study day of the warm-up. */
  readonly start: Date;
}

export const DEFAULT_SIMULATION: Omit<SimulationParams, "order"> = {
  cards: 300,
  warmupDays: 90,
  breakDays: 14,
  sessionMinutes: 15,
  recoveryDays: 30,
  start: new Date("2026-01-05T12:00:00.000Z"),
};

export type SimulationPhase = "warmup" | "break" | "recovery";

export interface SimulatedDay {
  readonly day: string;
  readonly phase: SimulationPhase;
  /** Review items overdue from earlier days when the session began. */
  readonly backlogAtStart: number;
  readonly reviews: number;
  readonly newCards: number;
  readonly minutes: number;
  /** Overdue review items left when the session ended. */
  readonly backlogAtEnd: number;
  /** Whether the policy offered new cards that day. */
  readonly newCardsOffered: boolean;
}

export interface SimulationReport {
  readonly order: BacklogOrder;
  readonly seed: number;
  readonly params: Omit<SimulationParams, "order" | "start"> & {
    readonly start: string;
  };
  readonly items: number;
  readonly backlogAtReturn: number;
  /** Sessions until no overdue item was left, or `null` when the recovery window ran out first. */
  readonly clearedAfterDays: number | null;
  /** Days after the return until the policy offered new cards again, or `null` if it never did. */
  readonly newCardsBackAfterDays: number | null;
  /** Share of recovery reviews answered correctly. */
  readonly recoveryRecall: number;
  readonly days: readonly SimulatedDay[];
}

// The golden sample's type mix: 30 cards, a third of them two-way vocabulary.
const GOLDEN_TYPES = [
  "basic",
  "basic",
  "basic",
  "basic",
  "basic",
  "cloze",
  "cloze",
  "compare",
  "compare",
  "compare",
  "grammar-cloze",
  "grammar-cloze",
  "reversed",
  "reversed",
  "scenario",
  "scenario",
  "vocab",
  "vocab",
  "vocab",
  "vocab",
  "vocab",
  "vocab",
  "vocab",
  "vocab",
  "vocab",
  "vocab",
  "why",
  "why",
  "why",
  "why",
] as const;

const TWO_WAY = new Set(["vocab", "reversed"]);
const LANGUAGE = new Set(["vocab", "grammar-cloze"]);

/** A deck shaped like the golden sample, scaled to `count` cards. */
export const syntheticDeck = (count: number): readonly QueueCard[] =>
  Array.from({ length: count }, (_, index) => {
    const type = GOLDEN_TYPES[index % GOLDEN_TYPES.length] ?? "basic";
    const cardId = `s${String(index).padStart(7, "0")}`;
    const domain = LANGUAGE.has(type)
      ? "lang-pl"
      : index % 2 === 0
        ? "architecture"
        : "dotnet";
    const variants = TWO_WAY.has(type)
      ? ["fwd", "rev"]
      : type.endsWith("cloze")
        ? ["c1"]
        : ["main"];
    return variants.map((variant) => ({
      item: `${cardId}:${variant}`,
      cardId,
      domain,
      type,
      status: "active",
    }));
  }).flat();

// Answers to a card seen for the first time: the learner has just read it, recall is likely but not sure.
const FIRST_SIGHT_RECALL = 0.7;
// Late in a session time is spent, so the simulated user stops sweeping learning steps after a few rounds.
const MAX_ROUNDS = 6;
// The evening session most people have time for, counted from the start of the study day.
const SESSION_OFFSET_MS = 15 * 3_600_000;

const ratingFor = (rng: Rng, recall: number): Rating => {
  if (rng() >= recall) return 1;
  const flavour = rng();
  return flavour < 0.15 ? 2 : flavour < 0.25 ? 4 : 3;
};

const overdue = (
  state: ReplayState,
  cards: ReadonlySet<string>,
  day: StudyDay,
): number => {
  let count = 0;
  for (const item of state.items.values()) {
    if (
      cards.has(item.item) &&
      item.dueAt !== null &&
      !item.suspended &&
      !item.leech &&
      item.dueAt < day.start
    ) {
      count++;
    }
  }
  return count;
};

/**
 * Plays a regular warm-up, a break and the sessions after it on a synthetic deck, answering each card
 * with the model's own probability of recall drawn from a seeded RNG. The report says how many sessions
 * the break's backlog takes, the load per day and when new cards come back. The same parameters and seed
 * always give the same report.
 */
export const simulate = (
  params: SimulationParams,
  config: SrsConfig,
  scheduler: Scheduler,
  seed: number,
): SimulationReport => {
  const rng = seededRng(seed);
  const deck = syntheticDeck(params.cards);
  const deckItems = new Set(deck.map((card) => card.item));
  const typeOf = new Map(deck.map((card) => [card.item, card.type]));
  const calendar = createCalendar(config.timezone, config.dayStartsAt);
  const replayer = createReplayer(scheduler, config);
  const days: SimulatedDay[] = [];
  let sequence = 0;
  let recoveryAnswers = 0;
  let recoveryRecalled = 0;
  let day = calendar.dayOf(params.start.getTime());

  const studyDay = (phase: SimulationPhase): void => {
    let now = day.start + SESSION_OFFSET_MS;
    const budgetMs =
      phase === "recovery"
        ? params.sessionMinutes * 60_000
        : Number.POSITIVE_INFINITY;
    let spent = 0;
    let reviews = 0;
    let newCards = 0;
    let backlogAtStart = 0;
    let newCardsOffered = false;
    for (let round = 0; round < MAX_ROUNDS && spent < budgetMs; round++) {
      const state = replayer.state(new Date(now));
      const mode: QueueMode =
        phase === "recovery"
          ? { kind: "minutes", minutes: (budgetMs - spent) / 60_000 }
          : { kind: "full" };
      const order = phase === "recovery" ? params.order : DEFAULT_BACKLOG_ORDER;
      const queue = buildQueue(state, deck, config, new Date(now), {
        mode,
        order,
      });
      if (round === 0) {
        backlogAtStart = queue.backlog;
        newCardsOffered = queue.policies.some((policy) => policy.newLimit > 0);
      }
      if (queue.entries.length === 0) break;
      for (const entry of queue.entries) {
        const item = state.items.get(entry.item);
        const recall = item?.retrievability ?? FIRST_SIGHT_RECALL;
        const rating = ratingFor(rng, recall);
        const event: ReplayEvent = {
          id: `SIM${String(++sequence).padStart(9, "0")}`,
          ts: new Date(now).toISOString(),
          kind: "review",
          item: entry.item,
          rating,
        };
        replayer.apply(event);
        const durMs = estimateFor(
          DEFAULT_ESTIMATES,
          typeOf.get(entry.item) ?? "basic",
        );
        now += durMs;
        spent += durMs;
        if (entry.kind === "new") newCards++;
        else reviews++;
        if (phase === "recovery") {
          recoveryAnswers++;
          if (rating > 1) recoveryRecalled++;
        }
      }
    }
    days.push({
      day: day.key,
      phase,
      backlogAtStart,
      reviews,
      newCards,
      minutes: Math.round(spent / 6_000) / 10,
      backlogAtEnd: overdue(replayer.state(new Date(now)), deckItems, day),
      newCardsOffered,
    });
  };

  for (
    let index = 0;
    index < params.warmupDays;
    index++, day = calendar.next(day)
  )
    studyDay("warmup");
  for (let index = 0; index < params.breakDays; index++)
    day = calendar.next(day);
  const backlogAtReturn = overdue(
    replayer.state(new Date(day.start)),
    deckItems,
    day,
  );
  let clearedAfterDays: number | null = null;
  let newCardsBackAfterDays: number | null = null;
  for (
    let index = 1;
    index <= params.recoveryDays;
    index++, day = calendar.next(day)
  ) {
    studyDay("recovery");
    const today = days.at(-1);
    if (newCardsBackAfterDays === null && today?.newCardsOffered === true)
      newCardsBackAfterDays = index;
    if (clearedAfterDays === null && today?.backlogAtEnd === 0)
      clearedAfterDays = index;
    if (clearedAfterDays !== null && newCardsBackAfterDays !== null) break;
  }

  return {
    order: params.order,
    seed: seed >>> 0,
    params: {
      cards: params.cards,
      warmupDays: params.warmupDays,
      breakDays: params.breakDays,
      sessionMinutes: params.sessionMinutes,
      recoveryDays: params.recoveryDays,
      start: params.start.toISOString(),
    },
    items: deck.length,
    backlogAtReturn,
    clearedAfterDays,
    newCardsBackAfterDays,
    recoveryRecall:
      recoveryAnswers === 0 ? 0 : recoveryRecalled / recoveryAnswers,
    days,
  };
};

export interface OrderSummary {
  readonly order: BacklogOrder;
  readonly runs: number;
  /** Median sessions to clear the backlog; a run that never cleared counts as longer than the window. */
  readonly medianDays: number | null;
  /** Runs that cleared within the MVP target. */
  readonly clearedWithinTarget: number;
  readonly meanRecall: number;
}

export interface OrderComparison {
  readonly targetDays: number;
  readonly seeds: readonly number[];
  readonly summaries: readonly OrderSummary[];
  /** The full report of the first seed for each order, for the day-by-day load. */
  readonly reports: readonly SimulationReport[];
}

/** The MVP exit criterion: a 14-day break clears in at most this many sessions. */
export const TARGET_DAYS = 5;

/**
 * Runs the same warm-up and break under every backlog order over several seeds. One seed is one possible
 * learner; the median over seeds keeps a lucky or unlucky run from deciding the order.
 */
export const compareBacklogOrders = (
  params: Omit<SimulationParams, "order">,
  config: SrsConfig,
  scheduler: Scheduler,
  seeds: readonly number[],
  orders: readonly BacklogOrder[],
): OrderComparison => {
  const reports: SimulationReport[] = [];
  const summaries = orders.map((order): OrderSummary => {
    const runs = seeds.map((seed) =>
      simulate({ ...params, order }, config, scheduler, seed),
    );
    const first = runs[0];
    if (first !== undefined) reports.push(first);
    const days = runs
      .map((run) => run.clearedAfterDays ?? Number.POSITIVE_INFINITY)
      .sort((a, b) => a - b);
    const median = days[Math.floor((days.length - 1) / 2)];
    return {
      order,
      runs: runs.length,
      medianDays:
        median === undefined || !Number.isFinite(median) ? null : median,
      clearedWithinTarget: days.filter((value) => value <= TARGET_DAYS).length,
      meanRecall:
        runs.reduce((sum, run) => sum + run.recoveryRecall, 0) /
        Math.max(1, runs.length),
    };
  });
  return { targetDays: TARGET_DAYS, seeds, summaries, reports };
};
