import { describe, expect, it } from "vitest";
import {
  buildQueue,
  createScheduler,
  nextEntry,
  replay,
} from "../src/index.js";
import { CONFIG, at, card } from "./fixtures.js";
import { generateLog } from "./log-generator.js";

// NFR budgets: rebuilding the state of 5k cards from 50k events under 5 s, the next card under 50 ms.
const REPLAY_BUDGET_MS = 5_000;
const NEXT_CARD_BUDGET_MS = 50;

const scheduler = await createScheduler(CONFIG);
const log = generateLog(2026, 50_000, 5_000, 365);
const events = log.files.flat();
const cards = log.items.map((item, index) =>
  card(item, { domain: index % 2 === 0 ? "arch" : "lang-pl" }),
);
const NOW = at("2027-01-05T18:00:00.000Z");

describe("performance budgets of replay and the next card", () => {
  it("replays 50k events over 5k cards within the budget", () => {
    expect(events.length).toBeGreaterThanOrEqual(50_000);
    const started = Date.now();
    const state = replay(events, scheduler, CONFIG, NOW);
    const elapsed = Date.now() - started;
    expect(state.items.size).toBeGreaterThan(4_000);
    expect(elapsed).toBeLessThan(REPLAY_BUDGET_MS);
  }, 60_000);

  it("picks the next card from the replayed state within the budget", () => {
    const state = replay(events, scheduler, CONFIG, NOW);
    // The median of several runs: one run on a busy CI machine says more about the machine than the code.
    const timings = Array.from({ length: 5 }, () => {
      const started = Date.now();
      const next = nextEntry(
        buildQueue(state, cards, CONFIG, NOW, { mode: { kind: "full" } }),
      );
      expect(next).toBeDefined();
      return Date.now() - started;
    }).sort((a, b) => a - b);
    expect(timings[2]).toBeLessThan(NEXT_CARD_BUDGET_MS);
  }, 60_000);
});
