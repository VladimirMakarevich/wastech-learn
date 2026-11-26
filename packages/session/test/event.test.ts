import { parseReviewEvent, type ReviewEvent } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import {
  MAX_DURATION_MS,
  ratingEvent,
  ratingGroup,
  resetEvent,
  suspendEvent,
  undoEvents,
  unsuspendEvent,
} from "../src/index.js";
import { NOW, SCHED, origin } from "./fixtures.js";

const HASH = `sha256:${"a".repeat(64)}`;

const valid = (event: ReviewEvent): ReviewEvent => {
  const parsed = parseReviewEvent(JSON.parse(JSON.stringify(event)));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed));
  return parsed.event;
};

describe("rating events", () => {
  it("records the answer under the origin's writer, device, zone and scheduler", () => {
    const event = valid(
      ratingEvent(origin(), NOW, {
        item: "10dkrwp7:main",
        kind: "review",
        rating: 3,
        contentHash: HASH,
        confidence: 2,
        durMs: 8400,
      }),
    );
    expect(event).toMatchObject({
      v: 1,
      ts: NOW.toISOString(),
      tz: "Europe/Warsaw",
      device: "desk1",
      writer: "web",
      kind: "review",
      item: "10dkrwp7:main",
      rating: 3,
      confidence: 2,
      durMs: 8400,
      aiSuggested: null,
      grader: "self",
      contentHash: HASH,
      sched: SCHED,
    });
  });

  it("writes a skipped confidence as null and leaves out a missing duration", () => {
    const event = ratingEvent(origin(), NOW, {
      item: "10dkrwp7:main",
      kind: "practice",
      rating: 1,
      contentHash: HASH,
    });
    expect(event.confidence).toBeNull();
    expect("durMs" in event).toBe(false);
    expect(valid(event).kind).toBe("practice");
  });

  it("draws the same ids from the same seed and different ids from one source", () => {
    const input = {
      item: "10dkrwp7:main",
      kind: "review",
      rating: 3,
      contentHash: HASH,
    } as const;
    const first = ratingEvent(origin(1), NOW, input);
    expect(ratingEvent(origin(1), NOW, input).id).toBe(first.id);
    const shared = origin(1);
    expect(ratingEvent(shared, NOW, input).id).not.toBe(
      ratingEvent(shared, NOW, input).id,
    );
  });
});

describe("state events", () => {
  it("suspend, unsuspend and reset are valid events of the item", () => {
    const from = origin();
    for (const [make, kind] of [
      [suspendEvent, "suspend"],
      [unsuspendEvent, "unsuspend"],
      [resetEvent, "reset"],
    ] as const) {
      expect(valid(make(from, NOW, "0d1gjcys:c1"))).toMatchObject({
        kind,
        item: "0d1gjcys:c1",
        writer: "web",
      });
    }
  });

  it("an undo per target points at it and carries its item", () => {
    const from = origin();
    const rating = ratingEvent(from, NOW, {
      item: "10dkrwp7:main",
      kind: "review",
      rating: 1,
      contentHash: HASH,
    });
    const suspend = suspendEvent(from, NOW, "10dkrwp7:main");
    const undos = undoEvents(from, NOW, [rating, suspend]).map(valid);
    expect(undos.map((undo) => [undo.kind, undo.item, undo.target])).toEqual([
      ["undo", "10dkrwp7:main", rating.id],
      ["undo", "10dkrwp7:main", suspend.id],
    ]);
  });
});

describe("rating groups", () => {
  it("joins a rating with the suspend written with it, never another item's or a later one", () => {
    const from = origin();
    const later = new Date(NOW.getTime() + 1);
    const rating = ratingEvent(from, NOW, {
      item: "10dkrwp7:main",
      kind: "review",
      rating: 1,
      contentHash: HASH,
    });
    const own = suspendEvent(from, NOW, "10dkrwp7:main");
    const other = suspendEvent(from, NOW, "0d1gjcys:c1");
    const manual = suspendEvent(from, later, "10dkrwp7:main");
    expect(ratingGroup([rating, own, other, manual], rating)).toEqual([
      rating,
      own,
    ]);
  });
});

describe("answer time", () => {
  it("is a whole number of milliseconds capped at two minutes", () => {
    const answer = (durMs: number) =>
      ratingEvent(origin(), NOW, {
        item: "10dkrwp7:main",
        kind: "review",
        rating: 3,
        contentHash: HASH,
        durMs,
      }).durMs;
    expect(answer(8400.6)).toBe(8401);
    expect(answer(MAX_DURATION_MS + 1)).toBe(MAX_DURATION_MS);
    expect(answer(9 * 3_600_000)).toBe(120_000);
    expect(answer(0)).toBe(0);
    expect(answer(Number.NaN)).toBeUndefined();
  });
});
