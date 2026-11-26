import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cli, goldenCopy } from "./helpers.js";

const SOURCE = "content/dotnet/async-await/diagrams/deadlock.mmd";

describe("wastech-learn render --check", () => {
  it("exits 0 when every SVG matches its source", async () => {
    const result = await cli([
      "render",
      "--check",
      "--content",
      await goldenCopy(),
      "--lang",
      "en",
    ]);
    expect(result).toMatchObject({ code: 0, out: "Diagrams: 2, stale: 0" });
  });

  it("names a stale SVG and exits 1 after its source changed", async () => {
    const root = await goldenCopy();
    await writeFile(
      join(root, SOURCE),
      `${await readFile(join(root, SOURCE), "utf8")}\n%% edited\n`,
    );
    const result = await cli([
      "render",
      "--check",
      "--content",
      root,
      "--lang",
      "en",
    ]);
    expect(result.code).toBe(1);
    expect(result.out).toContain(
      "Stale: content/dotnet/async-await/diagrams/deadlock.svg",
    );
  });
});

describe("wastech-learn simulate", () => {
  it("compares the three orders and prints the same report for the same seed", async () => {
    const root = await goldenCopy();
    const args = [
      "simulate",
      "--content",
      root,
      "--runs",
      "1",
      "--seed",
      "3",
      "--lang",
      "en",
    ];
    const first = await cli(args);
    expect(first.code).toBe(0);
    expect(first.out).toContain(
      "Break of 14 days, sessions of 15 min, 300 cards",
    );
    for (const order of [
      "ascending-r (default)",
      "descending-r",
      "relative-overdue",
    ]) {
      expect(first.out).toContain(order);
    }
    expect(first.out).toMatch(/cleared after [1-5] sessions?\./);
    expect((await cli(args)).out).toBe(first.out);
  }, 60_000);

  it("rejects a non-numeric option", async () => {
    expect(
      (
        await cli([
          "simulate",
          "--content",
          await goldenCopy(),
          "--break-days",
          "two",
        ])
      ).code,
    ).toBe(2);
  });
});
