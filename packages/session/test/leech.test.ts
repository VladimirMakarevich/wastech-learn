import { createScheduler, replay, type ReplayEvent } from "@wastech-learn/srs";
import { describe, expect, it } from "vitest";
import { crossesLeechThreshold } from "../src/index.js";
import { CONFIG, NOW, at } from "./fixtures.js";

const ITEM = "10dkrwp7:main";
const THRESHOLD = 2;

const MINUTE_MS = 60_000;

/**
 * An easy start, then month after month a lapse followed by Good past the relearning step: only a lapse
 * from the review phase counts, so each cycle adds exactly one.
 */
const history = (lapses: number): ReplayEvent[] => [
  { id: "E000", ts: NOW.toISOString(), kind: "review", item: ITEM, rating: 4 },
  ...Array.from({ length: lapses }, (_, index): ReplayEvent[] => {
    const lapse = at(30 * (index + 1));
    const relearned = new Date(lapse.getTime() + 15 * MINUTE_MS);
    return [
      {
        id: `E${String(index)}a`,
        ts: lapse.toISOString(),
        kind: "review",
        item: ITEM,
        rating: 1,
      },
      {
        id: `E${String(index)}b`,
        ts: relearned.toISOString(),
        kind: "review",
        item: ITEM,
        rating: 3,
      },
    ];
  }).flat(),
];

describe("leech threshold", () => {
  it("fires on the rating that brings lapses to the threshold, not before and not after", async () => {
    const scheduler = await createScheduler(CONFIG);
    const config = { leechThreshold: THRESHOLD };
    const stateAfter = (lapses: number) =>
      replay(history(lapses), scheduler, config, at(400)).items.get(ITEM);
    expect(crossesLeechThreshold(stateAfter(0), stateAfter(1), THRESHOLD)).toBe(
      false,
    );
    expect(crossesLeechThreshold(stateAfter(1), stateAfter(2), THRESHOLD)).toBe(
      true,
    );
    expect(crossesLeechThreshold(stateAfter(2), stateAfter(3), THRESHOLD)).toBe(
      false,
    );
  });

  it("leaves an item that is already suspended alone", () => {
    expect(
      crossesLeechThreshold(
        { lapses: 1 },
        { leech: true, suspended: true },
        THRESHOLD,
      ),
    ).toBe(false);
  });

  it("treats a first answer as zero lapses before", () => {
    expect(
      crossesLeechThreshold(undefined, { leech: true, suspended: false }, 1),
    ).toBe(true);
    expect(crossesLeechThreshold(undefined, undefined, 1)).toBe(false);
  });
});
