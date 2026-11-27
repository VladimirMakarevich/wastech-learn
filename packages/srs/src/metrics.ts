import { createCalendar, type StudyCalendar, type StudyDay } from "./day.js";
import {
  DEFAULT_ESTIMATES,
  estimateFor,
  type DurationEstimates,
} from "./estimate.js";
import { prepareEvents } from "./events.js";
import type { QueueCard, ReplayEvent, SrsConfig } from "./ports.js";
import type { ReplayState, ReviewRecord } from "./replay.js";

/** Below this interval a review item is young; at or above it, mature. */
export const MATURE_INTERVAL_DAYS = 21;

/** A pause longer than this many study days turns the home screen's count into a plan to come back. */
export const RETURN_AFTER_DAYS = 3;

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

export interface RetentionCount {
  /** Answers rated Hard, Good or Easy. */
  readonly passed: number;
  readonly total: number;
  /** `passed / total`; `null` without answers, so "nothing to measure" never reads as 0%. */
  readonly rate: number | null;
}

export interface TrueRetention {
  readonly young: RetentionCount;
  readonly mature: RetentionCount;
}

/** A span of time in epoch milliseconds, both ends included. */
export interface TimeWindow {
  readonly from: number;
  readonly until: number;
}

const count = (passed: number, total: number): RetentionCount => ({
  passed,
  total,
  rate: total === 0 ? null : passed / total,
});

/**
 * How often items in the review phase were recalled, the measure FSRS's desired retention aims at:
 * learning steps and new cards say nothing about long-term memory, so only answers given in the review
 * phase count, split by the interval the item was on when it was asked.
 */
export const trueRetention = (
  records: readonly ReviewRecord[],
  window: TimeWindow,
): TrueRetention => {
  const tally = { young: [0, 0], mature: [0, 0] };
  for (const record of records) {
    if (record.phase !== "review") continue;
    if (record.at < window.from || record.at > window.until) continue;
    const bucket =
      record.scheduledDays >= MATURE_INTERVAL_DAYS ? tally.mature : tally.young;
    bucket[1] = (bucket[1] ?? 0) + 1;
    if (record.rating > 1) bucket[0] = (bucket[0] ?? 0) + 1;
  }
  return {
    young: count(tally.young[0] ?? 0, tally.young[1] ?? 0),
    mature: count(tally.mature[0] ?? 0, tally.mature[1] ?? 0),
  };
};

/**
 * The last `days` study days up to `now`, today included. Days start at `dayStartsAt` in the configured
 * zone, so "the last 7 days" means the same answers on every machine.
 */
export const studyDaysWindow = (
  config: Pick<SrsConfig, "timezone" | "dayStartsAt">,
  now: Date,
  days: number,
): TimeWindow => {
  const calendar = createCalendar(config.timezone, config.dayStartsAt);
  const today = calendar.dayOf(now.getTime());
  // Stepping back by whole days lands inside the wanted day even across a DST switch, and dayOf then
  // finds its exact start.
  const first = calendar.dayOf(
    today.start - (Math.max(1, days) - 1) * DAY_MS + DAY_MS / 2,
  );
  return { from: first.start, until: now.getTime() };
};

export interface ForecastDay {
  readonly day: StudyDay;
  /** Review items due that day; today also holds everything overdue. */
  readonly due: number;
  readonly estimateMs: number;
  /** Rounded up, like the queue's estimate: a forecast must not promise less than it takes. */
  readonly minutes: number;
}

/**
 * Review items due on each of the next `days` study days, today first, with the time they take at the
 * learner's own pace. It counts what is scheduled now and does not simulate the answers in between, so
 * later days show the floor of their load. Suspended items and inactive cards stay out, as they stay out
 * of the queue; new cards are not a forecast but a choice.
 */
export const loadForecast = (
  state: ReplayState,
  cards: readonly QueueCard[],
  config: Pick<SrsConfig, "timezone" | "dayStartsAt">,
  now: Date,
  days: number,
  estimates: DurationEstimates = DEFAULT_ESTIMATES,
): readonly ForecastDay[] => {
  const calendar = createCalendar(config.timezone, config.dayStartsAt);
  const horizon: StudyDay[] = [];
  for (
    let day = calendar.dayOf(now.getTime());
    horizon.length < days;
    day = calendar.next(day)
  )
    horizon.push(day);
  const due = horizon.map(() => 0);
  const spent = horizon.map(() => 0);
  for (const card of cards) {
    if (card.status !== "active") continue;
    const item = state.items.get(card.item);
    if (item === undefined || item.dueAt === null) continue;
    if (item.suspended) continue;
    const index = horizon.findIndex(
      (day) => item.dueAt !== null && item.dueAt < day.end,
    );
    if (index === -1) continue;
    due[index] = (due[index] ?? 0) + 1;
    spent[index] = (spent[index] ?? 0) + estimateFor(estimates, card.type);
  }
  return horizon.map((day, index) => {
    const estimateMs = spent[index] ?? 0;
    return {
      day,
      due: due[index] ?? 0,
      estimateMs,
      minutes: Math.ceil(estimateMs / MINUTE_MS),
    };
  });
};

export interface ComebackStatus {
  /** Epoch milliseconds of the last answer in the log; `null` before the first one. */
  readonly lastStudyAt: number | null;
  /** Whole study days from the day of the last answer to today. */
  readonly daysAway: number | null;
  /** Away longer than `RETURN_AFTER_DAYS`: greet with a plan, not with a debt. */
  readonly returning: boolean;
}

const daysBetween = (
  calendar: StudyCalendar,
  from: number,
  to: number,
): number =>
  // A day across a DST switch is 23 or 25 hours long; rounding absorbs it.
  Math.round((calendar.dayOf(to).start - calendar.dayOf(from).start) / DAY_MS);

/**
 * When the learner last answered and whether the pause was long enough for a plan to come back. Practice
 * counts as studying; an undone answer does not, and nothing after `now` is seen.
 */
export const comebackStatus = (
  events: readonly ReplayEvent[],
  config: Pick<SrsConfig, "timezone" | "dayStartsAt">,
  now: Date,
): ComebackStatus => {
  const until = now.getTime();
  let lastStudyAt: number | null = null;
  // Cut off before undos are resolved, as replay does: a later undo had not happened yet at `now`.
  const seen = events.filter((event) => Date.parse(event.ts) <= until);
  for (const event of prepareEvents(seen)) {
    if (event.kind === "review" || event.kind === "practice")
      lastStudyAt = Date.parse(event.ts);
  }
  if (lastStudyAt === null)
    return { lastStudyAt, daysAway: null, returning: false };
  const calendar = createCalendar(config.timezone, config.dayStartsAt);
  const daysAway = daysBetween(calendar, lastStudyAt, until);
  return { lastStudyAt, daysAway, returning: daysAway > RETURN_AFTER_DAYS };
};

/**
 * How many sessions of `sessionMinutes` clear `minutes` of reviews: the plan to come back spreads the
 * backlog over days instead of asking for it at once.
 */
export const comebackDays = (minutes: number, sessionMinutes: number): number =>
  Math.max(1, Math.ceil(minutes / Math.max(1, sessionMinutes)));
