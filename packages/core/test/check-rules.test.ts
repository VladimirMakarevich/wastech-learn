import { describe, expect, it } from "vitest";
import {
  checkContent,
  sha256Hex,
  sourceMarker,
  type CheckInput,
  type RuleId,
} from "../src/index.js";
import { cardText, repoWith, type CardSpec } from "./content-builders.js";

const words = (count: number): string =>
  Array.from({ length: count }, (_, index) => `w${String(index)}`).join(" ");

const ruleIdsOf = async (input: CheckInput): Promise<RuleId[]> =>
  (await checkContent(input)).findings.map((finding) => finding.ruleId);

const ruleIdsForCard = async (spec: CardSpec): Promise<RuleId[]> =>
  ruleIdsOf({ files: repoWith([spec]) });

describe("check: card rules", () => {
  it("passes a well-formed card", async () => {
    expect(await ruleIdsForCard({})).toEqual([]);
  });

  it("flags a question over 25 words", async () => {
    expect(await ruleIdsForCard({ question: words(26) })).toEqual([
      "question-words",
    ]);
  });

  it("allows a scenario question up to 60 words", async () => {
    const scenario: CardSpec = {
      type: "scenario",
      question: words(60),
      rest: "## Rubric\n\n- (!) point\n\n## Sources\n\n- [S](../summary.md#tldr)",
    };
    expect(await ruleIdsForCard(scenario)).toEqual([]);
    expect(await ruleIdsForCard({ ...scenario, question: words(61) })).toEqual([
      "question-words",
    ]);
  });

  it("does not count code blocks, markup or punctuation as words", async () => {
    const code = Array.from({ length: 10 }, () => words(4)).join("\n");
    const question = `[C#] What does it print?\n\n\`\`\`csharp\n${code}\n\`\`\``;
    expect(await ruleIdsForCard({ question, answer: "**A** — `ACB`" })).toEqual(
      [],
    );
  });

  it("flags a basic answer over 12 words with its count and limit", async () => {
    const { findings } = await checkContent({
      files: repoWith([{ answer: words(19) }]),
    });
    expect(findings).toMatchObject([
      {
        ruleId: "answer-words",
        params: { count: 19, limit: 12, type: "basic" },
      },
    ]);
  });

  it("allows a why answer up to 40 words but no more than 3 points", async () => {
    expect(await ruleIdsForCard({ type: "why", answer: words(40) })).toEqual(
      [],
    );
    expect(
      await ruleIdsForCard({ type: "why", answer: "- a\n- b\n- c\n- d" }),
    ).toEqual(["answer-points"]);
  });

  it("requires a rubric on a scenario card", async () => {
    expect(await ruleIdsForCard({ type: "scenario" })).toEqual([
      "rubric-missing",
    ]);
  });

  it("flags a rubric with more than 5 items or no required item", async () => {
    const rubric = (items: string[]) =>
      `## Rubric\n\n${items.map((item) => `- ${item}`).join("\n")}\n\n## Sources\n\n- [S](../summary.md#tldr)`;
    expect(
      await ruleIdsForCard({
        type: "scenario",
        rest: rubric(["(!) a", "b", "c", "d", "e", "f"]),
      }),
    ).toEqual(["rubric-items"]);
    expect(
      await ruleIdsForCard({ type: "scenario", rest: rubric(["a", "b"]) }),
    ).toEqual(["rubric-required"]);
  });

  it("flags a code block over 12 lines and a line over 80 characters", async () => {
    const tall = `\`\`\`ts\n${Array.from({ length: 13 }, () => "x").join("\n")}\n\`\`\``;
    expect(await ruleIdsForCard({ question: `[C] Q?\n\n${tall}` })).toEqual([
      "code-lines",
    ]);
    const wide = `\`\`\`ts\n${"y".repeat(81)}\n\`\`\``;
    const { findings } = await checkContent({
      files: repoWith([{ question: `[C] Q?\n\n${wide}` }]),
    });
    expect(findings).toMatchObject([
      { ruleId: "code-width", line: 18, params: { count: 81 } },
    ]);
  });

  it("flags a cloze variant with two gaps and a card with more than 3 variants", async () => {
    const twoGaps = "[X] {{c1::a}} and {{c1::b}}";
    expect(await ruleIdsForCard({ type: "cloze", question: twoGaps })).toEqual([
      "cloze-gaps",
    ]);
    const four = "[X] {{c1::a}} {{c2::b}} {{c3::c}} {{c4::d}}";
    expect(await ruleIdsForCard({ type: "cloze", question: four })).toEqual([
      "cloze-variants",
    ]);
    expect(
      await ruleIdsForCard({ type: "cloze", question: "[X] no gaps" }),
    ).toEqual(["cloze-variants"]);
  });

  it("requires langPair and an example sentence on a vocab card", async () => {
    const example = "дом (м. р.) — *Wracam do domu.*";
    expect(await ruleIdsForCard({ type: "vocab", answer: example })).toEqual([
      "vocab-lang-pair",
    ]);
    const paired = { type: "vocab", extraFrontMatter: "langPair: pl-ru" };
    expect(await ruleIdsForCard({ ...paired, answer: example })).toEqual([]);
    expect(await ruleIdsForCard({ ...paired, answer: "дом (м. р.)" })).toEqual([
      "vocab-example",
    ]);
    expect(await ruleIdsForCard({ ...paired, answer: "дом — *dom*" })).toEqual([
      "vocab-example",
    ]);
  });

  it("requires a link to a summary section in Sources", async () => {
    expect(
      await ruleIdsForCard({
        rest: "## Sources\n\n- [Docs](https://example.org)",
      }),
    ).toEqual(["summary-link"]);
    expect(await ruleIdsForCard({ rest: "" })).toEqual(["summary-link"]);
  });
});

