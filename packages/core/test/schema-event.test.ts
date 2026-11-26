import { describe, expect, it } from "vitest";
import { parseReviewEvent } from "../src/index.js";

const review = {
  v: 1,
  id: "01JDX4Q8Z7M2K9V3N5R6T8W1YA",
  ts: "2026-11-25T18:04:05.123Z",
  tz: "Europe/Warsaw",
  device: "desk1",
  writer: "web",
  kind: "review",
  item: "7k2m9xqd:main",
  rating: 3,
  aiSuggested: null,
  grader: "self",
  confidence: 2,
  durMs: 8400,
  contentHash: "sha256:9f2c",
  sched: "ts-fsrs@6.0.1/FSRS-7",
};

describe("review event v1", () => {
  it("accepts the documented example", () => {
    const parsed = parseReviewEvent(review);
    expect(parsed.ok && parsed.event.item).toBe("7k2m9xqd:main");
  });

  it("reads an event with an unknown optional field and drops the field", () => {
    const parsed = parseReviewEvent({ ...review, mood: "calm" });
    expect(parsed.ok).toBe(true);
    expect(parsed.ok && "mood" in parsed.event).toBe(false);
  });

  it("reports a newer schema version instead of failing", () => {
    expect(parseReviewEvent({ ...review, v: 2 })).toEqual({
      ok: false,
      reason: "version-unsupported",
      version: 2,
    });
  });

  it("requires a rating on a review", () => {
    expect(parseReviewEvent({ ...review, rating: undefined })).toMatchObject({
      ok: false,
      field: "rating",
    });
  });

  it("requires a target on an undo", () => {
    const undo = { ...review, kind: "undo", rating: undefined };
    expect(parseReviewEvent(undo)).toMatchObject({
      ok: false,
      field: "target",
    });
  });

  it("requires a due date on a manual_due", () => {
    expect(parseReviewEvent({ ...review, kind: "manual_due" })).toMatchObject({
      ok: false,
      field: "due",
    });
  });

  it("rejects a timestamp with a local offset", () => {
    const local = { ...review, ts: "2026-11-25T19:04:05.123+01:00" };
    expect(parseReviewEvent(local)).toMatchObject({ ok: false, field: "ts" });
  });

  it("rejects a rating outside the four buttons", () => {
    expect(parseReviewEvent({ ...review, rating: 5 })).toMatchObject({
      ok: false,
      field: "rating",
    });
  });

  it("rejects a review item without a variant", () => {
    expect(parseReviewEvent({ ...review, item: "7k2m9xqd" })).toMatchObject({
      ok: false,
      field: "item",
    });
  });
});
