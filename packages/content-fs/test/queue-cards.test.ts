import { parseContent } from "@wastech-learn/core";
import { bundleQueueCards } from "@wastech-learn/session";
import { describe, expect, it } from "vitest";
import { buildBundle, loadContentFiles, toQueueCards } from "../src/index.js";
import { GOLDEN } from "./helpers.js";

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
