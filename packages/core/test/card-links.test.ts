import { describe, expect, it } from "vitest";
import {
  readDocument,
  sectionMarkdown,
  withRestoredCardLink,
  withoutCardLink,
  writeDocument,
  type ContentDocument,
} from "../src/index.js";

const index = (cards: string): ContentDocument => {
  const document = readDocument(
    `---\ntitle: T\n---\n\n# T\n\n## Key idea\n\nIdea.\n\n## Pretest\n\n1. Q?\n\n## Cards\n\n${cards}\n`,
  );
  if (document === undefined) throw new Error("not a document");
  return document;
};

const cardsOf = (document: ContentDocument): string =>
  sectionMarkdown(document, "Cards") ?? "";

const A = "- [A](cards/aaaaaaaa.md)";
const B = "- [B](cards/bbbbbbbb.md) — a note";
const C = "- [C](cards/cccccccc.md)";

describe("removing a card's line", () => {
  it("drops only that line and keeps the others with their notes", () => {
    expect(
      cardsOf(withoutCardLink(index([A, B, C].join("\n")), "aaaaaaaa")),
    ).toBe([B, C].join("\n"));
  });

  it("returns the same document when the card is not listed", () => {
    const document = index(A);
    expect(withoutCardLink(document, "zzzzzzzz")).toBe(document);
  });
});

describe("restoring a card's line", () => {
  const committed = index([A, B, C].join("\n"));

  it("puts the committed line after the card that preceded it", () => {
    const restored = withRestoredCardLink(index([A, C].join("\n")), committed, {
      id: "bbbbbbbb",
      title: "B",
    });
    expect(cardsOf(restored)).toBe([A, B, C].join("\n"));
  });

  it("puts the first card first, and after earlier cards that are gone too", () => {
    expect(
      cardsOf(
        withRestoredCardLink(index(C), committed, {
          id: "aaaaaaaa",
          title: "A",
        }),
      ),
    ).toBe([A, C].join("\n"));
    expect(
      cardsOf(
        withRestoredCardLink(index(A), committed, {
          id: "cccccccc",
          title: "C",
        }),
      ),
    ).toBe([A, C].join("\n"));
  });

  it("fills an empty list and leaves a listed card alone", () => {
    expect(
      cardsOf(
        withRestoredCardLink(index(""), committed, {
          id: "bbbbbbbb",
          title: "B",
        }),
      ),
    ).toBe(B);
    const listed = index([A, B].join("\n"));
    expect(
      withRestoredCardLink(listed, committed, { id: "bbbbbbbb", title: "B" }),
    ).toBe(listed);
  });

  it("appends a fresh line when the committed index never listed the card", () => {
    const restored = withRestoredCardLink(index(A), index(A), {
      id: "dddddddd",
      title: "D",
    });
    expect(writeDocument(restored)).toContain("- [D](cards/dddddddd.md)");
  });
});
