import { parseReviewEvent, type ReviewEvent } from "@wastech-learn/core";
import {
  buildQueue,
  estimateDurations,
  replay,
  snapshot,
} from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import {
  bury,
  isChanged,
  previewCurrent,
  previewIntervals,
  progress,
  rate,
  refresh,
  reset,
  startSession,
  suspend,
  undo,
  type SessionState,
} from "../src/index.js";
import {
  CONFIG,
  DAY_MS,
  HASH,
  NOW,
  at,
  cardIds,
  contextOf,
  deckOf,
  pastReview,
  ulid,
} from "./fixtures.js";

const MINUTE = 60_000;
const later = (ms: number, base = NOW): Date => new Date(base.getTime() + ms);

/** Cards answered Good 40 days ago, scheduled for a few days: overdue now, so the queue holds reviews. */
const reviewedLog = (ids: readonly string[]): ReviewEvent[] =>
  ids.map((id, index) => pastReview(`${id}:main`, at(-40), 3, ulid(index)));

const valid = (events: readonly ReviewEvent[]): void => {
  for (const event of events)
    expect(parseReviewEvent(JSON.parse(JSON.stringify(event))).ok).toBe(true);
};

const items = (state: SessionState): string[] => [
  ...(state.current === undefined ? [] : [state.current.item]),
  ...state.queue.map((entry) => entry.item),
];

describe("starting a session", () => {
  it("asks in the order srs builds the day's queue", async () => {
    const context = await contextOf();
    const ids = cardIds(6);
    const deck = deckOf([
      ...ids.slice(0, 3).map((id) => ({ id })),
      ...ids.slice(3).map((id) => ({ id, domain: "lang-pl" })),
      { id: "n0000001" },
    ]);
    const events = reviewedLog(ids);
    const state = startSession(context, {
      deck,
      events,
      mode: { kind: "full" },
      now: NOW,
    });
    const expected = buildQueue(
      replay(events, context.scheduler, CONFIG, NOW),
      deck.cards,
      CONFIG,
      NOW,
      {
        mode: { kind: "full" },
        estimates: estimateDurations(events, deck.cards),
      },
    ).entries.map((entry) => entry.item);
    expect(items(state)).toEqual(expected);
    expect(expected).toContain("n0000001:main");
    expect(progress(state)).toEqual({ done: 0, total: expected.length });
  });

  it("five minutes take no new cards and stop at the estimate", async () => {
    const context = await contextOf();
    const ids = cardIds(80);
    const deck = deckOf([
      ...ids.map((id) => ({ id })),
      { id: "n0000001" },
      { id: "n0000002" },
    ]);
    const state = startSession(context, {
      deck,
      events: reviewedLog(ids),
      mode: { kind: "minutes", minutes: 5 },
      now: NOW,
    });
    // 8 s per basic card: 300 s of budget hold 38 cards, the 38th crossing the line.
    expect(items(state)).toHaveLength(38);
    expect(items(state).some((item) => item.startsWith("n"))).toBe(false);
  });
});

