import { toReplayEvents } from "@wastech-learn/session";
import {
  loadForecast,
  reviewRecords,
  studyDaysWindow,
  trueRetention,
  type RetentionCount,
} from "@wastech-learn/srs";
import type { LibrarySnapshot } from "../../data/snapshot";

export interface ForecastBar {
  readonly key: string;
  readonly due: number;
  readonly today: boolean;
  readonly weekend: boolean;
}

export interface StatsModel {
  readonly forecast: readonly ForecastBar[];
  readonly max: number;
  readonly average: number;
  readonly young: {
    readonly week: RetentionCount;
    readonly month: RetentionCount;
  };
  readonly mature: {
    readonly week: RetentionCount;
    readonly month: RetentionCount;
  };
  readonly target: number;
}

const FORECAST_DAYS = 30;

// A study day is named by its local date; noon of that date is safely inside it in every zone.
const isWeekend = (key: string): boolean => {
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
};

/**
 * What Stats shows, from the log alone: true retention of young and mature items over the last 7 and 30
 * study days, and the due load of the next 30 days. No streaks, no activity heatmap.
 */
export const statsModel = (snapshot: LibrarySnapshot): StatsModel => {
  const { context, now, state, deck, estimates } = snapshot;
  const { config, scheduler } = context;
  const records = reviewRecords(
    toReplayEvents(snapshot.events),
    scheduler,
    config,
    now,
  );
  const week = studyDaysWindow(config, now, 7);
  const month = studyDaysWindow(config, now, 30);
  const weekly = trueRetention(records, week);
  const monthly = trueRetention(records, month);
  const days = loadForecast(
    state,
    deck.cards,
    config,
    now,
    FORECAST_DAYS,
    estimates,
  );
  return {
    forecast: days.map((day, index) => ({
      key: day.day.key,
      due: day.due,
      today: index === 0,
      weekend: isWeekend(day.day.key),
    })),
    max: Math.max(0, ...days.map((day) => day.due)),
    average: Math.round(
      days.reduce((sum, day) => sum + day.due, 0) / FORECAST_DAYS,
    ),
    young: { week: weekly.young, month: monthly.young },
    mature: { week: weekly.mature, month: monthly.mature },
    target: config.srs.desiredRetention,
  };
};
