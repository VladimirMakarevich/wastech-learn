import { describe, expect, it } from "vitest";
import { prepareEvents } from "../src/index.js";
import { event, review } from "./fixtures.js";

describe("prepareEvents", () => {
  it("drops a duplicate event by id and orders by time, then by id", () => {
    const a = review("aaaaaaaa:main", "2026-01-01T10:00:00.000Z", 3);
    const b = {
      ...review("bbbbbbbb:main", "2026-01-01T10:00:00.000Z", 3),
      id: "A0",
    };
    const c = review("cccccccc:main", "2026-01-01T09:00:00Z", 3);
    expect(prepareEvents([a, b, c, a]).map((e) => e.id)).toEqual([
      c.id,
      "A0",
      a.id,
    ]);
  });

  it("orders timestamps by instant, not by text", () => {
    const whole = review("aaaaaaaa:main", "2026-01-01T10:00:05Z", 3);
    const fraction = review("bbbbbbbb:main", "2026-01-01T10:00:05.500Z", 3);
    expect(prepareEvents([fraction, whole]).map((e) => e.id)).toEqual([
      whole.id,
      fraction.id,
    ]);
  });

  it("removes an undone event together with its undo", () => {
    const kept = review("aaaaaaaa:main", "2026-01-01T10:00:00Z", 3);
    const undone = review("aaaaaaaa:main", "2026-01-02T10:00:00Z", 1);
    const undo = event("undo", "aaaaaaaa:main", "2026-01-02T10:00:03Z", {
      target: undone.id,
    });
    expect(prepareEvents([undo, undone, kept])).toEqual([kept]);
  });

  it("brings an event back when its undo is undone", () => {
    const original = review("aaaaaaaa:main", "2026-01-02T10:00:00Z", 1);
    const undo = event("undo", "aaaaaaaa:main", "2026-01-02T10:00:03Z", {
      target: original.id,
    });
    const redo = event("undo", "aaaaaaaa:main", "2026-01-02T10:00:06Z", {
      target: undo.id,
    });
    expect(prepareEvents([original, undo, redo])).toEqual([original]);
  });
});
