import { describe, expect, it } from "vitest";
import {
  CARD_ID_PATTERN,
  newCardId,
  newUlid,
  newUniqueCardId,
  parseReviewEvent,
  type RandomSource,
} from "../src/index.js";

// core may not import srs, where the shared seeded generator lives; the same Mulberry32 is enough here.
const seeded = (seed: number): RandomSource => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

describe("card ids", () => {
  it("are 8 lower-case Crockford base32 characters", () => {
    const random = seeded(7);
    for (let index = 0; index < 500; index++) {
      expect(newCardId(random)).toMatch(CARD_ID_PATTERN);
    }
  });

  it("repeat exactly for the same seed", () => {
    const first = [seeded(42), seeded(42)].map((random) =>
      Array.from({ length: 5 }, () => newCardId(random)),
    );
    expect(first[0]).toEqual(first[1]);
  });

  it("skip ids that are already taken", () => {
    const taken = new Set([newCardId(seeded(3))]);
    const id = newUniqueCardId(seeded(3), taken);
    expect(taken.has(id)).toBe(false);
    expect(id).toMatch(CARD_ID_PATTERN);
  });

  it("refuses a random source outside [0, 1)", () => {
    expect(() => newCardId(() => 1)).toThrow(RangeError);
  });
});

describe("event ULIDs", () => {
  const now = new Date("2026-11-26T18:00:00.000Z");

  it("pass the review event schema", () => {
    const id = newUlid(now, seeded(1));
    const parsed = parseReviewEvent({
      v: 1,
      id,
      ts: now.toISOString(),
      tz: "Europe/Warsaw",
      device: "desk1",
      writer: "mcp",
      kind: "review",
      item: "7k2m9xqd:main",
      rating: 3,
      sched: "ts-fsrs@6.0.1/FSRS-7",
    });
    expect(parsed.ok).toBe(true);
  });

  it("sort by time across milliseconds", () => {
    const random = seeded(9);
    const earlier = newUlid(now, random);
    const later = newUlid(new Date(now.getTime() + 1), random);
    expect(earlier < later).toBe(true);
    expect(earlier.slice(0, 10)).not.toBe(later.slice(0, 10));
  });

  it("are deterministic for the same time and seed", () => {
    expect(newUlid(now, seeded(5))).toBe(newUlid(now, seeded(5)));
  });
});
