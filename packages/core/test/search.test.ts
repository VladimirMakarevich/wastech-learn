import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  foldDiacritics,
  isLearnError,
  loadSearchIndex,
  parseContent,
} from "../src/index.js";
import { repoWith, topicFiles } from "./content-builders.js";

const model = async () =>
  (
    await parseContent(
      repoWith(
        [
          {
            id: "7k2m9xqd",
            question:
              "[Streaming] Why does a consumer signal demand to the producer?",
            answer: "So the producer never overflows it.",
          },
          {
            id: "9q8w7e6r",
            type: "why",
            question: "[TCP] What does the receive window tell the sender?",
            answer: "How many bytes it may send.",
          },
          {
            id: "h3p8w1zr",
            status: "draft",
            question: "[Streaming] What happens to a buffer without a bound?",
            answer: "It grows until memory runs out.",
          },
        ],
        [
          ...topicFiles("lang-pl", "w-restauracji", "pl"),
          [
            "content/lang-pl/w-restauracji/cards/e4ej1s8e.md",
            [
              "---",
              "id: e4ej1s8e",
              "type: basic",
              "status: active",
              "bloom: remember",
              "grading: self",
              "origin: manual",
              "created: 2026-11-25",
              "---",
              "",
              "# rachunek",
              "",
              "## Question",
              "",
              "[pl] Jak poprosić o rachunek po zamówieniu żurku?",
              "",
              "## Answer",
              "",
              "Poproszę rachunek.",
              "",
            ].join("\n"),
          ],
        ],
      ),
    )
  ).model;

describe("content search", () => {
  it("ranks a card first when searched by the words of its question", async () => {
    const index = buildSearchIndex(await model());
    const hits = index.search("consumer signal demand producer");
    expect(hits[0]).toMatchObject({
      kind: "card",
      id: "7k2m9xqd",
      file: "content/arch/flow/cards/7k2m9xqd.md",
    });
    expect(hits[0]?.snippet).toBe(
      "[Streaming] Why does a consumer signal demand to the producer?",
    );
  });

  it("filters by domain, type and status", async () => {
    const index = buildSearchIndex(await model());
    expect(
      index.search("streaming", { status: "draft" }).map((hit) => hit.id),
    ).toEqual(["h3p8w1zr"]);
    expect(
      index.search("window sender", { type: "why" }).map((hit) => hit.id),
    ).toEqual(["9q8w7e6r"]);
    expect(index.search("rachunek", { domain: "arch" })).toEqual([]);
  });

  it("finds a Polish word typed without diacritics", async () => {
    const index = buildSearchIndex(await model());
    expect(index.search("zurku")[0]?.id).toBe("e4ej1s8e");
    expect(index.search("poprosic")[0]?.id).toBe("e4ej1s8e");
  });

  it("finds topics by their title and key idea", async () => {
    const index = buildSearchIndex(await model());
    expect(index.search("flow", { limit: 1 })).toEqual([
      expect.objectContaining({
        kind: "topic",
        id: "arch/flow",
        type: undefined,
      }),
    ]);
  });

  it("folds Polish and Russian diacritics, including ł", () => {
    expect(foldDiacritics("Łódź żurek ёлка")).toBe("lodz zurek елка");
  });
});

describe("serialized search index", () => {
  it("answers every query exactly as the index it was built from", async () => {
    const built = buildSearchIndex(await model());
    const loaded = loadSearchIndex(built.serialize());
    for (const [query, filters] of [
      ["consumer signal demand producer", {}],
      ["streaming", { status: "draft" }],
      ["window sender", { type: "why" }],
      ["zurku", {}],
      ["poprosic", {}],
      ["flow", { limit: 1 }],
      ["produc", {}],
    ] as const) {
      expect(loaded.search(query, filters)).toEqual(
        built.search(query, filters),
      );
    }
    expect(loaded.search("zurku")[0]?.id).toBe("e4ej1s8e");
  });

  it("is the same text for the same content", async () => {
    expect(buildSearchIndex(await model()).serialize()).toBe(
      buildSearchIndex(await model()).serialize(),
    );
  });

  it("refuses text that is not an index with a typed error", () => {
    for (const broken of ["", "{}", "not json"]) {
      let caught: unknown;
      try {
        loadSearchIndex(broken);
      } catch (error) {
        caught = error;
      }
      expect(isLearnError(caught) && caught.code).toBe("search-index-invalid");
    }
  });
});
