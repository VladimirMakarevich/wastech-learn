import { describe, expect, it } from "vitest";
import {
  contentHash,
  parseContent,
  readSections,
  splitFrontMatter,
  variantsFor,
} from "../src/index.js";
import { cardText, repoWith, topicFiles } from "./content-builders.js";

describe("parseContent", () => {
  it("builds topics and cards with review items", async () => {
    const { model, findings } = await parseContent(
      repoWith([{ id: "7k2m9xqd" }]),
    );
    expect(findings).toEqual([]);
    expect(model.topics.map((topic) => topic.path)).toEqual(["arch/flow"]);
    expect(model.cards).toHaveLength(1);
    const card = model.cards[0]!;
    expect(card.items).toEqual(["7k2m9xqd:main"]);
    expect(card.topic).toBe("arch/flow");
    expect(card.lang).toBe("en");
    expect(card.title).toBe("Title");
    expect(card.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("reports a card without status with its file and field, and leaves it out of the model", async () => {
    const { model, findings } = await parseContent(
      repoWith([{ id: "7k2m9xqd", status: null }]),
    );
    expect(model.cards).toEqual([]);
    expect(findings).toEqual([
      {
        ruleId: "front-matter-schema",
        severity: "error",
        file: "content/arch/flow/cards/7k2m9xqd.md",
        line: 1,
        params: { field: "status" },
      },
    ]);
  });

  it("points a wrong front matter value at the line of its key", async () => {
    const { findings } = await parseContent(
      repoWith([{ id: "7k2m9xqd", status: "bogus" }]),
    );
    const text = repoWith([{ id: "7k2m9xqd", status: "bogus" }]).get(
      "content/arch/flow/cards/7k2m9xqd.md",
    );
    const line =
      (text ?? "").split("\n").findIndex((row) => row.startsWith("status:")) +
      1;
    expect(line).toBeGreaterThan(1);
    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: "front-matter-schema",
        line,
        params: { field: "status" },
      }),
    ]);
  });

  it("reports a card whose topic has no index.md", async () => {
    const files = new Map([
      ["content/lost/topic/cards/7k2m9xqd.md", cardText()],
    ]);
    const { findings } = await parseContent(files);
    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "topic-missing",
    ]);
  });

  it("reports a topic without its summary", async () => {
    const files = new Map(
      topicFiles().filter(([path]) => !path.endsWith("summary.md")),
    );
    const { model, findings } = await parseContent(files);
    expect(model.topics[0]?.summary).toBeUndefined();
    expect(findings).toMatchObject([
      { ruleId: "topic-file-missing", params: { name: "summary.md" } },
    ]);
  });

  it("reports a card without an Answer section", async () => {
    const files = repoWith([{ id: "7k2m9xqd", answer: "", rest: "" }]);
    const text = files
      .get("content/arch/flow/cards/7k2m9xqd.md")!
      .replace("## Answer", "");
    files.set("content/arch/flow/cards/7k2m9xqd.md", text);
    const { findings } = await parseContent(files);
    expect(findings).toMatchObject([
      { ruleId: "section-missing", params: { section: "Answer" } },
    ]);
  });

  it("takes the card's own lang over the topic's", async () => {
    const { model } = await parseContent(
      repoWith([{ extraFrontMatter: "lang: ru" }]),
    );
    expect(model.cards[0]?.lang).toBe("ru");
  });

  it("pairs every diagram source with the SVG next to it", async () => {
    const files = repoWith(
      [],
      [
        ["content/arch/flow/diagrams/flow.mmd", "flowchart LR\n  a --> b\n"],
        ["content/arch/flow/diagrams/flow.svg", "<svg></svg>"],
        ["content/arch/flow/diagrams/lonely.mmd", "flowchart LR\n"],
      ],
    );
    const { model } = await parseContent(files);
    expect(
      model.diagrams.map((diagram) => [diagram.source, diagram.svgText]),
    ).toEqual([
      ["content/arch/flow/diagrams/flow.mmd", "<svg></svg>"],
      ["content/arch/flow/diagrams/lonely.mmd", undefined],
    ]);
  });
});

describe("variants", () => {
  it("gives a cloze card one variant per cloze number", () => {
    expect(
      variantsFor("cloze", "A {{c2::b}} and {{c1::c}} and {{c2::d}}"),
    ).toEqual(["c1", "c2"]);
  });

  it("gives vocab and reversed cards both directions", () => {
    expect(variantsFor("vocab", "word")).toEqual(["fwd", "rev"]);
    expect(variantsFor("reversed", "term")).toEqual(["fwd", "rev"]);
  });

  it("gives every other type a single main variant", () => {
    for (const type of ["basic", "why", "compare", "scenario"] as const) {
      expect(variantsFor(type, "q")).toEqual(["main"]);
    }
  });
});

describe("contentHash", () => {
  const hashOf = async (overrides: Parameters<typeof cardText>[0]) => {
    const { model } = await parseContent(
      repoWith([{ id: "7k2m9xqd", ...overrides }]),
    );
    return model.cards[0]!.contentHash;
  };

  it("does not change when only the explanation or sources change", async () => {
    const before = await hashOf({});
    const after = await hashOf({
      rest: "## Explanation\n\nNew words.\n\n## Sources\n\n- other",
    });
    expect(after).toBe(before);
  });

  it("changes when the answer changes", async () => {
    expect(await hashOf({ answer: "Another answer." })).not.toBe(
      await hashOf({}),
    );
  });

  it("ignores line endings", async () => {
    expect(await contentHash("q\r\nline", "a")).toBe(
      await contentHash("q\nline", "a"),
    );
  });
});

describe("front matter and sections", () => {
  it("reports the file line of a YAML error", () => {
    expect(splitFrontMatter("---\nid: a\ntags: [x\n---\nbody")).toMatchObject({
      ok: false,
      reason: "yaml",
    });
  });

  it("reports a file without front matter", () => {
    expect(splitFrontMatter("# Title")).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("does not split a section on a heading inside a code block", () => {
    const body =
      "## Question\n\n```md\n## Not a section\n```\n\n## Answer\n\nYes.\n";
    const { sections } = readSections(body, 5);
    expect(sections.map((section) => [section.name, section.line])).toEqual([
      ["Question", 5],
      ["Answer", 11],
    ]);
    expect(sections[0]?.markdown).toContain("## Not a section");
  });
});
