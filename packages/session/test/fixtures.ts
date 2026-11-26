import { seededRng, type SrsConfig } from "@wastech-learn/srs";
import type { EventOrigin } from "../src/index.js";

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
