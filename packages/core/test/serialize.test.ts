import { describe, expect, it } from "vitest";
import {
  SUMMARY_SECTIONS,
  cardDocument,
  checkContent,
  materialsDocument,
  mergeSummary,
  parseContent,
  patchCardDocument,
  readDocument,
  readMaterials,
  sectionMarkdown,
  successorCardDocument,
  summaryDocument,
  topicIndexDocument,
  withCardLinks,
  withFrontMatterValue,
  withMaterials,
  withSummarySections,
  writeDocument,
  type CardFields,
  type ContentDocument,
  type MaterialItem,
} from "../src/index.js";

const DIR = "content/arch/flow";

const fields: CardFields = {
  title: "Why a consumer signals demand",
  type: "scenario",
  bloom: "analyze",
  grading: "ai",
  status: "draft",
  idea: "demand-signal",
  tags: ["backpressure"],
  question:
    "[Streaming] A producer floods a slow consumer. What do you change first?",
  answer:
    "Let the consumer request items so the producer sends at most that many.",
  rubric: ["(!) Consumer-driven demand", "Bounded buffer"],
  explanation: "Demand flows upstream.",
  sources: [{ title: "Summary: TL;DR", url: "../summary.md#tldr" }],
};

const meta = {
  id: "7k2m9xqd",
  origin: "claude-code",
  created: "2026-11-26",
} as const;

const doc = (text: string): ContentDocument => {
  const parsed = readDocument(text);
  if (parsed === undefined) throw new Error("no front matter");
  return parsed;
};

const topic = (): [string, string][] => {
  const index = topicIndexDocument({
    frontMatter: {
      title: "Flow: control",
      domain: "arch",
      lang: "en",
      status: "active",
      familiarity: "new",
      created: "2026-11-26",
      origin: "claude-code",
      tags: ["streaming"],
    },
    keyIdea: "A slow consumer slows a fast producer.",
    pretest: [
      { question: "What grows first?", answer: "The buffer", confidence: 2 },
      { question: "Is a bigger buffer a fix?" },
    ],
    cards: [],
  });
  return [
    [`${DIR}/index.md`, writeDocument(index)],
    [
      `${DIR}/summary.md`,
      writeDocument(
        summaryDocument({
          title: "Flow: control",
          status: "draft",
          updated: "2026-11-26",
          template: SUMMARY_SECTIONS,
          sections: { "TL;DR": "Feedback keeps buffers bounded." },
        }),
      ),
    ],
    [
      `${DIR}/materials.md`,
      writeDocument(
        materialsDocument({
          title: "Flow: materials",
          updated: "2026-11-26",
          items: [],
        }),
      ),
    ],
  ];
};

describe("card serialization", () => {
  it("writes a card the content parser reads back field for field", async () => {
    const text = writeDocument(cardDocument(fields, meta));
    const { model, findings } = await parseContent(
      new Map([...topic(), [`${DIR}/cards/${meta.id}.md`, text]]),
    );
    expect(findings).toEqual([]);
    const card = model.cards[0];
    expect(card?.frontMatter).toEqual({
      id: meta.id,
      type: "scenario",
      status: "draft",
      bloom: "analyze",
      grading: "ai",
      idea: "demand-signal",
      tags: ["backpressure"],
      origin: "claude-code",
      created: "2026-11-26",
    });
    expect(card?.title).toBe(fields.title);
    expect(card?.question.markdown).toBe(fields.question);
    expect(card?.answer.markdown).toBe(fields.answer);
    expect(card?.sections.map((section) => section.name)).toEqual([
      "Question",
      "Answer",
      "Rubric",
      "Explanation",
      "Sources",
    ]);
  });

  it("round-trips a document byte for byte", () => {
    const text = writeDocument(cardDocument(fields, meta));
    expect(writeDocument(doc(text))).toBe(text);
  });

  it("changes only the patched fields of an existing card and keeps the author's extras", () => {
    const original = writeDocument(cardDocument(fields, meta))
      .replace("status: draft", "status: draft # picked during capture")
      .replace("## Sources", "## Notes\n\nMy own note.\n\n## Sources");
    const patched = writeDocument(
      patchCardDocument(doc(original), {
        answer: "Consumer-driven demand.",
        status: "active",
      }),
    );
    expect(patched).toContain("status: active");
    expect(patched).toContain("## Answer\n\nConsumer-driven demand.\n");
    expect(patched).toContain("My own note.");
    expect(
      patched
        .replace("status: active", "status: draft # picked during capture")
        .replace("Consumer-driven demand.", fields.answer),
    ).toBe(original);
  });

  it("removes a section when its list is emptied", () => {
    const patched = patchCardDocument(
      doc(writeDocument(cardDocument(fields, meta))),
      { rubric: [] },
    );
    expect(sectionMarkdown(patched, "Rubric")).toBeUndefined();
  });

  it("gives a successor a new identity and leaves the rest of the text", () => {
    const successor = writeDocument(
      successorCardDocument(
        doc(writeDocument(cardDocument(fields, meta))),
        { question: "[Streaming] Who sets the pace under backpressure?" },
        { id: "9q8w7e6r", origin: "manual", created: "2026-12-01" },
      ),
    );
    expect(successor).toContain("id: 9q8w7e6r");
    expect(successor).toContain("created: 2026-12-01");
    expect(successor).toContain("origin: manual");
    expect(successor).toContain(fields.answer);
  });

  it("escapes brackets in titles of source links", () => {
    const text = writeDocument(
      cardDocument(
        {
          ...fields,
          sources: [{ title: "Spec [draft]", url: "https://example.org/a b" }],
        },
        meta,
      ),
    );
    expect(text).toContain("- [Spec \\[draft\\]](<https://example.org/a b>)");
  });
});

