import { DefaultScheduler, Rating } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { SrsError, createScheduler, replay, snapshot } from "../src/index.js";
import { CONFIG, at, event, review } from "./fixtures.js";

const scheduler = await createScheduler(CONFIG);
const ITEM = "7k2m9xqd:main";

describe("replay against ts-fsrs", () => {
  it("matches direct ts-fsrs calls for Good, Good, Again and lands in relearning", async () => {
    const times = [
      "2026-01-01T10:00:00.000Z",
      "2026-01-04T10:00:00.000Z",
      "2026-01-20T10:00:00.000Z",
    ];
    const state = replay(
      [
        review(ITEM, times[0]!, 3),
        review(ITEM, times[1]!, 3),
        review(ITEM, times[2]!, 1),
      ],
      scheduler,
      CONFIG,
      at("2026-01-20T10:05:00.000Z"),
    );

    const direct = await DefaultScheduler({
      version: "FSRS-7",
      desiredRetention: 0.9,
      maximumInterval: 365,
      learningSteps: ["1m", "10m"],
      relearningSteps: ["10m"],
      allowModelOverride: true,
      graduatingInterval: 1,
      enableShortTerm: true,
      enableFuzz: true,
    });
    let card = direct.newCard({ now: at(times[0]!), cardId: ITEM });
    for (const [index, grade] of [
      Rating.Good,
      Rating.Good,
      Rating.Again,
    ].entries()) {
      card = direct.review({ card, grade, now: at(times[index]!) }).card;
    }

    const item = state.items.get(ITEM)!;
    expect(item.lapses).toBe(1);
    expect(item.phase).toBe("relearning");
    expect(item.dueAt).toBe(card.dueAt.getTime());
    expect(item.stability).toBe(card.stability);
    expect(item.difficulty).toBe(card.difficulty);
    // The relearning step is 10 minutes unless the model asks for longer.
    expect(item.dueAt! - Date.parse(times[2]!)).toBeGreaterThanOrEqual(
      10 * 60_000,
    );
  });

  it("marks a leech once lapses reach the threshold", () => {
    const config = { ...CONFIG, leechThreshold: 2 };
    const events = [
      review(ITEM, "2026-01-01T10:00:00Z", 3),
      review(ITEM, "2026-01-05T10:00:00Z", 1),
      review(ITEM, "2026-01-05T10:20:00Z", 3),
      review(ITEM, "2026-01-10T10:00:00Z", 1),
    ];
    const before = replay(
      events.slice(0, 2),
      scheduler,
      config,
      at("2026-01-06T00:00:00Z"),
    );
    expect(before.items.get(ITEM)).toMatchObject({ lapses: 1, leech: false });
    const after = replay(events, scheduler, config, at("2026-01-11T00:00:00Z"));
    expect(after.items.get(ITEM)).toMatchObject({ lapses: 2, leech: true });
  });
});

describe("replay: event semantics", () => {
  const base = [
    review(ITEM, "2026-01-01T10:00:00Z", 3),
    review(ITEM, "2026-01-04T10:00:00Z", 3),
  ];
  const now = at("2026-02-01T00:00:00Z");
  const itemAfter = (extra: ReturnType<typeof event>[]) =>
    replay([...base, ...extra], scheduler, CONFIG, now).items.get(ITEM)!;

  it("resets the memory and the statistics on reset", () => {
    const item = itemAfter([event("reset", ITEM, "2026-01-10T10:00:00Z")]);
    expect(item).toMatchObject({
      phase: "new",
      reps: 0,
      lapses: 0,
      dueAt: null,
      introducedAt: null,
    });
  });

  it("flags a suspended item without touching its memory, and clears the flag on unsuspend", () => {
    const plain = itemAfter([]);
    const suspended = itemAfter([
      event("suspend", ITEM, "2026-01-10T10:00:00Z"),
    ]);
    expect(suspended.suspended).toBe(true);
    expect({ ...suspended, suspended: false }).toEqual(plain);
    const back = itemAfter([
      event("suspend", ITEM, "2026-01-10T10:00:00Z"),
      event("unsuspend", ITEM, "2026-01-11T10:00:00Z"),
    ]);
    expect(back).toEqual(plain);
  });

  it("moves the due date on manual_due and keeps the memory", () => {
    const plain = itemAfter([]);
    const moved = itemAfter([
      event("manual_due", ITEM, "2026-01-10T10:00:00Z", {
        due: "2026-03-01T00:00:00.000Z",
      }),
    ]);
    expect(moved.dueAt).toBe(Date.parse("2026-03-01T00:00:00.000Z"));
    expect(moved.stability).toBe(plain.stability);
    expect(moved.reps).toBe(plain.reps);
  });

  it("ignores practice", () => {
    expect(
      itemAfter([
        event("practice", ITEM, "2026-01-10T10:00:00Z", { rating: 1 }),
      ]),
    ).toEqual(itemAfter([]));
  });

  it("leaves out an undone review", () => {
    const extra = review(ITEM, "2026-01-10T10:00:00Z", 1);
    const undo = event("undo", ITEM, "2026-01-10T10:00:05Z", {
      target: extra.id,
    });
    expect(itemAfter([extra, undo])).toEqual(itemAfter([]));
  });

  it("ignores events after now", () => {
    const state = replay(
      [...base, review(ITEM, "2026-03-01T10:00:00Z", 1)],
      scheduler,
      CONFIG,
      now,
    );
    expect(state.items.get(ITEM)).toEqual(itemAfter([]));
  });

  it("keeps the state of an item whose card no longer exists", () => {
    const state = replay(
      [review("deadbeef:main", "2026-01-01T10:00:00Z", 3)],
      scheduler,
      CONFIG,
      now,
    );
    expect(snapshot(state)).toContain("deadbeef:main");
  });
});

describe("createScheduler", () => {
  it("refuses a config that names another ts-fsrs version", async () => {
    const config = {
      ...CONFIG,
      srs: { ...CONFIG.srs, scheduler: "ts-fsrs@5.2.0" },
    };
    await expect(createScheduler(config)).rejects.toBeInstanceOf(SrsError);
  });

  it("records the scheduler and model in sched", () => {
    expect(scheduler.sched).toBe("ts-fsrs@6.0.1/FSRS-7");
  });
});
