import { describe, expect, it } from "vitest";
import {
  TOOL_INPUT_SCHEMAS,
  buildSearchIndex,
  checkContent,
  parseContent,
  parseLearningPackage,
  promptMarkdown,
  readDocument,
  revealFor,
  sectionMarkdown,
  topicIndexDocument,
  withCardLinks,
  writeDocument,
  type Card,
} from "../src/index.js";
import { repoWith, topicFiles, type CardSpec } from "./content-builders.js";

const cardOf = async (spec: CardSpec): Promise<Card> => {
  const { model } = await parseContent(repoWith([spec]));
  const card = model.cards[0];
  if (card === undefined) throw new Error("card did not parse");
  return card;
};

describe("quiz prompts", () => {
  it("ask the reverse of a vocab card without the example sentence that holds the word", async () => {
    const card = await cardOf({
      type: "vocab",
      extraFrontMatter: "langPair: pl-ru",
      question: "[pl: restauracja] rachunek",
      answer: "счёт (м. р.) — *Poproszę rachunek.*",
    });
    expect(promptMarkdown(card, "rev")).toBe("счёт (м. р.)");
    expect(revealFor(card, "rev")).toMatchObject({
      answer: "[pl: restauracja] rachunek",
      example: "счёт (м. р.) — *Poproszę rachunek.*",
    });
    expect(promptMarkdown(card, "fwd")).toBe("[pl: restauracja] rachunek");
  });

  it("hide a zero-padded cloze gap of the asked variant", async () => {
    const card = await cardOf({
      type: "cloze",
      question: "[Geo] {{c01::Warsaw}} is the capital of {{c2::Poland}}.",
      answer: "Warsaw, Poland.",
    });
    expect(promptMarkdown(card, "c1")).toBe(
      "[Geo] […] is the capital of Poland.",
    );
    expect(revealFor(card, "c1").cloze).toEqual(["Warsaw"]);
  });

  it("are reported by check when a cloze gap never closes", async () => {
    const files = repoWith([
      {
        type: "cloze",
        question: "[Geo] The capital is {{c1::Paris and {{c2::Berlin}} too.",
        answer: "Paris, Berlin.",
      },
    ]);
    const { findings } = await checkContent({ files });
    expect(findings.map((finding) => finding.ruleId)).toContain(
      "cloze-unclosed",
    );
  });
});

describe("search with duplicate ids", () => {
  it("still builds when two card files share an id", async () => {
    const files = repoWith([
      { id: "7k2m9xqd", file: "content/arch/flow/cards/7k2m9xqd.md" },
      { id: "7k2m9xqd", file: "content/arch/flow/cards/copy.md" },
    ]);
    const { model } = await parseContent(files);
    const hits = buildSearchIndex(model).search("what is it");
    expect(hits.filter((hit) => hit.id === "7k2m9xqd")).toHaveLength(2);
  });
});

describe("tool input", () => {
  it("refuses a level-2 heading or a setext underline inside an answer", () => {
    const card = {
      title: "T",
      type: "basic",
      bloom: "remember",
      grading: "self",
      status: "draft",
      question: "[X] What waits?",
    };
    for (const answer of [
      "The writer.\n---\nSee DropOldest.",
      "The writer.\n\n## Notes\n\nMore.",
    ]) {
      const parsed = TOOL_INPUT_SCHEMAS.add_cards.safeParse({
        topic: "arch/flow",
        dryRun: true,
        cards: [{ ...card, answer }],
      });
      expect(parsed.error?.issues[0]?.path).toEqual(["cards", 0, "answer"]);
    }
    const deeper = TOOL_INPUT_SCHEMAS.add_cards.safeParse({
      topic: "arch/flow",
      dryRun: true,
      cards: [{ ...card, answer: "The writer.\n\n### Detail\n\nMore." }],
    });
    expect(deeper.success).toBe(true);
  });
});

describe("serialization fixes", () => {
  it("keeps a multi-line title on one front matter line", () => {
    const text = writeDocument(
      topicIndexDocument({
        frontMatter: {
          title: "Kafka\nbasics",
          domain: "arch",
          lang: "en",
          status: "active",
          familiarity: "new",
          created: "2026-11-26",
          origin: "claude-code",
        },
        keyIdea: "Idea.",
        pretest: [],
        cards: [],
      }),
    );
    expect(text).toContain("title: Kafka basics\n");
  });

  it("refreshes a card's title in ## Cards and keeps the author's note after the link", () => {
    const index = topicFiles()[0]?.[1] ?? "";
    const document = readDocument(
      index.replace(
        "## Key idea",
        "## Cards\n\n- [Old](cards/7k2m9xqd.md) — my note\n\n## Key idea",
      ),
    );
    if (document === undefined) throw new Error("no front matter");
    const updated = withCardLinks(document, [
      { id: "7k2m9xqd", title: "New $& title" },
    ]);
    expect(sectionMarkdown(updated, "Cards")).toBe(
      "- [New $& title](cards/7k2m9xqd.md) — my note",
    );
  });
});

describe("learning package fixes", () => {
  const base = [
    "---",
    "package: wastech-learn/v1",
    "source: chatgpt",
    "lang: en",
    "domain: architecture",
    "topic: locks",
    "familiarity: new",
    "created: 2026-11-25",
    "---",
    "",
    "# Locks",
    "",
    "## Topic",
    "",
    "Key idea: A lock serializes access.",
    "",
    "## Summary",
    "",
    "### TL;DR",
    "Locks serialize.",
    "",
    "## Materials",
    "",
    "| Title | Kind | Why |",
    "| --- | --- | --- |",
    "| [Lock](https://en.wikipedia.org/wiki/Lock_(computer_science)) | article | Overview |",
    "| [Spaced](<https://example.org/a b>) | docs | Angle form |",
    "",
    "## Cards",
    "",
    "### why · understand · lock-purpose",
    "Q: [Locks] Why take a lock around a counter update?",
    "A: Two threads would lose an increment.",
    "",
    "Read-modify-write is not atomic.",
    "",
  ].join("\n");

  it("accepts URLs with parentheses or spaces and keeps blank lines inside an answer", () => {
    const { package: parsed, findings } = parseLearningPackage(
      "inbox/locks.md",
      base,
    );
    expect(findings).toEqual([]);
    expect(parsed?.materials.map((item) => item.url)).toEqual([
      "https://en.wikipedia.org/wiki/Lock_(computer_science)",
      "https://example.org/a b",
    ]);
    expect(parsed?.cards[0]?.answer).toBe(
      "Two threads would lose an increment.\n\nRead-modify-write is not atomic.",
    );
  });
});
