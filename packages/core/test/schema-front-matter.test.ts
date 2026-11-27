import { describe, expect, it } from "vitest";
import {
  cardFrontMatterSchema,
  firstIssue,
  materialsFrontMatterSchema,
  summaryFrontMatterSchema,
  topicIndexFrontMatterSchema,
} from "../src/index.js";

const card = {
  id: "7k2m9xqd",
  type: "compare",
  status: "active",
  bloom: "analyze",
  grading: "self",
  idea: "saga-vs-2pc",
  tags: ["distributed-transactions"],
  origin: "claude-code",
  created: "2026-11-25",
};

const fieldOf = (
  result: ReturnType<typeof cardFrontMatterSchema.safeParse>,
): string => {
  if (result.success)
    throw new Error("expected the front matter to be rejected");
  return firstIssue(result.error).field;
};

describe("card front matter", () => {
  it("accepts a complete card", () => {
    expect(cardFrontMatterSchema.parse(card)).toEqual(card);
  });

  it("accepts a card captured in Codex and rejects an unknown client", () => {
    expect(
      cardFrontMatterSchema.parse({ ...card, origin: "codex" }).origin,
    ).toBe("codex");
    expect(
      fieldOf(cardFrontMatterSchema.safeParse({ ...card, origin: "gemini" })),
    ).toBe("origin");
  });

  it("names status when it is missing", () => {
    expect(
      fieldOf(cardFrontMatterSchema.safeParse({ ...card, status: undefined })),
    ).toBe("status");
  });

  it("rejects an id outside Crockford base32", () => {
    expect(
      fieldOf(cardFrontMatterSchema.safeParse({ ...card, id: "7k2m9xqi" })),
    ).toBe("id");
  });

  it("rejects a tag that is not kebab-case", () => {
    expect(
      fieldOf(cardFrontMatterSchema.safeParse({ ...card, tags: ["Async"] })),
    ).toBe("tags[0]");
  });

  it("rejects a created date that does not exist", () => {
    expect(
      fieldOf(
        cardFrontMatterSchema.safeParse({ ...card, created: "2026-02-30" }),
      ),
    ).toBe("created");
  });

  it("accepts the language pair of a vocab card", () => {
    const vocab = { ...card, type: "vocab", langPair: "pl-ru" };
    expect(cardFrontMatterSchema.parse(vocab).langPair).toBe("pl-ru");
  });
});

describe("topic front matter", () => {
  const index = {
    title: "Backpressure",
    domain: "architecture",
    lang: "en",
    status: "active",
    familiarity: "new",
    created: "2026-11-25",
    origin: "claude-code",
    tags: ["streaming"],
    related: ["dotnet/async-await"],
  };

  it("accepts a topic passport", () => {
    expect(topicIndexFrontMatterSchema.parse(index)).toEqual(index);
  });

  it("rejects a related topic that is not <domain>/<topic>", () => {
    const parsed = topicIndexFrontMatterSchema.safeParse({
      ...index,
      related: ["async-await"],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts the summary and materials front matter", () => {
    expect(
      summaryFrontMatterSchema.parse({
        status: "active",
        updated: "2026-11-25",
      }),
    ).toBeTruthy();
    expect(
      materialsFrontMatterSchema.parse({ updated: "2026-11-25" }),
    ).toBeTruthy();
  });

  it("rejects materials without an updated date", () => {
    expect(materialsFrontMatterSchema.safeParse({}).success).toBe(false);
  });
});
