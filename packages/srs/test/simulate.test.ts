import { describe, expect, it } from "vitest";
import {
  BACKLOG_ORDERS,
  DEFAULT_BACKLOG_ORDER,
  DEFAULT_SIMULATION,
  TARGET_DAYS,
  compareBacklogOrders,
  createScheduler,
  simulate,
  syntheticDeck,
} from "../src/index.js";
import { CONFIG } from "./fixtures.js";

const scheduler = await createScheduler(CONFIG);
const params = { ...DEFAULT_SIMULATION, order: DEFAULT_BACKLOG_ORDER };

describe("backlog simulation", () => {
  it("gives the same report for the same seed", () => {
    expect(simulate(params, CONFIG, scheduler, 7)).toEqual(
      simulate(params, CONFIG, scheduler, 7),
    );
  }, 30_000);

  it("clears a 14-day break in 15-minute sessions within 5 days", () => {
    const report = simulate(params, CONFIG, scheduler, 1);
    expect(report.params).toMatchObject({ breakDays: 14, sessionMinutes: 15 });
    expect(report.backlogAtReturn).toBeGreaterThan(0);
    expect(report.clearedAfterDays).not.toBeNull();
    expect(report.clearedAfterDays!).toBeLessThanOrEqual(TARGET_DAYS);
    const recovery = report.days.filter((day) => day.phase === "recovery");
    for (const day of recovery) {
      expect(day.newCards).toBe(0);
      // A session finishes the card on screen, so it may run over by one answer, never by a whole card list.
      expect(day.minutes).toBeLessThanOrEqual(15 + 1);
    }
  }, 30_000);

  it("compares every backlog order on the same history", () => {
    const comparison = compareBacklogOrders(
      DEFAULT_SIMULATION,
      CONFIG,
      scheduler,
      [1],
      BACKLOG_ORDERS,
    );
    expect(comparison.summaries.map((summary) => summary.order)).toEqual([
      ...BACKLOG_ORDERS,
    ]);
    const returns = new Set(
      comparison.reports.map((report) => report.backlogAtReturn),
    );
    expect(returns.size).toBe(1);
  }, 60_000);

  it("builds a deck with the golden sample's mix of types and variants", () => {
    const deck = syntheticDeck(30);
    expect(new Set(deck.map((card) => card.cardId)).size).toBe(30);
    expect(deck.filter((card) => card.item.endsWith(":rev"))).toHaveLength(12);
    expect(new Set(deck.map((card) => card.domain))).toEqual(
      new Set(["architecture", "dotnet", "lang-pl"]),
    );
  });
});
