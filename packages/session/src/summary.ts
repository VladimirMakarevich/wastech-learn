import {
  loadForecast,
  trueRetention,
  type ForecastDay,
  type RetentionCount,
} from "@wastech-learn/srs";
import type { SessionContext, SessionState } from "./engine.js";

/** What the end screen shows: what was done, how recall went, and what tomorrow holds. No streaks. */
export interface SessionSummary {
  readonly reviewed: number;
  /** Whole minutes from the start to `now`; at least one once anything was answered. */
  readonly minutes: number;
  /** Answers given in the review phase, young and mature together. */
  readonly retention: RetentionCount;
  /** Items forgotten although the learner was sure: candidates for a card that tells the two apart. */
  readonly confidentMisses: readonly string[];
  readonly tomorrow: ForecastDay | undefined;
}

const MINUTE_MS = 60_000;

export const summarize = (
  context: SessionContext,
  state: SessionState,
  now: Date,
): SessionSummary => {
  const reviewed = state.answers.length;
  const { young, mature } = trueRetention(
    state.answers.map((answer) => ({
      item: answer.entry.item,
      at: answer.at,
      rating: answer.rating,
      phase: answer.phase,
      scheduledDays: answer.scheduledDays,
    })),
    { from: state.startedAt, until: now.getTime() },
  );
  const passed = young.passed + mature.passed;
  const total = young.total + mature.total;
  const misses = state.answers
    .filter((answer) => answer.rating === 1 && answer.confidence === 3)
    .map((answer) => answer.entry.item);
  const [, tomorrow] = loadForecast(
    state.log.state,
    state.deck.cards,
    context.config,
    now,
    2,
  );
  return {
    reviewed,
    minutes:
      reviewed === 0
        ? 0
        : Math.max(
            1,
            Math.round((now.getTime() - state.startedAt) / MINUTE_MS),
          ),
    retention: { passed, total, rate: total === 0 ? null : passed / total },
    confidentMisses: [...new Set(misses)],
    tomorrow,
  };
};
