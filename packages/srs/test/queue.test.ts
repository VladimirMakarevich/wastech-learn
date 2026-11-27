import { describe, expect, it } from "vitest";
import {
  buildQueue,
  createCalendar,
  createScheduler,
  estimateDurations,
  nextQueueChange,
  replay,
  type QueueCard,
  type ReplayEvent,
  type SrsConfig,
} from "../src/index.js";
import { CONFIG, at, card, review, withLimits } from "./fixtures.js";

const scheduler = await createScheduler(CONFIG);
const DAY = 86_400_000;
const NOW = at("2026-03-10T17:00:00.000Z");
const daysBefore = (days: number, base = NOW): string =>
  new Date(base.getTime() - days * DAY).toISOString();

const queueOf = (
  events: readonly ReplayEvent[],
  cards: readonly QueueCard[],
  config: SrsConfig = CONFIG,
  now = NOW,
  mode: Parameters<typeof buildQueue>[4]["mode"] = { kind: "full" },
) =>
  buildQueue(replay(events, scheduler, config, now), cards, config, now, {
    mode,
  });

describe("buildQueue: order", () => {
  it("puts due learning steps first, then due reviews interleaved by domain, then new cards", () => {
    const cards = [
      card("learn001:main"),
      card("arch0001:main"),
      card("arch0002:main"),
      card("plpl0001:main", { domain: "lang-pl" }),
      ...Array.from({ length: 12 }, (_, index) =>
        card(`new${String(index).padStart(5, "0")}:main`),
      ),
    ];
    const events = [
      review("arch0001:main", daysBefore(10), 3),
      review("arch0002:main", daysBefore(10.5), 3),
      review("plpl0001:main", daysBefore(10), 3),
      review(
        "learn001:main",
        new Date(NOW.getTime() - 15 * 60_000).toISOString(),
        1,
      ),
    ];
    const queue = queueOf(events, cards);
    expect(queue.entries.map((entry) => entry.kind)).toEqual([
      "learning",
      "review",
      "review",
      "review",
      // The learning card was introduced today, so it already used one of the ten new slots.
      ...Array.from({ length: 9 }, () => "new"),
    ]);
    expect(queue.entries[0]?.item).toBe("learn001:main");
    expect(queue.entries.slice(1, 4).map((entry) => entry.domain)).toEqual([
      "arch",
      "lang-pl",
      "arch",
    ]);
    expect(queue.entries.slice(4).map((entry) => entry.item)).toEqual(
      cards.slice(4, 13).map((c) => c.item),
    );
  });

  it("leaves out suspended items, a suspended leech among them, drafts and retired cards", () => {
    const cards = [
      card("draft001:main", { status: "draft" }),
      card("retire01:main", { status: "retired" }),
      card("susp0001:main"),
      card("leech001:main"),
    ];
    const events: ReplayEvent[] = [
      review("susp0001:main", daysBefore(10), 3),
      { id: "S1", ts: daysBefore(9), kind: "suspend", item: "susp0001:main" },
      review("leech001:main", daysBefore(10), 3),
      review("leech001:main", daysBefore(5), 1),
      { id: "S2", ts: daysBefore(5), kind: "suspend", item: "leech001:main" },
    ];
    const queue = queueOf(events, cards, { ...CONFIG, leechThreshold: 1 });
    expect(queue.entries).toEqual([]);
  });

  it("brings a leech back once it is unsuspended after a rewrite, still flagged as a leech", () => {
    const cards = [card("leech001:main")];
    const config = { ...CONFIG, leechThreshold: 1 };
    const events: ReplayEvent[] = [
      review("leech001:main", daysBefore(10), 3),
      review("leech001:main", daysBefore(5), 1),
      { id: "S2", ts: daysBefore(5), kind: "suspend", item: "leech001:main" },
      {
        id: "U2",
        ts: daysBefore(1),
        kind: "unsuspend",
        item: "leech001:main",
      },
    ];
    const state = replay(events, scheduler, config, NOW);
    expect(state.items.get("leech001:main")).toMatchObject({
      leech: true,
      suspended: false,
    });
    expect(
      queueOf(events, cards, config).entries.map((entry) => entry.item),
    ).toEqual(["leech001:main"]);
  });
});

describe("buildQueue: siblings", () => {
  it("takes one variant of a card and one card of an idea per day", () => {
    const cards = [
      card("vocab001:fwd", { cardId: "vocab001", type: "vocab" }),
      card("vocab001:rev", { cardId: "vocab001", type: "vocab" }),
      card("ideaaaa1:main", { idea: "flow" }),
      card("ideaaaa2:main", { idea: "flow" }),
    ];
    const events = cards.map((c) => review(c.item, daysBefore(10), 3));
    const items = queueOf(events, cards).entries.map((entry) => entry.item);
    expect(items).toHaveLength(2);
    expect(items.filter((item) => item.startsWith("vocab001"))).toHaveLength(1);
    expect(items.filter((item) => item.startsWith("ideaaaa"))).toHaveLength(1);
  });

  it("buries a sibling of an item already reviewed today", () => {
    const cards = [
      card("vocab001:fwd", { cardId: "vocab001" }),
      card("vocab001:rev", { cardId: "vocab001" }),
    ];
    const events = [
      review("vocab001:fwd", daysBefore(10), 3),
      review("vocab001:rev", daysBefore(10), 3),
      review(
        "vocab001:fwd",
        new Date(NOW.getTime() - 3_600_000).toISOString(),
        3,
      ),
    ];
    expect(queueOf(events, cards).entries).toEqual([]);
  });
});

