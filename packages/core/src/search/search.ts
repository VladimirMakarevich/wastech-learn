import MiniSearch, { type Options, type SearchResult } from "minisearch";
import { LearnError } from "../errors.js";
import type { ContentModel } from "../model.js";
import { findSection } from "../parse/sections.js";
import { oneLine } from "../serialize/inline.js";

export type SearchHitKind = "topic" | "card";

/** One search result: enough to recognise and open the thing, never its full text. */
export interface SearchHit {
  readonly kind: SearchHitKind;
  /** The card id, or the topic path `<domain>/<topic>`. */
  readonly id: string;
  readonly title: string;
  /** Repository-relative file. */
  readonly file: string;
  readonly topic: string;
  readonly domain: string;
  readonly type: string | undefined;
  readonly status: string;
  /** The card's question or the topic's key idea, cut short: what a duplicate check compares by eye. */
  readonly snippet: string;
  readonly score: number;
}

export interface SearchFilters {
  readonly domain?: string | undefined;
  /** A card type; topics have none, so a type filter returns cards only. */
  readonly type?: string | undefined;
  readonly status?: string | undefined;
  readonly limit?: number | undefined;
}

interface IndexedDoc {
  readonly key: string;
  readonly kind: SearchHitKind;
  /** The hit's id; MiniSearch reserves `id` in results for the document key. */
  readonly ref: string;
  readonly title: string;
  readonly question: string;
  readonly answer: string;
  readonly body: string;
  readonly tags: string;
  readonly folded: string;
  readonly file: string;
  readonly topic: string;
  readonly domain: string;
  readonly type: string | undefined;
  readonly status: string;
  readonly snippet: string;
}

const STORED: readonly (keyof IndexedDoc)[] = [
  "kind",
  "ref",
  "title",
  "file",
  "topic",
  "domain",
  "type",
  "status",
  "snippet",
];

const SNIPPET_CHARS = 120;

const snippetOf = (markdown: string): string => {
  const line = oneLine(markdown);
  return line.length <= SNIPPET_CHARS
    ? line
    : `${line.slice(0, SNIPPET_CHARS - 1)}…`;
};

/**
 * Lower case without diacritics, so a Polish word typed on a keyboard without them still matches.
 * `ł` is a letter of its own rather than `l` with a combining mark, so it is mapped by hand.
 */
export const foldDiacritics = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[łŁ]/g, (char) => (char === "ł" ? "l" : "L"))
    .toLowerCase();

const documentsOf = (model: ContentModel): readonly IndexedDoc[] => {
  const topics = model.topics.map((topic): IndexedDoc => {
    const keyIdea =
      findSection(topic.index.sections, "Key idea")?.markdown ?? "";
    const summary =
      topic.summary?.sections.map((section) => section.markdown).join("\n") ??
      "";
    const { title, tags = [], status } = topic.index.frontMatter;
    const body = `${keyIdea}\n${summary}`;
    return {
      key: `topic:${topic.path}`,
      kind: "topic",
      ref: topic.path,
      title,
      question: "",
      answer: "",
      body,
      tags: tags.join(" "),
      folded: foldDiacritics(`${title}\n${body}\n${tags.join(" ")}`),
      file: topic.index.file,
      topic: topic.path,
      domain: topic.domain,
      type: undefined,
      status,
      snippet: snippetOf(keyIdea),
    };
  });
  const cards = model.cards.map((card): IndexedDoc => {
    const title = card.title ?? card.id;
    const tags = (card.frontMatter.tags ?? []).join(" ");
    return {
      // Keyed by file, not id: two files sharing an id are a `check` error, and must not take search down.
      key: `card:${card.file}`,
      kind: "card",
      ref: card.id,
      title,
      question: card.question.markdown,
      answer: card.answer.markdown,
      body: "",
      tags,
      folded: foldDiacritics(
        `${title}\n${card.question.markdown}\n${card.answer.markdown}\n${tags}`,
      ),
      file: card.file,
      topic: card.topic,
      domain: card.domain,
      type: card.frontMatter.type,
      status: card.frontMatter.status,
      snippet: snippetOf(card.question.markdown),
    };
  });
  return [...topics, ...cards];
};

/** A search index over the topics and cards of one content model. */
export interface ContentSearchIndex {
  readonly search: (
    query: string,
    filters?: SearchFilters,
  ) => readonly SearchHit[];
  /**
   * The index as text for the content bundle, so the app searches without the content and without a
   * server round trip. `loadSearchIndex` turns it back into an index that answers identically.
   */
  readonly serialize: () => string;
}

const DEFAULT_LIMIT = 8;

const isKind = (value: unknown): value is SearchHitKind =>
  value === "topic" || value === "card";

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

const hitOf = (result: SearchResult): SearchHit => ({
  kind: isKind(result.kind) ? result.kind : "card",
  id: text(result.ref),
  title: text(result.title),
  file: text(result.file),
  topic: text(result.topic),
  domain: text(result.domain),
  type: typeof result.type === "string" ? result.type : undefined,
  status: text(result.status),
  snippet: text(result.snippet),
  score: Math.round(result.score * 1000) / 1000,
});

// The options are code, not data: a serialized index carries none of them, so building and loading must
// share this one object or a loaded index would rank differently from the one that was built.
const INDEX_OPTIONS: Options<IndexedDoc> = {
  idField: "key",
  fields: ["title", "question", "answer", "body", "tags", "folded"],
  storeFields: [...STORED],
  searchOptions: {
    boost: { question: 3, title: 2, tags: 1.5 },
    prefix: true,
    fuzzy: (term) => (term.length > 4 ? 0.2 : false),
  },
};

const wrap = (index: MiniSearch<IndexedDoc>): ContentSearchIndex => ({
  search: (query, filters = {}) => {
    const matches = (result: SearchResult): boolean =>
      (filters.domain === undefined || result.domain === filters.domain) &&
      (filters.type === undefined || result.type === filters.type) &&
      (filters.status === undefined || result.status === filters.status);
    return index
      .search(
        { combineWith: "OR", queries: [query, foldDiacritics(query)] },
        { filter: matches },
      )
      .map(hitOf)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.kind.localeCompare(b.kind, "en") ||
          a.id.localeCompare(b.id, "en"),
      )
      .slice(0, filters.limit ?? DEFAULT_LIMIT);
  },
  serialize: () => JSON.stringify(index),
});

/**
 * Builds the lexical index of topics (title, key idea, summary) and cards (title, question, answer,
 * tags). Pure over the model, so the MCP server's duplicate check and the app's search box rank the same
 * content the same way. A query is matched as typed and with diacritics folded; prefixes match so a word
 * typed half-way already finds its card.
 */
export const buildSearchIndex = (model: ContentModel): ContentSearchIndex => {
  const index = new MiniSearch<IndexedDoc>(INDEX_OPTIONS);
  index.addAll([...documentsOf(model)]);
  return wrap(index);
};

/** Restores an index from `serialize`, as the app does with the bundle's `searchIndex`. */
export const loadSearchIndex = (serialized: string): ContentSearchIndex => {
  try {
    return wrap(MiniSearch.loadJSON<IndexedDoc>(serialized, INDEX_OPTIONS));
  } catch (error) {
    throw new LearnError(
      "search-index-invalid",
      "The content bundle has a search index this version cannot read",
      {},
      { cause: error },
    );
  }
};
