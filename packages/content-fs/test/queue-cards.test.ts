import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseContent } from "@wastech-learn/core";
import { bundleQueueCards } from "@wastech-learn/session";
import { describe, expect, it } from "vitest";
import { buildBundle, loadContentFiles, toQueueCards } from "../src/index.js";
import { GOLDEN, goldenCopy } from "./helpers.js";

describe("review items of the golden sample", () => {
  it("come in the same order from the bundle as from the model, so the app and the chat quiz agree", async () => {
    const { model } = await parseContent(await loadContentFiles(GOLDEN));
    const build = await buildBundle(
      GOLDEN,
      new Date("2026-11-26T00:00:00.000Z"),
    );
    if (!build.ok) throw new Error("golden has findings");
    const fromModel = toQueueCards(model);
    expect(fromModel.length).toBeGreaterThan(30);
    expect(bundleQueueCards(build.bundle)).toEqual(fromModel);
  }, 30_000);
});

describe("an archived topic", () => {
  it("gives no review items to either queue, and both still agree", async () => {
    const root = await goldenCopy();
    const index = join(root, "content/dotnet/async-await/index.md");
    await writeFile(
      index,
      (await readFile(index, "utf8")).replace(
        /^status: active$/m,
        "status: archived",
      ),
    );
    const { model } = await parseContent(await loadContentFiles(root));
    const build = await buildBundle(root, new Date("2026-11-26T00:00:00.000Z"));
    if (!build.ok) throw new Error("the archived copy has findings");
    const fromModel = toQueueCards(model);
    const archivedIds = new Set(
      model.cards
        .filter((card) => card.topic === "dotnet/async-await")
        .map((card) => card.id),
    );
    expect(archivedIds.size).toBeGreaterThan(0);
    expect(fromModel.some((card) => archivedIds.has(card.cardId))).toBe(false);
    expect(bundleQueueCards(build.bundle)).toEqual(fromModel);
  }, 30_000);
});
