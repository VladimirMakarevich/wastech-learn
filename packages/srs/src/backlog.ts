import type { StudyCalendar, StudyDay } from "./day.js";
import { limitsFor, type QueueCard, type SrsConfig } from "./ports.js";
import type { HistorySegment, ReplayState } from "./replay.js";

/** New cards come back at half rate for this many days after a pause, so the backlog does not refill at once. */
export const HALF_RATE_DAYS = 3;

export interface NewCardPolicy {
  readonly domain: string;
  /** Review items overdue at the start of today. */
  readonly backlog: number;
  readonly paused: boolean;
  readonly halfRate: boolean;
  /** New items allowed today before counting those already introduced. */
  readonly newLimit: number;
}

const firstIndexAbove = (sorted: readonly number[], value: number): number => {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((sorted[middle] ?? 0) > value) high = middle;
    else low = middle + 1;
  }
  return low;
};

const firstIndexAtLeast = (sorted: readonly number[], value: number): number =>
  firstIndexAbove(sorted, value - 1);

/**
 * How many review items of each domain were overdue at the start of each given day. A segment counts
 * on the day starts that fall after both its own start and its due date and before the next segment;
 * a difference array turns that into one pass over the history instead of a replay per day.
 */
export const backlogByDay = (
  history: ReadonlyMap<string, readonly HistorySegment[]>,
  domainOf: ReadonlyMap<string, string>,
  dayStarts: readonly number[],
): ReadonlyMap<string, readonly number[]> => {
  const deltas = new Map<string, number[]>();
  for (const [item, segments] of history) {
    const domain = domainOf.get(item);
    if (domain === undefined) continue;
    let delta = deltas.get(domain);
    if (delta === undefined) {
      delta = new Array<number>(dayStarts.length + 1).fill(0);
      deltas.set(domain, delta);
    }
    segments.forEach((segment, index) => {
      if (!segment.countable || segment.dueAt === null) return;
      const until = segments[index + 1]?.from ?? Number.POSITIVE_INFINITY;
      const first = Math.max(
        firstIndexAbove(dayStarts, segment.dueAt),
        firstIndexAtLeast(dayStarts, segment.from),
      );
      const last = firstIndexAtLeast(dayStarts, until) - 1;
      if (first > last) return;
      delta[first] = (delta[first] ?? 0) + 1;
      delta[last + 1] = (delta[last + 1] ?? 0) - 1;
    });
  }
  const series = new Map<string, readonly number[]>();
  for (const [domain, delta] of deltas) {
    let running = 0;
    series.set(
      domain,
      dayStarts.map((_, index) => (running += delta[index] ?? 0)),
    );
  }
  return series;
};

/** Study days from the first event of the log through today, oldest first. */
export const studyDaysUntil = (
  calendar: StudyCalendar,
  state: ReplayState,
  today: StudyDay,
): StudyDay[] => {
  let first = today.start;
  for (const segments of state.history.values()) {
    const from = segments[0]?.from;
    if (from !== undefined && from < first) first = from;
  }
  const days: StudyDay[] = [];
  for (
    let day = calendar.dayOf(first);
    day.start <= today.start;
    day = calendar.next(day)
  )
    days.push(day);
  return days;
};

/**
 * Whether today brings new cards, per domain. A backlog past `pauseNewWhenBacklogOver × reviewsPerDay`
 * pauses them, so a return after a break is not buried under fresh material; they come back once the
 * backlog drops under one day's worth, at half rate for the first days. The pause is replayed day by day
 * from the history, so it is derived from the log like everything else and needs no stored flag.
 */
export const newCardPolicies = (
  state: ReplayState,
  cards: readonly QueueCard[],
  config: SrsConfig,
  calendar: StudyCalendar,
  today: StudyDay,
): ReadonlyMap<string, NewCardPolicy> => {
  const days = studyDaysUntil(calendar, state, today);
  const domainOf = new Map(
    cards
      .filter((card) => card.status === "active")
      .map((card) => [card.item, card.domain]),
  );
  const series = backlogByDay(
    state.history,
    domainOf,
    days.map((day) => day.start),
  );
  const policies = new Map<string, NewCardPolicy>();
  for (const domain of new Set(domainOf.values())) {
    const limits = limitsFor(config, domain);
    const pauseAbove =
      config.limits.pauseNewWhenBacklogOver * limits.reviewsPerDay;
    const backlogs = series.get(domain) ?? days.map(() => 0);
    let paused = false;
    let returnedOn = -1;
    for (const [index, backlog] of backlogs.entries()) {
      if (!paused && backlog > pauseAbove) paused = true;
      else if (paused && backlog < limits.reviewsPerDay) {
        paused = false;
        returnedOn = index;
      }
    }
    const halfRate =
      !paused &&
      returnedOn >= 0 &&
      days.length - 1 - returnedOn < HALF_RATE_DAYS;
    policies.set(domain, {
      domain,
      backlog: backlogs.at(-1) ?? 0,
      paused,
      halfRate,
      newLimit: paused
        ? 0
        : halfRate
          ? Math.floor(limits.newPerDay / 2)
          : limits.newPerDay,
    });
  }
  return policies;
};
