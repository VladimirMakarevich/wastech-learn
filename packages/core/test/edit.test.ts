import { describe, expect, it } from "vitest";
import {
  cardEditDecision,
  editableKind,
  editableTopic,
  needsMeaningDecision,
  parseSourceSaveAnswer,
  sourceSaveBodySchema,
} from "../src/index.js";

const card = (
  fields: { status?: string; type?: string },
  question: string,
  answer: string,
): string => `---
id: 0d1gjcys
type: ${fields.type ?? "why"}
status: ${fields.status ?? "active"}
bloom: understand
grading: self
origin: claude-code
created: 2026-11-25
---

# A card

## Question

${question}

## Answer

${answer}
`;

const TEN = "one two three four five six seven eight nine ten";
const withChanged = (count: number): string =>
  TEN.split(" ")
    .map((word, index) => (index < count ? `x${String(index)}` : word))
    .join(" ");

describe("editableKind", () => {
  it("names the four files of a topic the app may edit", () => {
    expect(
      editableKind("content/architecture/backpressure/cards/0d1gjcys.md"),
    ).toBe("card");
    expect(editableKind("content/architecture/backpressure/index.md")).toBe(
      "topic-index",
    );
    expect(editableKind("content/architecture/backpressure/summary.md")).toBe(
      "summary",
    );
    expect(editableKind("content/architecture/backpressure/materials.md")).toBe(
      "materials",
    );
    expect(editableTopic("content/architecture/backpressure/summary.md")).toBe(
      "architecture/backpressure",
    );
  });

  it("refuses the log, diagrams, configs, climbing paths and anything outside a topic", () => {
    for (const path of [
      "reviews/2026/11/laptop-web.jsonl",
      "learn.config.json",
      "content/architecture/backpressure/diagrams/demand-flow.mmd",
      "content/architecture/backpressure/../../../learn.config.json",
      "content/architecture/../backpressure/index.md",
      "content/architecture/backpressure/cards/../index.md",
      "content/architecture/backpressure/.hidden.md",
      "content/architecture/index.md",
      "/content/architecture/backpressure/index.md",
      "inbox/note.md",
      "content/Architecture/backpressure/index.md",
      "content/architecture/backpressure/cards/nested/x.md",
    ])
      expect(editableKind(path), path).toBeUndefined();
    expect(editableTopic("learn.config.json")).toBeUndefined();
  });
});

describe("cardEditDecision", () => {
  it("asks only past the 40% threshold of Question or Answer words", () => {
    const before = card({}, "Why?", TEN);
    const atFour = cardEditDecision(before, card({}, "Why?", withChanged(4)));
    expect(needsMeaningDecision(atFour)).toBe(false);
    const atFive = cardEditDecision(before, card({}, "Why?", withChanged(5)));
    expect(atFive.largeEdit).toEqual([{ section: "Answer", percent: 50 }]);
    expect(needsMeaningDecision(atFive)).toBe(true);
  });

  it("never asks about a draft or a retired card", () => {
    for (const status of ["draft", "retired"]) {
      const before = card({ status }, "Why?", TEN);
      const after = card({ status }, "Why?", withChanged(10));
      expect(needsMeaningDecision(cardEditDecision(before, after))).toBe(false);
    }
    const retiring = cardEditDecision(
      card({}, "Why?", TEN),
      card({ status: "retired" }, "Why?", withChanged(10)),
    );
    expect(needsMeaningDecision(retiring)).toBe(false);
  });

  it("asks when a variant disappears and stays quiet when one is added", () => {
    const cloze = (question: string) => card({ type: "cloze" }, question, "x");
    const two = cloze("{{c1::A}} and {{c2::B}}");
    expect(
      cardEditDecision(two, cloze("{{c1::A}} and B")).removedVariants,
    ).toEqual(["c2"]);
    const added = cardEditDecision(
      two,
      cloze("{{c1::A}} and {{c2::B}} or {{c3::C}}"),
    );
    expect(needsMeaningDecision(added)).toBe(false);
    const reversed = cardEditDecision(
      card({ type: "basic" }, "Q", "A"),
      card({ type: "reversed" }, "Q", "A"),
    );
    expect(reversed.removedVariants).toEqual(["main"]);
  });

  it("leaves a card without its Question to the checks instead of asking", () => {
    const cloze = card({ type: "cloze" }, "{{c1::A}} and {{c2::B}}", "x");
    const headless = cloze.replace("## Question\n\n", "");
    expect(needsMeaningDecision(cardEditDecision(cloze, headless))).toBe(false);
  });

  it("leaves a text it cannot read to the checks", () => {
    expect(
      needsMeaningDecision(
        cardEditDecision(card({}, "Q", TEN), "no front matter"),
      ),
    ).toBe(false);
  });
});

describe("/api/source shapes", () => {
  const version = "a".repeat(64);

  it("parse a save body and refuse unknown fields or a bad version", () => {
    expect(
      sourceSaveBodySchema.safeParse({
        path: "content/a/b/index.md",
        version,
        text: "x",
      }).success,
    ).toBe(true);
    expect(
      sourceSaveBodySchema.safeParse({
        path: "p",
        version,
        text: "x",
        meaning: "new",
      }).success,
    ).toBe(true);
    expect(
      sourceSaveBodySchema.safeParse({ path: "p", version: "abc", text: "x" })
        .success,
    ).toBe(false);
    expect(
      sourceSaveBodySchema.safeParse({
        path: "p",
        version,
        text: "x",
        force: true,
      }).success,
    ).toBe(false);
    expect(
      sourceSaveBodySchema.safeParse({
        path: "p",
        version,
        text: "x",
        meaning: "maybe",
      }).success,
    ).toBe(false);
  });

  it("parse every answer into the app's terms", () => {
    const finding = {
      ruleId: "section-missing",
      severity: "error",
      file: "content/a/b/cards/x.md",
      line: 14,
      params: { section: "Answer" },
    };
    expect(
      parseSourceSaveAnswer({
        status: "written",
        paths: ["p"],
        findings: [],
        lint: [],
      }),
    ).toMatchObject({ kind: "saved", status: "written", card: undefined });
    expect(
      parseSourceSaveAnswer({
        status: "blocked",
        findings: [finding],
        lint: [],
      }),
    ).toEqual({
      kind: "blocked",
      findings: [finding],
      lint: [],
    });
    expect(
      parseSourceSaveAnswer({
        code: "decision-needed",
        largeEdit: [{ section: "Answer", percent: 60 }],
        removedVariants: [],
      }),
    ).toMatchObject({ kind: "decision", removedVariants: [] });
    expect(parseSourceSaveAnswer({ code: "content-changed" })).toEqual({
      kind: "refused",
      code: "content-changed",
    });
    expect(parseSourceSaveAnswer({ status: "nope" })).toBeUndefined();
  });
});
