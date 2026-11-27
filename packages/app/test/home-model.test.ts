import { describe, expect, it } from "vitest";
import { homeModel } from "../src/app/screens/home/home-model";
import { review, snapshotAt } from "./snapshot";

describe("home model", () => {
  it("counts the day's queue, new cards by domain and what each topic has due", async () => {
    const events = [
      review(
        "a0000001:main",
        "2026-10-01T09:00:00.000Z",
        "01KB0000000000000000000001",
      ),
    ];
    const model = homeModel(
      await snapshotAt(new Date("2026-11-26T09:00:00.000Z"), events),
    );
    expect(
      model.queue.entries.map((entry) => [entry.item, entry.kind]),
    ).toEqual([
      ["a0000001:main", "review"],
      ["a0000002:main", "new"],
      ["p0000001:main", "new"],
    ]);
    expect(model.newByDomain).toEqual([
      { domain: "arch", count: 1 },
      { domain: "lang-pl", count: 1 },
    ]);
    expect(
      model.domains.map((domain) =>
        domain.topics.map((row) => [row.path, row.cards, row.due]),
      ),
    ).toEqual([[["arch/flow", 2, 2]], [["lang-pl/words", 1, 1]]]);
    expect(model.domains[0]?.topics[0]?.points[1]).toBeNull();
    expect(model.forecast).toHaveLength(7);
    expect(model.comeback).toBeDefined();
  });

  it("has no plan to come back before the first answer or right after one", async () => {
    expect(
      homeModel(await snapshotAt(new Date("2026-11-26T09:00:00.000Z"), []))
        .comeback,
    ).toBeUndefined();
    const recent = [
      review(
        "a0000001:main",
        "2026-11-25T09:00:00.000Z",
        "01KB0000000000000000000002",
      ),
    ];
    expect(
      homeModel(await snapshotAt(new Date("2026-11-26T09:00:00.000Z"), recent))
        .comeback,
    ).toBeUndefined();
  });
});
