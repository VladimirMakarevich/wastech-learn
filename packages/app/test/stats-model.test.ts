import { describe, expect, it } from "vitest";
import { statsModel } from "../src/app/screens/stats/stats-model";
import { review, snapshotAt } from "./snapshot";

describe("stats model", () => {
  it("counts review-phase recall over a week and a month and the load of the next 30 days", async () => {
    const events = [
      review(
        "a0000001:main",
        "2026-10-01T09:00:00.000Z",
        "01KB0000000000000000000001",
      ),
      // Weeks later the item is in the review phase: this answer counts toward true retention.
      review(
        "a0000001:main",
        "2026-11-20T09:00:00.000Z",
        "01KB0000000000000000000002",
      ),
    ];
    const model = statsModel(
      await snapshotAt(new Date("2026-11-26T09:00:00.000Z"), events),
    );
    expect(model.young.week).toEqual({ passed: 1, total: 1, rate: 1 });
    expect(model.young.month).toEqual({ passed: 1, total: 1, rate: 1 });
    expect(model.mature.month.total).toBe(0);
    expect(model.forecast).toHaveLength(30);
    expect(model.forecast[0]).toMatchObject({
      key: "2026-11-26",
      today: true,
      weekend: false,
    });
    expect(model.forecast[2]).toMatchObject({
      key: "2026-11-28",
      weekend: true,
    });
    expect(model.max).toBe(Math.max(...model.forecast.map((day) => day.due)));
    expect(model.target).toBe(0.9);
  });
});