describe("topic, summary and materials serialization", () => {
  it("builds a new topic that parses and passes check apart from empty-section gaps", async () => {
    const files = new Map(topic());
    const result = await checkContent({ files });
    expect(result.errorCount).toBe(0);
    const index = files.get(`${DIR}/index.md`) ?? "";
    expect(index).toContain('title: "Flow: control"');
    expect(index).toContain(
      "1. What grows first? — The buffer (2/3)\n2. Is a bigger buffer a fix?",
    );
  });

  it("appends card links once, in order, after the existing ones", () => {
    const text = topic()[0]?.[1] ?? "";
    const once = withCardLinks(doc(text), [
      { id: "7k2m9xqd", title: "First" },
      { id: "9q8w7e6r", title: "Second" },
    ]);
    const twice = withCardLinks(once, [{ id: "7k2m9xqd", title: "First" }]);
    expect(sectionMarkdown(twice, "Cards")).toBe(
      "- [First](cards/7k2m9xqd.md)\n- [Second](cards/9q8w7e6r.md)",
    );
  });

  it("rewrites the given summary sections and keeps the others", () => {
    const summary = doc(topic()[1]?.[1] ?? "");
    const updated = withSummarySections(summary, {
      sections: { "Mental model": "A sink with a drain." },
      template: SUMMARY_SECTIONS,
      updated: "2026-11-27",
    });
    expect(sectionMarkdown(updated, "TL;DR")).toBe(
      "Feedback keeps buffers bounded.",
    );
    expect(sectionMarkdown(updated, "Mental model")).toBe(
      "A sink with a drain.",
    );
    expect(updated.frontMatter).toContain("updated: 2026-11-27");
  });

  it("merges an import: fills empty sections, parks conflicting text under Open questions, and is idempotent", () => {
    const summary = doc(topic()[1]?.[1] ?? "");
    const incoming = {
      "TL;DR": "Backpressure bounds buffers by slowing producers.",
      Comparison: "| Mechanism | Pace |\n| --- | --- |\n| TCP | rwnd |",
    } as const;
    const options = { template: SUMMARY_SECTIONS, updated: "2026-11-27" };
    const merged = mergeSummary(summary, incoming, options);
    expect(sectionMarkdown(merged, "TL;DR")).toBe(
      "Feedback keeps buffers bounded.",
    );
    expect(sectionMarkdown(merged, "Comparison")).toBe(incoming.Comparison);
    expect(sectionMarkdown(merged, "Open questions")).toBe(
      "### TL;DR\n\nBackpressure bounds buffers by slowing producers.",
    );
    expect(writeDocument(mergeSummary(merged, incoming, options))).toBe(
      writeDocument(merged),
    );
  });

  it("round-trips materials rows and appends only links not listed yet", () => {
    const items: MaterialItem[] = [
      {
        title: "Reactive Streams",
        url: "https://www.reactive-streams.org/",
        kind: "docs",
        why: "The demand protocol | spec",
        status: "to-read",
      },
      {
        title: "SRE book",
        url: "https://sre.google/sre-book/handling-overload/",
        kind: "book",
        why: "Load shedding",
        status: "reference",
      },
    ];
    const empty = doc(topic()[2]?.[1] ?? "");
    const once = withMaterials(empty, items, "2026-11-27");
    expect(readMaterials(sectionMarkdown(once, "Materials") ?? "")).toEqual(
      items,
    );
    const again = withMaterials(
      once,
      [{ ...items[0]!, status: "read" }],
      "2026-11-28",
    );
    expect(again).toBe(once);
  });

  it("sets and removes a front matter key without touching its neighbours", () => {
    const base = doc(
      "---\ntitle: A\n# keep me\ntags:\n  - x\n  - y\nlang: en\n---\n\n# A\n",
    );
    const changed = withFrontMatterValue(base, "tags", ["z"]);
    expect(changed.frontMatter).toBe(
      "title: A\n# keep me\ntags: [z]\nlang: en",
    );
    expect(withFrontMatterValue(changed, "tags", undefined).frontMatter).toBe(
      "title: A\n# keep me\nlang: en",
    );
  });
});
