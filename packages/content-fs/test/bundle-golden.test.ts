import { describe, expect, it } from "vitest";
import { buildBundle, serializeBundle } from "../src/index.js";
import { GOLDEN } from "./helpers.js";

const BUILT_AT = new Date("2026-11-26T00:00:00.000Z");
// The NFR budget for a build of the golden sample; the run includes creating the highlighter.
const BUILD_BUDGET_MS = 10_000;

describe("content bundle of the golden sample", () => {
  it("matches the reviewed snapshot and builds within the budget", async () => {
    const started = performance.now();
    const result = await buildBundle(GOLDEN, BUILT_AT);
    const elapsed = performance.now() - started;
    if (!result.ok)
      throw new Error(
        `golden has findings: ${JSON.stringify(result.findings)}`,
      );
    expect(result.bundle.topics).toHaveLength(3);
    expect(result.bundle.cards).toHaveLength(30);
    expect(result.bundle).not.toHaveProperty("searchIndex");
    await expect(serializeBundle(result.bundle)).toMatchFileSnapshot(
      "./__snapshots__/golden-bundle.json",
    );
    expect(elapsed).toBeLessThan(BUILD_BUDGET_MS);
  }, 30_000);

  it("is byte-identical when built twice", async () => {
    const [first, second] = await Promise.all([
      buildBundle(GOLDEN, BUILT_AT),
      buildBundle(GOLDEN, BUILT_AT),
    ]);
    if (!first.ok || !second.ok) throw new Error("golden has findings");
    expect(serializeBundle(second.bundle)).toBe(serializeBundle(first.bundle));
  }, 30_000);
});