describe("rating", () => {
  it("writes a review with the answer time, content hash, scheduler and confidence", async () => {
    const context = await contextOf();
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001", hash: `sha256:${"b".repeat(64)}` }]),
      events: [],
      mode: { kind: "full" },
      now: NOW,
    });
    const { events } = rate(
      context,
      state,
      { rating: 3, confidence: 2, durMs: 8400 },
      later(9000),
    );
    valid(events);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "review",
      item: "c0000001:main",
      rating: 3,
      confidence: 2,
      durMs: 8400,
      contentHash: `sha256:${"b".repeat(64)}`,
      sched: "ts-fsrs@6.0.1/FSRS-7",
      writer: "web",
      device: "desk1",
    });
  });

  it("records a skipped confidence as null", async () => {
    const context = await contextOf();
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events: [],
      mode: { kind: "full" },
      now: NOW,
    });
    const { events } = rate(context, state, { rating: 3 }, NOW);
    expect(events[0]?.confidence).toBeNull();
  });

  it("brings a learning step back once it is due, ahead of the queue", async () => {
    const context = await contextOf();
    const ids = cardIds(3);
    const deck = deckOf([{ id: "n0000001" }, ...ids.map((id) => ({ id }))]);
    let state = startSession(context, {
      deck,
      events: reviewedLog(ids),
      mode: { kind: "full" },
      now: NOW,
    });
    // Reviews come before new cards; answer them, then forget the new card.
    for (let index = 0; index < 3; index++)
      state = rate(context, state, { rating: 3 }, later(index * 1000)).state;
    expect(state.current?.item).toBe("n0000001:main");
    state = rate(context, state, { rating: 1 }, later(5000)).state;
    // Nothing else left: the step due in a minute is shown early instead of ending the session.
    expect(state.current?.item).toBe("n0000001:main");
    expect(progress(state)).toEqual({ done: 4, total: 5 });
  });

  it("puts a due learning step before the rest of the queue", async () => {
    const context = await contextOf();
    const ids = cardIds(4);
    let state = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events: reviewedLog(ids),
      mode: { kind: "full" },
      now: NOW,
    });
    const first = state.current!.item;
    state = rate(context, state, { rating: 1 }, NOW).state;
    expect(state.current?.item).not.toBe(first);
    // Ten minutes later the relearning step is due and jumps the queue.
    state = rate(context, state, { rating: 3 }, later(11 * MINUTE)).state;
    expect(state.current?.item).toBe(first);
  });

  it("five minutes finish the card on screen when time runs out, then stop", async () => {
    const context = await contextOf();
    const ids = cardIds(20);
    let state = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events: reviewedLog(ids),
      mode: { kind: "minutes", minutes: 5 },
      now: NOW,
    });
    state = rate(context, state, { rating: 3 }, later(2 * MINUTE)).state;
    expect(state.current).toBeDefined();
    // The answer that crosses five minutes is still recorded; nothing comes after it.
    const crossing = rate(context, state, { rating: 3 }, later(6 * MINUTE));
    expect(crossing.events).toHaveLength(1);
    expect(crossing.state.current).toBeUndefined();
    expect(
      rate(context, crossing.state, { rating: 3 }, later(7 * MINUTE)).events,
    ).toEqual([]);
  });

  it("the whole queue runs until the day's queue is empty", async () => {
    const context = await contextOf();
    const ids = cardIds(12);
    let state = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events: reviewedLog(ids),
      mode: { kind: "full" },
      now: NOW,
    });
    let answered = 0;
    while (state.current !== undefined) {
      state = rate(context, state, { rating: 4 }, later(answered * 1000)).state;
      answered++;
    }
    expect(answered).toBe(12);
  });

  it("suspends a leech in the same write when the rating reaches the threshold", async () => {
    const config = { ...CONFIG, leechThreshold: 1 };
    const context = await contextOf(config);
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events: reviewedLog(["c0000001"]),
      mode: { kind: "full" },
      now: NOW,
    });
    const lapse = rate(context, state, { rating: 1 }, NOW);
    valid(lapse.events);
    expect(lapse.events.map((event) => event.kind)).toEqual([
      "review",
      "suspend",
    ]);
    expect(lapse.state.current).toBeUndefined();
    expect(lapse.state.log.state.items.get("c0000001:main")?.suspended).toBe(
      true,
    );
  });
});

