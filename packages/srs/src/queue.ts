import { newCardPolicies, type NewCardPolicy } from "./backlog.js";
import { createCalendar, type StudyDay } from "./day.js";
import {
  DEFAULT_ESTIMATES,
  estimateFor,
  type DurationEstimates,
} from "./estimate.js";
import { limitsFor, type QueueCard, type SrsConfig } from "./ports.js";
import type { ItemState, ReplayState } from "./replay.js";

/** How overdue review items are ordered; the simulation compares these on the same synthetic log. */
export const BACKLOG_ORDERS = [
  "ascending-r",
  "descending-r",
  "relative-overdue",
] as const;
export type BacklogOrder = (typeof BACKLOG_ORDERS)[number];
export const DEFAULT_BACKLOG_ORDER: BacklogOrder = "ascending-r";

/** The whole day's queue, or a session of N minutes that takes no new cards. */
export type QueueMode =
  | { readonly kind: "full" }
  | { readonly kind: "minutes"; readonly minutes: number };

export interface QueueOptions {
  readonly mode: QueueMode;
  readonly order?: BacklogOrder;
  readonly estimates?: DurationEstimates;
}

export type EntryKind = "learning" | "review" | "new";

export interface QueueEntry {
  readonly item: string;
  readonly cardId: string;
  readonly domain: string;
  readonly type: string;
  readonly kind: EntryKind;
  readonly estimateMs: number;
}

export interface Queue {
  readonly day: StudyDay;
  readonly entries: readonly QueueEntry[];
  readonly estimateMs: number;
  /** Rounded up: "≈ 6 min" must not promise less than it takes. */
  readonly estimateMinutes: number;
  /** Review items overdue from earlier days, across domains, right now. */
  readonly backlog: number;
  readonly policies: readonly NewCardPolicy[];
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
// Not a review item: `<id>:<variant>` always has a colon and this never matches one.
const CONTESTED = "";

const byItem = (a: { item: string }, b: { item: string }): number =>
  a.item < b.item ? -1 : a.item > b.item ? 1 : 0;

const orderKey = (
  order: BacklogOrder,
  state: ItemState,
  now: number,
): number => {
  switch (order) {
    case "ascending-r":
      return state.retrievability ?? 0;
    case "descending-r":
      return -(state.retrievability ?? 0);
    case "relative-overdue": {
      // Anki's relative overdueness: a week late on a three-day interval is worse than on a year.
      const interval = Math.max(state.scheduledDays * DAY_MS, DAY_MS);
      return -((now - (state.dueAt ?? now)) / interval);
    }
  }
};

const siblingKeys = (card: QueueCard): readonly string[] =>
  card.idea === undefined
    ? [`card:${card.cardId}`]
    : [`card:${card.cardId}`, `idea:${card.domain}/${card.idea}`];

/** Round-robin over domains, each in its own order, so a session mixes subjects instead of blocking them. */
const interleave = <T>(groups: ReadonlyMap<string, readonly T[]>): T[] => {
  const lists = [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, list]) => list);
  const result: T[] = [];
  for (let index = 0; lists.some((list) => index < list.length); index++) {
    for (const list of lists) {
      const entry = list[index];
      if (entry !== undefined) result.push(entry);
    }
  }
  return result;
};

/**
 * Builds what the user repeats now: learning steps that are due, then the day's review items from all
 * domains interleaved within each domain's limit, then new cards within the limit the backlog policy
 * allows. Variants of one card and cards of one idea never share a day. Suspended items stay out, leeches
 * among them until they are unsuspended. Pure: the replayed state, the content and `now` fully decide the result.
 *
 * New cards are taken in the order `cards` lists them, so the host decides which topic comes first.
 */
