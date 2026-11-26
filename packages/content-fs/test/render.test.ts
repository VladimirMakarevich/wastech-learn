import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { markerHash, sha256Hex } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import { renderDiagrams, type Renderer } from "../src/index.js";
import { goldenCopy } from "./helpers.js";

const SOURCE = "content/architecture/backpressure/diagrams/demand-flow.mmd";
const SVG = "content/architecture/backpressure/diagrams/demand-flow.svg";

const stubRenderer = (): Renderer & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    render: async (sourcePath, outputPath) => {
      calls.push(sourcePath);
      await writeFile(
        outputPath,
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
      );
    },
  };
};

describe("renderDiagrams", () => {
  it("finds nothing stale in the golden sample", async () => {
    const root = await goldenCopy();
    expect(await renderDiagrams(root, { check: true })).toEqual({
      total: 2,
      rendered: [],
      stale: [],
    });
  });

  it("lists an edited source as stale in check mode without rendering", async () => {
    const root = await goldenCopy();
    await writeFile(
      join(root, SOURCE),
      `${await readFile(join(root, SOURCE), "utf8")}\n%% edited\n`,
    );
    const renderer = stubRenderer();
    const report = await renderDiagrams(root, { check: true, renderer });
    expect(report.stale).toEqual([SVG]);
    expect(renderer.calls).toEqual([]);
  });

  it("re-renders a stale diagram with the source hash as the first line, then checks clean", async () => {
    const root = await goldenCopy();
    const edited = `${await readFile(join(root, SOURCE), "utf8")}\n%% edited\n`;
    await writeFile(join(root, SOURCE), edited);
    const renderer = stubRenderer();
    expect(
      (await renderDiagrams(root, { check: false, renderer })).rendered,
    ).toEqual([SVG]);
    expect(renderer.calls).toEqual([join(root, SOURCE)]);
    const svg = await readFile(join(root, SVG), "utf8");
    expect(markerHash(svg)).toBe(await sha256Hex(edited));
    expect(svg.split("\n")[1]).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    );
    expect((await renderDiagrams(root, { check: true })).stale).toEqual([]);
  });

  it("reports a failing renderer with the source file", async () => {
    const root = await goldenCopy();
    await writeFile(join(root, SOURCE), "flowchart LR\n  broken -->\n");
    const failing: Renderer = {
      render: () => Promise.reject(new Error("mermaid says no")),
    };
    await expect(
      renderDiagrams(root, { check: false, renderer: failing }),
    ).rejects.toMatchObject({
      code: "render-failed",
      file: SOURCE,
    });
  });

  // The real mermaid-cli downloads a headless Chromium; run it on purpose with WASTECH_RENDER_E2E=1.
  it.skipIf(process.env.WASTECH_RENDER_E2E !== "1")(
    "renders through npx mermaid-cli end to end",
    async () => {
      const root = await goldenCopy();
      await writeFile(
        join(root, SOURCE),
        `${await readFile(join(root, SOURCE), "utf8")}\n%% edited\n`,
      );
      expect((await renderDiagrams(root, { check: false })).rendered).toEqual([
        SVG,
      ]);
      expect(await readFile(join(root, SVG), "utf8")).toContain("<svg");
      expect((await renderDiagrams(root, { check: true })).stale).toEqual([]);
    },
    300_000,
  );
});
