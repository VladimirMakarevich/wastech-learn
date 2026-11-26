import { describe, expect, it } from "vitest";
import { compileBundle, parseContent } from "../src/index.js";
import { repoWith } from "./content-builders.js";

const SVG =
  '<svg id="my-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>my-svg exporter</text></svg>';

const summaryHtml = async (
  body: string,
  extra: [string, string][] = [],
): Promise<string> => {
  const files = new Map([
    ...repoWith([{ id: "7k2m9xqd" }]),
    [
      "content/arch/flow/summary.md",
      `---\nstatus: active\nupdated: 2026-11-25\n---\n\n# Flow\n\n## TL;DR\n\n${body}\n`,
    ],
    ...extra,
  ]);
  const { model } = await parseContent(files);
  const bundle = await compileBundle(model, files, { builtAt: new Date(0) });
  return bundle.topics[0]?.summary[0]?.html ?? "";
};

describe("compileBundle: hardening", () => {
  it("hides a cloze answer that contains code or emphasis", async () => {
    const files = repoWith([
      {
        id: "7k2m9xqd",
        type: "cloze",
        question: "[TCP] The {{c1::`rwnd`}} and {{c2::**window**}} limit it.",
      },
    ]);
    const { model } = await parseContent(files);
    const bundle = await compileBundle(model, files, { builtAt: new Date(0) });
    const html = bundle.cards[0]?.questionHtml ?? "";
    expect(html).toContain(
      '<span class="cloze" data-cloze="1"><code>rwnd</code></span>',
    );
    expect(html).toContain(
      '<span class="cloze" data-cloze="2"><strong>window</strong></span>',
    );
    expect(html).not.toContain("{{c");
  });

  it("sanitizes a long semicolon-less style quickly", async () => {
    const style = `${Array.from({ length: 40 }, () => "ab:cd").join(" ")}(`;
    const started = Date.now();
    const html = await summaryHtml(`<span style="${style}">x</span>`);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(html).toContain("<span>x</span>");
  });

  it("replaces a remote image with its alt text", async () => {
    const html = await summaryHtml(
      "![Tracker pixel](https://example.org/p.png)",
    );
    expect(html).not.toContain("example.org");
    expect(html).toContain("Tracker pixel");
  });

  it("renames ids but not a label that contains the id", async () => {
    const html = await summaryHtml("![Flow](diagrams/flow.svg)", [
      ["content/arch/flow/diagrams/flow.svg", SVG],
    ]);
    expect(html).toContain("my-svg exporter");
    expect(html).toMatch(/<svg id="dg-[0-9a-f]{8}-1"/);
  });
});
