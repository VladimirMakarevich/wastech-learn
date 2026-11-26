import { describe, expect, it } from "vitest";
import { parseLearningPackage } from "../src/index.js";

const FILE = "inbox/backpressure.md";

const lines = (...rows: string[]): string => `${rows.join("\n")}\n`;

const FRONT_MATTER = [
  "---",
  "package: wastech-learn/v1",
  "source: chatgpt",
  "lang: en",
  "domain: architecture",
  "topic: backpressure",
  "familiarity: new",
  "created: 2026-11-25",
  "---",
];

// The example from the learning package format, with a second card and a scenario rubric added.
const EXAMPLE = lines(
  ...FRONT_MATTER,
  "",
  "# Backpressure",
  "",
  "## Topic",
  "",
  "Key idea: A slow consumer must be able to slow down a fast producer.",
  "",
  "## Summary",
  "",
  "### TL;DR",
  "Feedback from a slower consumer keeps buffers bounded.",
  "### Mental model",
  "A sink with a narrow drain.",
  "",
  "## Materials",
  "",
  "| Title | Kind | Why |",
  "| --- | --- | --- |",
  "| [Reactive Streams spec](https://www.reactive-streams.org/) | docs | Formal definition |",
  "",
  "## Diagrams",
  "",
  "```mermaid",
  "flowchart LR",
  "  P[Producer] -->|request n| C[Consumer]",
  "```",
  "",
  "## Cards",
  "",
  "### why · understand · backpressure-purpose",
  "Q: [Streaming] Why does a consumer signal demand to the producer?",
  "A: To keep the producer from overflowing the consumer's buffer.",
  "",
  "### scenario · analyze · overload",
  "Q: [Kafka] Consumer lag grows for an hour and the pod is OOM-killed. What do you check first?",
  "A: Whether the consumer buffers without a bound.",
  "R: (!) Names the unbounded buffer",
  "R: (!) Proposes a bound or pause",
  "- Mentions max.poll.records",
  "E: Lag is the symptom; memory is the cause.",
);

describe("learning package v1", () => {
  it("parses the documented example into a topic, summary, materials, diagrams and candidates", () => {
    const { package: parsed, findings } = parseLearningPackage(FILE, EXAMPLE);
    expect(findings).toEqual([]);
    expect(parsed?.frontMatter).toMatchObject({
      source: "chatgpt",
      domain: "architecture",
      topic: "backpressure",
    });
    expect(parsed?.title).toBe("Backpressure");
    expect(parsed?.keyIdea).toBe(
      "A slow consumer must be able to slow down a fast producer.",
    );
    expect(parsed?.summary).toEqual({
      "TL;DR": "Feedback from a slower consumer keeps buffers bounded.",
      "Mental model": "A sink with a narrow drain.",
    });
    expect(parsed?.materials).toEqual([
      {
        title: "Reactive Streams spec",
        url: "https://www.reactive-streams.org/",
        kind: "docs",
        why: "Formal definition",
        status: "to-read",
      },
    ]);
    expect(parsed?.diagrams).toEqual([
      "flowchart LR\n  P[Producer] -->|request n| C[Consumer]",
    ]);
    expect(parsed?.cards).toEqual([
      {
        index: 1,
        type: "why",
        bloom: "understand",
        idea: "backpressure-purpose",
        question:
          "[Streaming] Why does a consumer signal demand to the producer?",
        answer: "To keep the producer from overflowing the consumer's buffer.",
        rubric: [],
        explanation: undefined,
      },
      {
        index: 2,
        type: "scenario",
        bloom: "analyze",
        idea: "overload",
        question:
          "[Kafka] Consumer lag grows for an hour and the pod is OOM-killed. What do you check first?",
        answer: "Whether the consumer buffers without a bound.",
        rubric: [
          "(!) Names the unbounded buffer",
          "(!) Proposes a bound or pause",
          "Mentions max.poll.records",
        ],
        explanation: "Lag is the symptom; memory is the cause.",
      },
    ]);
  });

  it("accepts a package still wrapped in the code fence the chat answered with", () => {
    const wrapped = `\`\`\`\`md\n${EXAMPLE}\`\`\`\`\n`;
    const { package: parsed, findings } = parseLearningPackage(FILE, wrapped);
    expect(findings).toEqual([]);
    expect(parsed?.cards).toHaveLength(2);
  });

  it("names the front matter field that is wrong", () => {
    const broken = EXAMPLE.replace("familiarity: new", "familiarity: expert");
    expect(parseLearningPackage(FILE, broken)).toEqual({
      package: undefined,
      findings: [
        {
          ruleId: "front-matter-schema",
          severity: "error",
          file: FILE,
          line: 1,
          params: { field: "familiarity" },
        },
      ],
    });
  });

  it("rejects another package version by its field", () => {
    const newer = EXAMPLE.replace("wastech-learn/v1", "wastech-learn/v2");
    expect(parseLearningPackage(FILE, newer).findings[0]?.params).toEqual({
      field: "package",
    });
  });

  it("reports a file without front matter", () => {
    expect(
      parseLearningPackage(FILE, "# Just notes\n").findings[0]?.ruleId,
    ).toBe("front-matter-missing");
  });

  it("keeps the good candidates and names the broken one with its field", () => {
    const broken = EXAMPLE.replace(
      "### why · understand · backpressure-purpose",
      "### why · memorize · backpressure-purpose",
    );
    const { package: parsed, findings } = parseLearningPackage(FILE, broken);
    expect(parsed?.cards.map((card) => card.index)).toEqual([2]);
    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: "package-card",
        params: { card: 1, field: "bloom" },
      }),
    ]);
  });

  it("reports a candidate without an answer and a missing required section", () => {
    const text = EXAMPLE.replace(
      "A: To keep the producer from overflowing the consumer's buffer.\n",
      "",
    ).replace("## Topic", "## Overview");
    const { findings } = parseLearningPackage(FILE, text);
    expect(findings.map((finding) => [finding.ruleId, finding.params])).toEqual(
      expect.arrayContaining([
        ["section-missing", { section: "Topic" }],
        ["package-card", { card: 1, field: "A" }],
      ]),
    );
  });

  it("flags a materials row with an unknown kind and a summary section outside the template", () => {
    const text = EXAMPLE.replace("| docs |", "| podcast |").replace(
      "### Mental model",
      "### Fun facts",
    );
    const { package: parsed, findings } = parseLearningPackage(FILE, text);
    expect(parsed?.materials).toEqual([]);
    expect(
      findings.map((finding) => [
        finding.ruleId,
        finding.severity,
        finding.params,
      ]),
    ).toEqual([
      ["package-summary-section", "warning", { section: "Fun facts" }],
      ["package-material", "error", { field: "Kind" }],
    ]);
  });
});
