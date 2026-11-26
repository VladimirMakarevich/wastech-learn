import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cli, goldenCopy } from "./helpers.js";

const CARD = "content/architecture/backpressure/cards/0d1gjcys.md";

describe("wastech-learn build", () => {
  it("writes the bundle and gives the same bytes on a second run with the same --built-at", async () => {
    const root = await goldenCopy();
    const args = [
      "build",
      "--content",
      root,
      "--out",
      "out/bundle.json",
      "--built-at",
      "2026-11-26T00:00:00Z",
      "--lang",
      "en",
    ];
    const first = await cli(args);
    expect(first.code).toBe(0);
    expect(first.out).toContain("3 topics, 30 cards");
    const bytes = await readFile(join(root, "out/bundle.json"), "utf8");
    expect(JSON.parse(bytes)).toMatchObject({
      version: 1,
      builtAt: "2026-11-26T00:00:00.000Z",
    });
    expect((await cli(args)).code).toBe(0);
    expect(await readFile(join(root, "out/bundle.json"), "utf8")).toBe(bytes);
  }, 30_000);

  it("writes nothing and exits 1 when a card fails its schema", async () => {
    const root = await goldenCopy();
    const path = join(root, CARD);
    await writeFile(
      path,
      (await readFile(path, "utf8")).replace("status: active\n", ""),
    );
    const result = await cli([
      "build",
      "--content",
      root,
      "--out",
      "bundle.json",
      "--lang",
      "en",
    ]);
    expect(result.code).toBe(1);
    expect(result.out).toContain(CARD);
    expect(result.out).toContain("front-matter-schema");
    expect(result.err).toContain("Bundle not written");
    await expect(access(join(root, "bundle.json"))).rejects.toThrow();
  });

  it("rejects a --built-at that is not a date", async () => {
    const result = await cli([
      "build",
      "--content",
      await goldenCopy(),
      "--built-at",
      "yesterday",
    ]);
    expect(result.code).toBe(2);
  });
});
