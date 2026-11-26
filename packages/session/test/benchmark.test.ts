import type { ReviewEvent } from "@wastech-learn/core";
import { seededRng, type Rating } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import { rate, startSession } from "../src/index.js";
import { CONFIG, HASH, SCHED, contextOf, deckOf } from "./fixtures.js";

// The budgets the app is held to: a whole replay of 50k events over 5k cards under 5 s, the next card
// under 50 ms. Node is the early signal; the browser measurement follows with the app.
const REPLAY_BUDGET_MS = 5_000;
const NEXT_CARD_BUDGET_MS = 50;
const CARDS = 5_000;
const EVENTS = 50_000;

const DAY_MS = 86_400_000;
const START = Date.parse("2026-01-01T08:00:00.000Z");
const NOW = new Date(START + 365 * DAY_MS);

const cardId = (index: number): string => `b${String(index).padStart(7, "0")}`;

/** A year of answers spread over 5k cards, the same on every run. */
const syntheticLog = (): ReviewEvent[] => {
  const random = seededRng(2026);
  return Array.from({ length: EVENTS }, (_, index) => {
    const at = START + Math.floor((index / EVENTS) * 360 * DAY_MS);
    return {
      v: 1,
      id: `01K${String(index).padStart(23, "0")}`,
      ts: new Date(at).toISOString(),
      tz: CONFIG.timezone,
      device: "desk1",
      writer: "web",
      kind: "review",
      item: `${cardId(Math.floor(random() * CARDS))}:main`,
      rating: (1 + Math.floor(random() * 4)) as Rating,
      contentHash: HASH,
      sched: SCHED,
    };
  });
};

describe("session budgets on a large log", () => {
  it("starts within the replay budget and answers within the next-card budget", async () => {
    const context = await contextOf();
    const deck = deckOf(
      Array.from({ length: CARDS }, (_, index) => ({ id: cardId(index) })),
    );
    const events = syntheticLog();
    const started = Date.now();
    let state = startSession(context, {
      deck,
      events,
      mode: { kind: "full" },
      now: NOW,
    });
    expect(Date.now() - started).toBeLessThan(REPLAY_BUDGET_MS);
    const timings: number[] = [];
    for (let index = 0; index < 9 && state.current !== undefined; index++) {
      const before = Date.now();
      state = rate(
        context,
        state,
        { rating: 3 },
        new Date(NOW.getTime() + index * 10_000),
      ).state;
      timings.push(Date.now() - before);
    }
    timings.sort((a, b) => a - b);
    // The median: one slow run on a busy machine says more about the machine than the code.
    expect(timings[Math.floor(timings.length / 2)]).toBeLessThan(
      NEXT_CARD_BUDGET_MS,
    );
  }, 60_000);
});