describe("undo", () => {
  it("cancels the last rating and puts the item back on screen with its earlier schedule", async () => {
    const context = await contextOf();
    const ids = cardIds(3);
    const start = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events: reviewedLog(ids),
      mode: { kind: "full" },
      now: NOW,
    });
    const first = start.current!.item;
    const rated = rate(context, start, { rating: 1 }, NOW);
    const undone = undo(context, rated.state, later(2000));
    valid(undone.events);
    expect(undone.events).toEqual([
      expect.objectContaining({ kind: "undo", target: rated.events[0]!.id }),
    ]);
    expect(undone.state.current?.item).toBe(first);
    expect(items(undone.state)).toEqual(items(start));
    expect(undone.state.answers).toEqual([]);
    // Retrievability is read at the moment of the undo; the schedule itself is the one before the rating.
    expect({
      ...undone.state.log.state.items.get(first),
      retrievability: null,
    }).toEqual({ ...start.log.state.items.get(first), retrievability: null });
  });

  it("takes back the automatic suspend with its rating", async () => {
    const config = { ...CONFIG, leechThreshold: 1 };
    const context = await contextOf(config);
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events: reviewedLog(["c0000001"]),
      mode: { kind: "full" },
      now: NOW,
    });
    const lapse = rate(context, state, { rating: 1 }, NOW);
    const undone = undo(context, lapse.state, NOW);
    expect(undone.events.map((event) => event.target)).toEqual(
      lapse.events.map((event) => event.id),
    );
    expect(undone.state.current?.item).toBe("c0000001:main");
    expect(undone.state.log.state.items.get("c0000001:main")?.suspended).toBe(
      false,
    );
  });

  it("does not show a card twice when the undone card is already back on screen", async () => {
    const context = await contextOf();
    const start = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events: [],
      mode: { kind: "full" },
      now: NOW,
    });
    const forgotten = rate(context, start, { rating: 1 }, NOW);
    expect(forgotten.state.current?.item).toBe("c0000001:main");
    const undone = undo(context, forgotten.state, NOW);
    expect(items(undone.state)).toEqual(["c0000001:main"]);
    expect(progress(undone.state)).toEqual({ done: 0, total: 1 });
  });

  it("does nothing before the first rating", async () => {
    const context = await contextOf();
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events: [],
      mode: { kind: "full" },
      now: NOW,
    });
    expect(undo(context, state, NOW)).toEqual({ state, events: [] });
  });
});

describe("actions on the card on screen", () => {
  it("bury hides every variant of the card until the session ends and writes nothing", async () => {
    const context = await contextOf();
    const state = startSession(context, {
      deck: deckOf([
        { id: "v0000001", variants: ["fwd", "rev"] },
        { id: "c0000001" },
      ]),
      events: [],
      mode: { kind: "full" },
      now: NOW,
    });
    expect(state.current?.cardId).toBe("v0000001");
    const buried = bury(state, NOW);
    expect(items(buried).some((item) => item.startsWith("v0000001"))).toBe(
      false,
    );
    expect(buried.current?.item).toBe("c0000001:main");
  });

  it("suspend writes the event and drops the item from the session", async () => {
    const context = await contextOf();
    const ids = cardIds(2);
    const state = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events: reviewedLog(ids),
      mode: { kind: "full" },
      now: NOW,
    });
    const first = state.current!.item;
    const { state: next, events } = suspend(context, state, NOW);
    valid(events);
    expect(events).toEqual([
      expect.objectContaining({ kind: "suspend", item: first }),
    ]);
    expect(items(next)).not.toContain(first);
  });

  it("reset forgets the item's memory and keeps it on screen as new", async () => {
    const context = await contextOf();
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events: reviewedLog(["c0000001"]),
      mode: { kind: "full" },
      now: NOW,
    });
    const { state: next, events } = reset(context, state, NOW);
    valid(events);
    expect(events[0]?.kind).toBe("reset");
    expect(next.current?.item).toBe("c0000001:main");
    expect(next.log.state.items.get("c0000001:main")?.phase).toBe("new");
  });

  it("flags a card whose hash changed since it was last answered", async () => {
    const context = await contextOf();
    const state = startSession(context, {
      deck: deckOf([
        { id: "c0000001", hash: `sha256:${"c".repeat(64)}` },
        { id: "c0000002" },
        { id: "c0000003" },
      ]),
      events: reviewedLog(["c0000001", "c0000002"]),
      mode: { kind: "full" },
      now: NOW,
    });
    expect(isChanged(state, "c0000001:main")).toBe(true);
    expect(isChanged(state, "c0000002:main")).toBe(false);
    expect(isChanged(state, "c0000003:main")).toBe(false);
    expect(HASH).not.toBe(`sha256:${"c".repeat(64)}`);
  });

  it("previews the buttons of the card on screen from its own history", async () => {
    const context = await contextOf();
    const events = reviewedLog(["c0000001"]);
    const state = startSession(context, {
      deck: deckOf([{ id: "c0000001" }]),
      events,
      mode: { kind: "full" },
      now: NOW,
    });
    expect(previewCurrent(context, state, NOW)).toEqual(
      previewIntervals(events, "c0000001:main", context.scheduler, CONFIG, NOW),
    );
  });
});

