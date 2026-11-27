import { describe, expect, it } from "vitest";
import { suggestRating, type RubricMark } from "../src/index.js";

const rubric = [{ required: true }, { required: true }, { required: false }];
const usual = { durMs: 30_000, estimateMs: 45_000 };

describe("rubric suggestion", () => {
  it.each<[readonly RubricMark[], number]>([
    [["no", "yes", "yes"], 1],
    [["yes", "no", "yes"], 1],
    [["partial", "yes", "no"], 2],
    [["yes", "yes", "no"], 3],
    [["yes", "yes", "partial"], 3],
    [["yes", "yes", "yes"], 4],
  ])("%j suggests %i", (marks, rating) => {
    expect(suggestRating(rubric, marks, usual)).toBe(rating);
  });

  it("does not suggest Easy for a slow answer or without a time", () => {
    expect(
      suggestRating(rubric, ["yes", "yes", "yes"], {
        durMs: 60_000,
        estimateMs: 45_000,
      }),
    ).toBe(3);
    expect(suggestRating(rubric, ["yes", "yes", "yes"])).toBe(3);
  });

  it("suggests Hard when everything required is there but the answer took more than twice as long", () => {
    expect(
      suggestRating(rubric, ["yes", "yes", "yes"], {
        durMs: 91_000,
        estimateMs: 45_000,
      }),
    ).toBe(2);
    expect(
      suggestRating(rubric, ["no", "yes", "yes"], {
        durMs: 91_000,
        estimateMs: 45_000,
      }),
    ).toBe(1);
  });

  it("counts a missing mark as missed", () => {
    expect(suggestRating(rubric, ["yes"], usual)).toBe(1);
  });

  it("treats every item as required when none is marked required, with nothing extra for Easy", () => {
    const loose = [{ required: false }, { required: false }];
    expect(suggestRating(loose, ["yes", "no"], usual)).toBe(1);
    expect(suggestRating(loose, ["yes", "partial"], usual)).toBe(2);
    expect(suggestRating(loose, ["yes", "yes"], usual)).toBe(3);
  });

  it("has nothing to grade without a rubric", () => {
    expect(suggestRating([], [], usual)).toBe(3);
  });
});
