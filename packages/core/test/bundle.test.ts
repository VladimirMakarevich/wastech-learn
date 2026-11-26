import { describe, expect, it } from "vitest";
import {
  compileBundle,
  parseContent,
  type ContentBundle,
} from "../src/index.js";
import { repoWith } from "./content-builders.js";

const SVG = [
  "<!-- source-sha256: 00 -->",
  '<svg id="my-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" style="max-width: 10px; background-color: white;">',
  "<style>#my-svg{fill:#333}</style>",
  '<defs><marker id="my-svg-arrow" markerWidth="4" markerHeight="4"><path d="M0,0 L4,2 z"></path></marker></defs>',
  '<path d="M0,0 L10,10" marker-end="url(#my-svg-arrow)" onclick="alert(1)"></path>',
  '<script>alert("svg")</script>',
  "</svg>",
].join("");

const build = async (
  summaryBody: string,
  extra: [string, string][] = [],
): Promise<ContentBundle> => {
  const files = new Map([
    ...repoWith([
      {
        id: "7k2m9xqd",
        type: "cloze",
        question: "[TCP] The {{c1::receive window}} limits it.",
      },
    ]),
    [
      "content/arch/flow/summary.md",
      `---\nstatus: active\nupdated: 2026-11-25\n---\n\n# Flow\n\n## TL;DR\n\n${summaryBody}\n`,
    ],
    ...extra,
  ]);
  const { model, findings } = await parseContent(files);
  expect(findings).toEqual([]);
  return compileBundle(model, files, {
    builtAt: new Date("2026-11-26T00:00:00Z"),
  });
};

describe("compileBundle", () => {
  it("drops scripts and event handlers but keeps SVG, KaTeX and Shiki output", async () => {
    const summary = [
      '<script>alert("x")</script>',
      '<a href="#" onclick="alert(1)">link</a>',
      "",
      "![Flow: a to b](diagrams/flow.svg)",
      "",
      "Inline $E = mc^2$ math.",
      "",
      "```ts",
      "const x: number = 1;",
      "```",
    ].join("\n");
    const bundle = await build(summary, [
      ["content/arch/flow/diagrams/flow.svg", SVG],
    ]);
    const html = bundle.topics[0]?.summary[0]?.html ?? "";
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("alert");
    expect(html).toContain("<svg");
    expect(html).toMatch(/<marker id="dg-[0-9a-f]{8}-1-arrow"/);
    expect(html).toMatch(/marker-end="url\(#dg-[0-9a-f]{8}-1-arrow\)"/);
    expect(html).not.toContain("background-color: white");
    expect(html).not.toContain("<style");
    expect(html).toContain(
      'class="diagram" role="img" aria-label="Flow: a to b"',
    );
    expect(html).toContain('class="katex"');
    expect(html).toContain("<math");
    expect(html).toContain(
      'class="shiki shiki-themes github-light github-dark"',
    );
    expect(html).toContain("--shiki-light:");
  });

  it("drops a style that could load a remote resource", async () => {
    const bundle = await build(
      '<span style="background:url(https://example.org/x.png)">x</span>',
    );
    const html = bundle.topics[0]?.summary[0]?.html ?? "";
    expect(html).not.toContain("url(");
    expect(html).toContain("<span>x</span>");
  });

  it("opens external links safely", async () => {
    const bundle = await build("[Docs](https://example.org/docs)");
    expect(bundle.topics[0]?.summary[0]?.html).toContain(
      '<a href="https://example.org/docs" rel="noopener noreferrer" target="_blank">Docs</a>',
    );
  });

  it("marks cloze gaps so the app can hide the variant asked", async () => {
    const bundle = await build("Short.");
    expect(bundle.cards[0]?.questionHtml).toContain(
      '<span class="cloze" data-cloze="1">receive window</span>',
    );
    expect(bundle.cards[0]?.variants).toEqual(["c1"]);
  });

  it("gives the same diagram unique ids each time it is embedded", async () => {
    const twice = "![A](diagrams/flow.svg)\n\n![B](diagrams/flow.svg)";
    const bundle = await build(twice, [
      ["content/arch/flow/diagrams/flow.svg", SVG],
    ]);
    const html = bundle.topics[0]?.summary[0]?.html ?? "";
    expect(html).toMatch(/dg-[0-9a-f]{8}-1-arrow/);
    expect(html).toMatch(/dg-[0-9a-f]{8}-2-arrow/);
  });

  it("records a local image that is not inlined as an asset", async () => {
    const bundle = await build("![Photo](img/photo.png)");
    expect(bundle.assets).toEqual({
      "content/arch/flow/img/photo.png": "content/arch/flow/img/photo.png",
    });
  });
});