export const buildQueue = (
  state: ReplayState,
  cards: readonly QueueCard[],
  config: SrsConfig,
  now: Date,
  options: QueueOptions,
): Queue => {
  const at = now.getTime();
  const calendar = createCalendar(config.timezone, config.dayStartsAt);
  const today = calendar.dayOf(at);
  const order = options.order ?? DEFAULT_BACKLOG_ORDER;
  const estimates = options.estimates ?? DEFAULT_ESTIMATES;
  const active = cards.filter((card) => card.status === "active");
  const entryOf = (card: QueueCard, kind: EntryKind): QueueEntry => ({
    item: card.item,
    cardId: card.cardId,
    domain: card.domain,
    type: card.type,
    kind,
    estimateMs: estimateFor(estimates, card.type),
  });

  // Which item holds each sibling key today: the first item reviewed today, then every item the queue
  // takes. An item may come back to its own key (its next learning step); any other item is buried.
  const owners = new Map<string, string>();
  const claim = (card: QueueCard): boolean => {
    const keys = siblingKeys(card);
    if (keys.some((key) => (owners.get(key) ?? card.item) !== card.item))
      return false;
    for (const key of keys) owners.set(key, card.item);
    return true;
  };
  const reviewedToday = new Map<string, number>();
  const introducedToday = new Map<string, number>();
  const learning: { card: QueueCard; state: ItemState }[] = [];
  const due = new Map<string, { card: QueueCard; state: ItemState }[]>();
  const fresh: QueueCard[] = [];
  let backlog = 0;

  for (const card of active) {
    const item = state.items.get(card.item);
    if (item?.suspended === true) continue;
    if (
      item?.lastReviewAt !== undefined &&
      item.lastReviewAt !== null &&
      item.lastReviewAt >= today.start
    ) {
      // Two siblings already answered today (say, on two devices) leave the key to neither of them.
      for (const key of siblingKeys(card))
        owners.set(key, owners.has(key) ? CONTESTED : card.item);
      const counter =
        item.introducedAt !== null && item.introducedAt >= today.start
          ? introducedToday
          : reviewedToday;
      counter.set(card.domain, (counter.get(card.domain) ?? 0) + 1);
    }
    if (item === undefined || item.phase === "new" || item.dueAt === null) {
      fresh.push(card);
      continue;
    }
    if (item.dueAt < today.start) backlog++;
    if (item.phase === "learning" || item.phase === "relearning") {
      if (item.dueAt <= at) learning.push({ card, state: item });
    } else if (item.dueAt < today.end) {
      const inDomain = due.get(card.domain) ?? [];
      inDomain.push({ card, state: item });
      due.set(card.domain, inDomain);
    }
  }

  // Siblings due on the same day compete for the day's key, and the one that has waited longest wins. Any
  // other rule lets a twin that lapses daily, and so sits in learning every day, starve its sibling for weeks.
  const byDue = (
    a: { card: QueueCard; state: ItemState },
    b: { card: QueueCard; state: ItemState },
  ): number =>
    (a.state.dueAt ?? 0) - (b.state.dueAt ?? 0) || byItem(a.card, b.card);
  const winners = new Set(
    [...learning, ...[...due.values()].flat()]
      .sort(byDue)
      .filter(({ card }) => claim(card))
      .map(({ card }) => card.item),
  );
  const learningEntries = learning
    .filter(({ card }) => winners.has(card.item))
    .sort(byDue)
    .map(({ card }) => entryOf(card, "learning"));

  const reviewsByDomain = new Map<string, QueueEntry[]>();
  for (const [domain, candidates] of due) {
    const left = Math.max(
      0,
      limitsFor(config, domain).reviewsPerDay -
        (reviewedToday.get(domain) ?? 0),
    );
    const taken = candidates
      .filter(({ card }) => winners.has(card.item))
      .sort(
        (a, b) =>
          orderKey(order, a.state, at) - orderKey(order, b.state, at) ||
          byItem(a.card, b.card),
      )
      .slice(0, left)
      .map(({ card }) => entryOf(card, "review"));
    reviewsByDomain.set(domain, taken);
  }

  const policies = newCardPolicies(state, cards, config, calendar, today);
  const newEntries: QueueEntry[] = [];
  if (options.mode.kind === "full") {
    const left = new Map<string, number>();
    for (const card of fresh) {
      const remaining =
        left.get(card.domain) ??
        Math.max(
          0,
          (policies.get(card.domain)?.newLimit ?? 0) -
            (introducedToday.get(card.domain) ?? 0),
        );
      if (remaining > 0 && claim(card)) {
        newEntries.push(entryOf(card, "new"));
        left.set(card.domain, remaining - 1);
      } else {
        left.set(card.domain, remaining);
      }
    }
  }

  let entries = [
    ...learningEntries,
    ...interleave(reviewsByDomain),
    ...newEntries,
  ];
  if (options.mode.kind === "minutes") {
    // The card on screen when time runs out is finished, so the last entry may cross the limit.
    const limitMs = options.mode.minutes * MINUTE_MS;
    let spent = 0;
    entries = entries.filter((entry) => {
      if (spent >= limitMs) return false;
      spent += entry.estimateMs;
      return true;
    });
  }
  const estimateMs = entries.reduce((sum, entry) => sum + entry.estimateMs, 0);
  return {
    day: today,
    entries,
    estimateMs,
    estimateMinutes: Math.ceil(estimateMs / MINUTE_MS),
    backlog,
    policies: [...policies.values()].sort((a, b) =>
      a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0,
    ),
  };
};

/** The card to show next, or `undefined` when the queue is done for now. */
export const nextEntry = (queue: Queue): QueueEntry | undefined =>
  queue.entries[0];

/**
 * The first moment after `now` at which the queue can change without a new event: a learning step comes
 * due, or the next study day begins and brings its reviews and new cards. A screen that shows the queue
 * recomputes then, instead of keeping the count of the moment it was opened.
 */
export const nextQueueChange = (
  state: ReplayState,
  config: Pick<SrsConfig, "timezone" | "dayStartsAt">,
  now: Date,
): number => {
  const at = now.getTime();
  let next = createCalendar(config.timezone, config.dayStartsAt).dayOf(at).end;
  for (const item of state.items.values()) {
    if (
      !item.suspended &&
      (item.phase === "learning" || item.phase === "relearning") &&
      item.dueAt !== null &&
      item.dueAt > at &&
      item.dueAt < next
    )
      next = item.dueAt;
  }
  return next;
};
