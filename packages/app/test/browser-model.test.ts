import type { ContentSearchIndex, SearchHit } from "@wastech-learn/core";
import { describe, expect, it } from "vitest";
import {
  NO_FILTERS,
  filterRows,
  type BrowserRow,
} from "../src/app/screens/browser/browser-model";

const row = (item: string, extra: Partial<BrowserRow> = {}): BrowserRow => ({
  item,
  cardId: item.slice(0, item.indexOf(":")),
  variant: item.slice(item.indexOf(":") + 1),
  multi: false,
  title: item,
  type: "basic",
  domain: "arch",
  topic: "arch/flow",
  topicTitle: "Flow",
  tags: [],
  status: "active",
  leech: false,
  changed: false,
  retrievability: null,
  dueAt: null,
  lapses: 0,
  lastRating: null,
  ...extra,
});

const ROWS = [
  row("a0000001:main"),
  row("a0000002:main", { leech: true, lapses: 8, tags: ["streaming"] }),
  row("p0000001:fwd", {
    domain: "lang-pl",
    topic: "lang-pl/words",
    type: "vocab",
    multi: true,
  }),
  row("p0000001:rev", {
    domain: "lang-pl",
    topic: "lang-pl/words",
    type: "vocab",
    multi: true,
    status: "suspended",
  }),
  row("a0000003:main", { changed: true }),
];

const hit = (kind: SearchHit["kind"], id: string): SearchHit => ({
  kind,
  id,
  title: id,
  file: "",
  topic: "",
  domain: kind === "topic" ? (id.split("/")[0] ?? "") : "",
  type: undefined,
  status: "active",
  snippet: "",
  score: 1,
});

const index = (hits: readonly SearchHit[]): ContentSearchIndex => ({
  search: () => hits,
  serialize: () => "",
});

const items = (result: { rows: readonly BrowserRow[] }) =>
  result.rows.map((entry) => entry.item);

describe("browser filters", () => {
  it("keep every row without filters, in the bundle's order", () => {
    expect(items(filterRows(ROWS, NO_FILTERS, undefined))).toEqual(
      ROWS.map((entry) => entry.item),
    );
  });

  it("each narrow the list, and together they intersect", () => {
    expect(
      items(filterRows(ROWS, { ...NO_FILTERS, leech: true }, undefined)),
    ).toEqual(["a0000002:main"]);
    expect(
      items(filterRows(ROWS, { ...NO_FILTERS, changed: true }, undefined)),
    ).toEqual(["a0000003:main"]);
    expect(
      items(
        filterRows(ROWS, { ...NO_FILTERS, status: "suspended" }, undefined),
      ),
    ).toEqual(["p0000001:rev"]);
    expect(
      items(
        filterRows(
          ROWS,
          { ...NO_FILTERS, domain: "lang-pl", type: "vocab" },
          undefined,
        ),
      ),
    ).toEqual(["p0000001:fwd", "p0000001:rev"]);
    expect(
      items(
        filterRows(
          ROWS,
          { ...NO_FILTERS, tag: "streaming", domain: "lang-pl" },
          undefined,
        ),
      ),
    ).toEqual([]);
    expect(
      items(
        filterRows(
          ROWS,
          { ...NO_FILTERS, items: ["a0000001:main", "p0000001:rev"] },
          undefined,
        ),
      ),
    ).toEqual(["a0000001:main", "p0000001:rev"]);
  });

  it("order the rows by search rank, keep a card's variants together, and list matching topics apart", () => {
    const result = filterRows(
      ROWS,
      { ...NO_FILTERS, q: "word" },
      index([
        hit("card", "p0000001"),
        hit("topic", "lang-pl/words"),
        hit("card", "a0000002"),
      ]),
    );
    expect(items(result)).toEqual([
      "p0000001:fwd",
      "p0000001:rev",
      "a0000002:main",
    ]);
    expect(result.topics.map((topic) => topic.id)).toEqual(["lang-pl/words"]);
    expect(
      filterRows(
        ROWS,
        { ...NO_FILTERS, q: "word", domain: "arch" },
        index([hit("topic", "lang-pl/words")]),
      ).topics,
    ).toEqual([]);
  });
});

describe("the uncommitted filter", () => {
  it("keeps only rows of cards that differ from the last commit", () => {
    expect(
      items(
        filterRows(
          ROWS,
          { ...NO_FILTERS, uncommitted: true },
          undefined,
          new Set(["p0000001"]),
        ),
      ),
    ).toEqual(["p0000001:fwd", "p0000001:rev"]);
    expect(
      items(filterRows(ROWS, NO_FILTERS, undefined, new Set(["p0000001"]))),
    ).toHaveLength(ROWS.length);
  });
});