describe("check: repository rules", () => {
  it("flags an id used by two files and names the other file", async () => {
    const files = repoWith([
      { id: "7k2m9xqd", file: "content/arch/flow/cards/7k2m9xqd.md" },
      { id: "7k2m9xqd", file: "content/arch/flow/cards/aaaaaaaa.md" },
    ]);
    const { findings } = await checkContent({ files });
    expect(findings).toMatchObject([
      {
        ruleId: "id-unique",
        file: "content/arch/flow/cards/7k2m9xqd.md",
        params: { other: "content/arch/flow/cards/aaaaaaaa.md" },
      },
      {
        ruleId: "id-unique",
        file: "content/arch/flow/cards/aaaaaaaa.md",
        params: { other: "content/arch/flow/cards/7k2m9xqd.md" },
      },
    ]);
  });

  it("flags a stale diagram and a source without an SVG", async () => {
    const source = "flowchart LR\n  a --> b\n";
    const fresh = `${sourceMarker(await sha256Hex(source))}\n<svg></svg>`;
    const files = repoWith(
      [],
      [
        ["content/arch/flow/diagrams/ok.mmd", source],
        ["content/arch/flow/diagrams/ok.svg", fresh],
        ["content/arch/flow/diagrams/old.mmd", `${source}  b --> c\n`],
        ["content/arch/flow/diagrams/old.svg", fresh],
        ["content/arch/flow/diagrams/new.mmd", source],
      ],
    );
    const { findings } = await checkContent({ files });
    expect(findings.map((finding) => [finding.ruleId, finding.file])).toEqual([
      ["diagram-svg-missing", "content/arch/flow/diagrams/new.mmd"],
      ["diagram-stale", "content/arch/flow/diagrams/old.svg"],
    ]);
  });

  it("warns about a large rewrite of an active card and keeps the exit clean", async () => {
    const file = "content/arch/flow/cards/7k2m9xqd.md";
    const before = cardText({
      id: "7k2m9xqd",
      answer: "Bound the queue so memory stays flat",
    });
    const files = repoWith([
      { id: "7k2m9xqd", answer: "Retry with jitter after timeouts expire" },
    ]);
    const result = await checkContent({
      files,
      baseline: new Map([[file, before]]),
    });
    expect(result.findings).toMatchObject([
      {
        ruleId: "active-edit",
        severity: "warning",
        params: { section: "Answer" },
      },
    ]);
    expect(result.errorCount).toBe(0);
  });

  it("stays silent on a typo fix and on a draft", async () => {
    const file = "content/arch/flow/cards/7k2m9xqd.md";
    const files = repoWith([
      { id: "7k2m9xqd", answer: "Bound the queue so memory stays flat" },
    ]);
    const typo = cardText({
      id: "7k2m9xqd",
      answer: "Bound the queue so memory stay flat",
    });
    expect(
      await ruleIdsOf({ files, baseline: new Map([[file, typo]]) }),
    ).toEqual([]);
    const draft = cardText({
      id: "7k2m9xqd",
      status: "draft",
      answer: "Something else entirely here",
    });
    expect(
      await ruleIdsOf({ files, baseline: new Map([[file, draft]]) }),
    ).toEqual([]);
  });
});

describe("check: findings never quote content", () => {
  it("keeps question and answer text out of every parameter", async () => {
    const secret = "zebra-quokka";
    const { findings } = await checkContent({
      files: repoWith([
        {
          question: `${secret} ${words(30)}`,
          answer: `${secret} ${words(20)}`,
          rest: "",
        },
        { type: "vocab", answer: secret },
      ]),
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(JSON.stringify(findings)).not.toContain(secret);
  });
});
