import { loadForecast } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import { rate, startSession, summarize } from "../src/index.js";
import {
  CONFIG,
  NOW,
  at,
  cardIds,
  contextOf,
  deckOf,
  pastReview,
  ulid,
} from "./fixtures.js";

const MINUTE = 60_000;

describe("session summary", () => {
  it("counts answers, minutes, review-phase recall, sure-but-forgotten items and tomorrow", async () => {
    const context = await contextOf();
    const ids = cardIds(4);
    let state = startSession(context, {
      deck: deckOf([...ids.map((id) => ({ id })), { id: "n0000001" }]),
      events: ids.map((id, index) =>
        pastReview(`${id}:main`, at(-40), 3, ulid(index)),
      ),
      mode: { kind: "full" },
      now: NOW,
    });
    const order = [
      state.current!.item,
      ...state.queue.map((entry) => entry.item),
    ];
    const choices = [
      { rating: 1, confidence: 3 },
      { rating: 3, confidence: 3 },
      { rating: 2 },
      { rating: 1, confidence: 2 },
      { rating: 3 },
    ] as const;
    choices.forEach((choice, index) => {
      state = rate(
        context,
        state,
        choice,
        new Date(NOW.getTime() + index * MINUTE),
      ).state;
    });
    const end = new Date(NOW.getTime() + 7 * MINUTE + 20_000);
    const summary = summarize(context, state, end);
    expect(summary.reviewed).toBe(5);
    expect(summary.minutes).toBe(7);
    // Four review-phase answers (the new card's first answer is not one), two of them recalled.
    expect(summary.retention).toEqual({ passed: 2, total: 4, rate: 0.5 });
    expect(summary.confidentMisses).toEqual([order[0]]);
    expect(summary.tomorrow).toEqual(
      loadForecast(state.log.state, state.deck.cards, CONFIG, end, 2)[1],
    );
  });

  it("is empty but calm before any answer", async () => {
    const context = await contextOf();
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events: [],
      mode: { kind: "full" },
      now: NOW,
    });
    expect(summarize(context, state, NOW)).toMatchObject({
      reviewed: 0,
      minutes: 0,
      retention: { passed: 0, total: 0, rate: null },
      confidentMisses: [],
    });
  });
});