describe("buildQueue: backlog policy", () => {
  const config = withLimits(4, 5);
  const cards = [
    ...Array.from({ length: 12 }, (_, index) =>
      card(`old${String(index).padStart(5, "0")}:main`),
    ),
    ...Array.from({ length: 10 }, (_, index) =>
      card(`new${String(index).padStart(5, "0")}:main`),
    ),
  ];
  const start = at("2026-03-01T17:00:00.000Z");
  const learned = cards
    .slice(0, 12)
    .map((c) => review(c.item, start.toISOString(), 3));
  const newCount = (events: readonly ReplayEvent[], now: Date) =>
    queueOf(events, cards, config, now).entries.filter(
      (entry) => entry.kind === "new",
    ).length;
  const dayAfterStart = (days: number) =>
    new Date(start.getTime() + days * DAY);

  it("pauses new cards while the backlog is over twice the daily limit", () => {
    const queue = queueOf(learned, cards, config, dayAfterStart(10));
    expect(queue.backlog).toBe(12);
    expect(queue.policies).toMatchObject([
      { domain: "arch", paused: true, newLimit: 0 },
    ]);
    expect(newCount(learned, dayAfterStart(10))).toBe(0);
  });

  it("brings new cards back at half rate for three days once the backlog is under the limit", () => {
    const cleared = [
      ...learned,
      ...cards
        .slice(0, 10)
        .map((c) => review(c.item, dayAfterStart(10).toISOString(), 3)),
    ];
    expect(newCount(cleared, dayAfterStart(11))).toBe(2);
    expect(newCount(cleared, dayAfterStart(13))).toBe(2);
    expect(newCount(cleared, dayAfterStart(14))).toBe(4);
  });

  it("keeps new cards at full rate when there was no pause", () => {
    expect(newCount([], start)).toBe(4);
  });
});

describe("buildQueue: minutes mode", () => {
  it("fills five minutes by estimate without new cards, finishing the card that crosses the limit", () => {
    const cards = [
      ...Array.from({ length: 100 }, (_, index) =>
        card(`due${String(index).padStart(5, "0")}:main`),
      ),
      card("fresh001:main"),
    ];
    const events = cards
      .slice(0, 100)
      .map((c) => review(c.item, daysBefore(10), 3));
    const queue = queueOf(events, cards, CONFIG, NOW, {
      kind: "minutes",
      minutes: 5,
    });
    const limit = 5 * 60_000;
    expect(queue.entries.every((entry) => entry.kind !== "new")).toBe(true);
    expect(
      queue.estimateMs - (queue.entries.at(-1)?.estimateMs ?? 0),
    ).toBeLessThan(limit);
    expect(queue.estimateMs).toBeGreaterThanOrEqual(limit);
    expect(queue.entries).toHaveLength(38);
    expect(queue.estimateMinutes).toBe(6);
  });
});

describe("estimateDurations", () => {
  it("uses the defaults until a type has enough timed answers", () => {
    const cards = [
      card("aaaaaaaa:main"),
      card("bbbbbbbb:main", { type: "why" }),
    ];
    const few = Array.from({ length: 3 }, () => ({
      kind: "review",
      item: "aaaaaaaa:main",
      durMs: 2_000,
    }));
    expect(estimateDurations(few, cards).byType.basic).toBe(8_000);
    const many = Array.from({ length: 11 }, (_, index) => ({
      kind: "review",
      item: "bbbbbbbb:main",
      durMs: 10_000 + index * 1_000,
    }));
    expect(estimateDurations(many, cards).byType.why).toBe(15_000);
  });

  it("caps an answer left open for hours at two minutes", () => {
    const cards = [card("aaaaaaaa:main")];
    const samples = Array.from({ length: 10 }, () => ({
      kind: "review",
      item: "aaaaaaaa:main",
      durMs: 9_000_000,
    }));
    expect(estimateDurations(samples, cards).byType.basic).toBe(120_000);
  });
});

describe("nextQueueChange", () => {
  it("is the next study day when nothing is learning", () => {
    const state = replay(
      [review("arch0001:main", daysBefore(1), 3)],
      scheduler,
      CONFIG,
      NOW,
    );
    const today = createCalendar(CONFIG.timezone, CONFIG.dayStartsAt).dayOf(
      NOW.getTime(),
    );
    expect(nextQueueChange(state, CONFIG, NOW)).toBe(today.end);
  });

  it("is the moment a learning step comes due when that is sooner", () => {
    const events = [
      review(
        "learn001:main",
        new Date(NOW.getTime() - 20_000).toISOString(),
        1,
      ),
    ];
    const state = replay(events, scheduler, CONFIG, NOW);
    const step = state.items.get("learn001:main")?.dueAt;
    expect(step).toBeGreaterThan(NOW.getTime());
    expect(nextQueueChange(state, CONFIG, NOW)).toBe(step);
  });
});
