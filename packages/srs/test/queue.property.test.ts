import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  buildQueue,
  createScheduler,
  replay,
  snapshot,
  type QueueCard,
  type Rating,
  type ReplayEvent,
  type ReplayEventKind,
} from "../src/index.js";
import { at, card, withLimits } from "./fixtures.js";

const config = withLimits(3, 4);
const scheduler = await createScheduler(config);
const START = Date.parse("2026-02-01T08:00:00.000Z");
const NOW = at("2026-02-20T18:00:00.000Z");

// Variants of one card, cards sharing an idea and two domains: every sibling rule has something to bite on.
const CARDS: readonly QueueCard[] = [
  card("aaaaaaa1:fwd", { cardId: "aaaaaaa1", type: "vocab" }),
  card("aaaaaaa1:rev", { cardId: "aaaaaaa1", type: "vocab" }),
  card("bbbbbbb1:main", { idea: "flow" }),
  card("bbbbbbb2:main", { idea: "flow" }),
  card("ccccccc1:c1", { cardId: "ccccccc1", type: "cloze" }),
  card("ccccccc1:c2", { cardId: "ccccccc1", type: "cloze" }),
  ...Array.from({ length: 6 }, (_, index) =>
    card(`ddddddd${String(index)}:main`),
  ),
  ...Array.from({ length: 6 }, (_, index) =>
    card(`eeeeeee${String(index)}:main`, { domain: "lang-pl" }),
  ),
];

const KINDS: readonly ReplayEventKind[] = [
  "review",
  "review",
  "review",
  "review",
  "practice",
  "suspend",
  "unsuspend",
  "reset",
  "manual_due",
];

const eventArbitrary = fc.record({
  item: fc.nat({ max: CARDS.length - 1 }),
  minutes: fc.nat({ max: 19 * 24 * 60 }),
  kind: fc.nat({ max: KINDS.length - 1 }),
  rating: fc.integer({ min: 1, max: 4 }),
  dueDays: fc.nat({ max: 10 }),
});

type RawEvent = typeof eventArbitrary extends fc.Arbitrary<infer T> ? T : never;

const toEvents = (raw: readonly RawEvent[]) =>
  raw.map((entry, index): ReplayEvent => {
    const ts = new Date(START + entry.minutes * 60_000).toISOString();
    const kind = KINDS[entry.kind] ?? "review";
    const base = {
      id: `01J${String(index).padStart(8, "0")}`,
      ts,
      kind,
      item: CARDS[entry.item]!.item,
    };
    if (kind === "review" || kind === "practice")
      return { ...base, rating: entry.rating as Rating };
    if (kind === "manual_due")
      return {
        ...base,
        due: new Date(
          Date.parse(ts) + entry.dueDays * 86_400_000,
        ).toISOString(),
      };
    return base;
  });

const siblingKeys = (queueCard: QueueCard): string[] =>
  queueCard.idea === undefined
    ? [`card:${queueCard.cardId}`]
    : [
        `card:${queueCard.cardId}`,
        `idea:${queueCard.domain}/${queueCard.idea}`,
      ];

const logs = fc.array(eventArbitrary, { maxLength: 80 }).map(toEvents);
// A fixed seed keeps the suite deterministic; widen the search locally by changing it, never by dropping it.
const RUNS = { numRuns: 150, seed: 20_261_126 } as const;
const byItem = new Map(CARDS.map((queueCard) => [queueCard.item, queueCard]));

describe("queue properties for any log", () => {
  it("respects the daily limits per domain", () => {
    fc.assert(
      fc.property(logs, (events) => {
        const queue = buildQueue(
          replay(events, scheduler, config, NOW),
          CARDS,
          config,
          NOW,
          { mode: { kind: "full" } },
        );
        for (const domain of ["arch", "lang-pl"]) {
          const inDomain = queue.entries.filter(
            (entry) => entry.domain === domain,
          );
          expect(
            inDomain.filter((entry) => entry.kind === "review").length,
          ).toBeLessThanOrEqual(4);
          expect(
            inDomain.filter((entry) => entry.kind === "new").length,
          ).toBeLessThanOrEqual(3);
        }
      }),
      RUNS,
    );
  });

  it("never puts siblings on the same day", () => {
    fc.assert(
      fc.property(logs, (events) => {
        const state = replay(events, scheduler, config, NOW);
        const queue = buildQueue(state, CARDS, config, NOW, {
          mode: { kind: "full" },
        });
        const keys = queue.entries.flatMap((entry) =>
          siblingKeys(byItem.get(entry.item)!),
        );
        expect(new Set(keys).size).toBe(keys.length);
        const reviewedToday = [...state.items.values()].filter(
          (item) =>
            item.lastReviewAt !== null && item.lastReviewAt >= queue.day.start,
        );
        for (const entry of queue.entries.filter(
          (e) => e.kind !== "learning",
        )) {
          const entryKeys = siblingKeys(byItem.get(entry.item)!);
          for (const other of reviewedToday) {
            if (other.item === entry.item) continue;
            const otherCard = byItem.get(other.item);
            if (otherCard === undefined) continue;
            expect(
              siblingKeys(otherCard).some((key) => entryKeys.includes(key)),
            ).toBe(false);
          }
        }
      }),
      RUNS,
    );
  });

  it("puts every due learning step before reviews and new cards", () => {
    fc.assert(
      fc.property(logs, (events) => {
        const queue = buildQueue(
          replay(events, scheduler, config, NOW),
          CARDS,
          config,
          NOW,
          { mode: { kind: "full" } },
        );
        const kinds = queue.entries.map((entry) => entry.kind);
        const lastLearning = kinds.lastIndexOf("learning");
        const firstOther = kinds.findIndex((kind) => kind !== "learning");
        expect(
          lastLearning === -1 || firstOther === -1 || lastLearning < firstOther,
        ).toBe(true);
      }),
      RUNS,
    );
  });

  it("returns to the previous snapshot when the last event is undone", () => {
    fc.assert(
      fc.property(
        logs,
        fc.nat({ max: CARDS.length - 1 }),
        fc.integer({ min: 1, max: 4 }),
        (events, item, rating) => {
          const before = snapshot(replay(events, scheduler, config, NOW));
          const extra: ReplayEvent = {
            id: "01JZZZZZZZZZ1",
            ts: "2026-02-20T17:00:00.000Z",
            kind: "review",
            item: CARDS[item]!.item,
            rating: rating as Rating,
          };
          const undo: ReplayEvent = {
            id: "01JZZZZZZZZZ2",
            ts: "2026-02-20T17:00:05.000Z",
            kind: "undo",
            item: extra.item,
            target: extra.id,
          };
          expect(
            snapshot(replay([...events, extra, undo], scheduler, config, NOW)),
          ).toBe(before);
        },
      ),
      RUNS,
    );
  });
});