describe("external changes", () => {
  it("keep the card on screen and pass over a card that is gone or no longer active", async () => {
    const context = await contextOf();
    const ids = cardIds(3);
    const events = reviewedLog(ids);
    const state = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events,
      mode: { kind: "full" },
      now: NOW,
    });
    const [onScreen, second, third] = items(state);
    const edited = deckOf(
      ids
        .filter((id) => !second!.startsWith(id))
        .map((id) => ({
          id,
          status: third!.startsWith(id) ? "retired" : "active",
        })),
    );
    const next = refresh(context, state, { deck: edited, events }, NOW);
    expect(items(next)).toEqual([onScreen]);
    const gone = refresh(
      context,
      next,
      {
        deck: deckOf(
          ids.filter((id) => !onScreen!.startsWith(id)).map((id) => ({ id })),
        ),
        events,
      },
      NOW,
    );
    expect(gone.current?.item).not.toBe(onScreen);
  });

  it("take in another device's answers: an item answered elsewhere leaves the queue", async () => {
    const context = await contextOf();
    const ids = cardIds(3);
    const events = reviewedLog(ids);
    const state = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events,
      mode: { kind: "full" },
      now: NOW,
    });
    const elsewhere = items(state)[2]!;
    const next = refresh(
      context,
      state,
      {
        deck: state.deck,
        events: [...events, pastReview(elsewhere, NOW, 3, ulid(99))],
      },
      later(1000),
    );
    expect(items(next)).not.toContain(elsewhere);
    expect(next.current?.item).toBe(state.current?.item);
  });
});

describe("incremental replay", () => {
  it("leaves every item exactly as a full replay of the same log does", async () => {
    const context = await contextOf({ ...CONFIG, leechThreshold: 2 });
    const ids = cardIds(6);
    let state = startSession(context, {
      deck: deckOf(ids.map((id) => ({ id }))),
      events: reviewedLog(ids),
      mode: { kind: "full" },
      now: NOW,
    });
    const written: ReviewEvent[] = [...state.log.events];
    const steps = [1, 3, 1, 2, 4, 1, 3] as const;
    steps.forEach((rating, index) => {
      const now = later(index * DAY_MS);
      const step =
        index === 3
          ? undo(context, state, now)
          : rate(context, state, { rating }, now);
      state = step.state;
      written.push(...step.events);
    });
    const end = later(10 * DAY_MS);
    const full = replay(written, context.scheduler, context.config, end);
    for (const [item, memory] of state.log.state.items) {
      expect({ ...memory, retrievability: null }).toEqual({
        ...full.items.get(item),
        retrievability: null,
      });
    }
    expect(state.log.state.items.size).toBe(full.items.size);
  });
});

describe("snapshot after a frozen-time session", () => {
  it("is byte-identical to a full replay", async () => {
    const context = await contextOf();
    const ids = cardIds(4);
    let state = startSession(context, {
      deck: deckOf([...ids.map((id) => ({ id })), { id: "n0000001" }]),
      events: reviewedLog(ids),
      mode: { kind: "full" },
      now: NOW,
    });
    const written: ReviewEvent[] = [...state.log.events];
    for (const rating of [3, 1, 4, 2] as const) {
      const step = rate(context, state, { rating }, NOW);
      state = step.state;
      written.push(...step.events);
    }
    expect(snapshot(state.log.state)).toBe(
      snapshot(replay(written, context.scheduler, context.config, NOW)),
    );
  });
});
