import { describe, expect, it } from "vitest";
import { loadSearchIndex } from "@wastech-learn/core";
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
    // The index is MiniSearch's own data, checked by what it answers rather than by its bytes.
    const { searchIndex, ...reviewed } = result.bundle;
    expect(searchIndex).toBeTypeOf("string");
    await expect(serializeBundle(reviewed)).toMatchFileSnapshot(
      "./__snapshots__/golden-bundle.json",
    );
    expect(elapsed).toBeLessThan(BUILD_BUDGET_MS);
  }, 30_000);

  it("carries a search index that finds a card by its question and a Polish word without diacritics", async () => {
    const result = await buildBundle(GOLDEN, BUILT_AT);
    if (!result.ok || result.bundle.searchIndex === undefined)
      throw new Error("golden has findings or no index");
    const index = loadSearchIndex(result.bundle.searchIndex);
    const card = result.bundle.cards.find(
      (entry) => entry.lang === "pl" && /[ąćęłńóśźż]/i.test(entry.questionHtml),
    );
    expect(card).toBeDefined();
    const words = card!.questionHtml
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter((word) => /^\p{L}{5,}$/u.test(word));
    const folded = words.find((word) => /[ąćęłńóśźż]/i.test(word));
    expect(words.length).toBeGreaterThan(0);
    expect(index.search(words.join(" "))[0]?.id).toBe(card!.id);
    expect(folded).toBeDefined();
    const plain = folded!
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/ł/g, "l");
    expect(index.search(plain).map((hit) => hit.id)).toContain(card!.id);
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
