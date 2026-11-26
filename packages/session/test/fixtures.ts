import type { ReviewEvent } from "@wastech-learn/core";
import {
  createScheduler,
  seededRng,
  type QueueCard,
  type Rating,
  type SrsConfig,
} from "@wastech-learn/srs";
import type { EventOrigin, SessionContext, SessionDeck } from "../src/index.js";

/** The golden sample's scheduling settings, written out: session tests never read files. */
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
    domains: {},
    sessionMinutes: 15,
    pauseNewWhenBacklogOver: 2,
  },
  leechThreshold: 8,
};

export const SCHED = "ts-fsrs@6.0.1/FSRS-7";

/** A web writer on one device with a seeded source, so every run draws the same event ids. */
export const origin = (seed = 7): EventOrigin => ({
  device: "desk1",
  writer: "web",
  timezone: CONFIG.timezone,
  sched: SCHED,
  random: seededRng(seed),
});

export const NOW = new Date("2026-11-26T09:00:00.000Z");
export const DAY_MS = 86_400_000;
export const at = (days: number, base = NOW): Date =>
  new Date(base.getTime() + days * DAY_MS);

export const HASH = `sha256:${"a".repeat(64)}`;

export interface CardSpec {
  readonly id: string;
  readonly variants?: readonly string[];
  readonly domain?: string;
  readonly type?: string;
  readonly status?: string;
  readonly idea?: string;
  readonly hash?: string;
}

/** A deck in introduction order, the way deckFromBundle hands it to a session. */
export const deckOf = (specs: readonly CardSpec[]): SessionDeck => {
  const cards: QueueCard[] = specs.flatMap((spec) =>
    (spec.variants ?? ["main"]).map((variant) => ({
      item: `${spec.id}:${variant}`,
      cardId: spec.id,
      idea: spec.idea,
      domain: spec.domain ?? "arch",
      type: spec.type ?? "basic",
      status: spec.status ?? "active",
    })),
  );
  return {
    cards,
    byItem: new Map(cards.map((card) => [card.item, card])),
    contentHash: new Map(specs.map((spec) => [spec.id, spec.hash ?? HASH])),
  };
};

/** Card ids `c0000001`, `c0000002`, …: valid ids, in introduction order. */
export const cardIds = (count: number, prefix = "c"): string[] =>
  Array.from(
    { length: count },
    (_, index) => `${prefix}${String(index + 1).padStart(7, "0")}`,
  );

export const contextOf = async (
  config: SrsConfig = CONFIG,
  seed = 7,
): Promise<SessionContext> => ({
  scheduler: await createScheduler(config),
  config,
  origin: origin(seed),
});

/** A past answer as the log holds it, written by another device. */
export const pastReview = (
  item: string,
  when: Date,
  rating: Rating,
  id: string,
): ReviewEvent => ({
  v: 1,
  id,
  ts: when.toISOString(),
  tz: CONFIG.timezone,
  device: "laptop",
  writer: "mcp",
  kind: "review",
  item,
  rating,
  aiSuggested: null,
  grader: "self",
  confidence: null,
  contentHash: HASH,
  sched: SCHED,
});

/** ULID-shaped ids that sort in creation order. */
export const ulid = (index: number): string =>
  `01K${String(index).padStart(23, "0")}`;
