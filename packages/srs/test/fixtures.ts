import type {
  QueueCard,
  Rating,
  ReplayEvent,
  ReplayEventKind,
  SrsConfig,
} from "../src/index.js";

/** The golden sample's learn.config.json after parsing, written out: srs tests never read files. */
export const CONFIG: SrsConfig = {
  timezone: "Europe/Warsaw",
  dayStartsAt: "04:00",
  srs: {
    scheduler: "ts-fsrs@6.0.1",
    model: "FSRS-7",
    desiredRetention: 0.9,
    maxIntervalDays: 365,
    learningSteps: ["1m", "10m"],
    relearningSteps: ["10m"],
    allowModelOverride: true,
    graduatingIntervalDays: 1,
    fuzz: true,
    weights: null,
  },
  limits: {
    default: { newPerDay: 10, reviewsPerDay: 150 },
    domains: { "lang-pl": { newPerDay: 10, reviewsPerDay: 150 } },
    sessionMinutes: 15,
    pauseNewWhenBacklogOver: 2,
  },
  leechThreshold: 8,
};

export const withLimits = (
  newPerDay: number,
  reviewsPerDay: number,
): SrsConfig => ({
  ...CONFIG,
  limits: {
    ...CONFIG.limits,
    default: { newPerDay, reviewsPerDay },
    domains: {},
  },
});

let sequence = 0;

/** A log event with a unique id; ids sort in creation order, as ULIDs do. */
export const event = (
  kind: ReplayEventKind,
  item: string,
  ts: string,
  extra: { rating?: Rating; target?: string; due?: string; id?: string } = {},
): ReplayEvent => ({
  id: extra.id ?? `E${String(++sequence).padStart(8, "0")}`,
  ts,
  kind,
  item,
  ...(extra.rating === undefined ? {} : { rating: extra.rating }),
  ...(extra.target === undefined ? {} : { target: extra.target }),
  ...(extra.due === undefined ? {} : { due: extra.due }),
});

export const review = (item: string, ts: string, rating: Rating): ReplayEvent =>
  event("review", item, ts, { rating });

export const card = (
  item: string,
  overrides: Partial<Omit<QueueCard, "item">> = {},
): QueueCard => ({
  item,
  cardId: item.split(":")[0] ?? item,
  domain: "arch",
  type: "basic",
  status: "active",
  ...overrides,
});

export const at = (iso: string): Date => new Date(iso);
