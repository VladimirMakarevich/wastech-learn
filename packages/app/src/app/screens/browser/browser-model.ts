import {
  loadSearchIndex,
  type ContentSearchIndex,
  type SearchHit,
} from "@wastech-learn/core";
import { prepareEvents } from "@wastech-learn/srs";
import { changedSince, type LibrarySnapshot } from "../../data/snapshot";

/** One review item of the content with what the table shows about it. */
export interface BrowserRow {
  readonly item: string;
  readonly cardId: string;
  readonly variant: string;
  /** The card has more than one variant, so the row names its own. */
  readonly multi: boolean;
  readonly title: string;
  readonly type: string;
  readonly domain: string;
  readonly topic: string;
  readonly topicTitle: string;
  readonly tags: readonly string[];
  /** The card's status, or `suspended` for an item taken out of review. */
  readonly status: string;
  readonly leech: boolean;
  readonly changed: boolean;
  readonly retrievability: number | null;
  readonly dueAt: number | null;
  readonly lapses: number;
  readonly lastRating: number | null;
}

export interface BrowserFilters {
  readonly q: string;
  readonly domain: string;
  readonly topic: string;
  readonly tag: string;
  readonly type: string;
  readonly status: string;
  readonly leech: boolean;
  readonly changed: boolean;
  /** Only cards that differ from the last commit. */
  readonly uncommitted: boolean;
  /** Review items picked elsewhere (the session summary, a topic); empty for all. */
  readonly items: readonly string[];
}

export const NO_FILTERS: BrowserFilters = {
  q: "",
  domain: "",
  topic: "",
  tag: "",
  type: "",
  status: "",
  leech: false,
  changed: false,
  uncommitted: false,
  items: [],
};

/** Every review item of the bundle with its replayed state, in the bundle's card order. */
export const browserRows = (
  snapshot: LibrarySnapshot,
): readonly BrowserRow[] => {
  const topics = new Map(
    snapshot.bundle.topics.map((topic) => [topic.path, topic]),
  );
  const lastRating = new Map<string, number>();
  for (const event of prepareEvents(snapshot.events))
    if (event.kind === "review" && event.rating !== undefined)
      lastRating.set(event.item, event.rating);
  return snapshot.bundle.cards.flatMap((card) => {
    const topic = topics.get(card.topic);
    return card.variants.map((variant) => {
      const item = `${card.id}:${variant}`;
      const memory = snapshot.state.items.get(item);
      return {
        item,
        cardId: card.id,
        variant,
        multi: card.variants.length > 1,
        title: card.title,
        type: card.type,
        domain: card.domain,
        topic: card.topic,
        topicTitle: topic?.title ?? card.topic,
        tags: [...new Set([...card.tags, ...(topic?.tags ?? [])])].sort(),
        status: memory?.suspended === true ? "suspended" : card.status,
        leech: memory?.leech ?? false,
        changed: changedSince(snapshot, item, card.contentHash),
        retrievability: memory?.retrievability ?? null,
        dueAt: memory?.dueAt ?? null,
        lapses: memory?.lapses ?? 0,
        lastRating: lastRating.get(item) ?? null,
      };
    });
  });
};

/** The search index the bundle carries, loaded once per bundle. */
export const searchIndexOf = (
  serialized: string | undefined,
): ContentSearchIndex | undefined =>
  serialized === undefined ? undefined : loadSearchIndex(serialized);

// Search ranks cards; the table keeps that order and the filters narrow it. A long list of hits costs
// nothing to rank, so the cap only guards against a one-letter query.
const SEARCH_LIMIT = 500;

export interface BrowserResult {
  readonly rows: readonly BrowserRow[];
  readonly topics: readonly SearchHit[];
}

/**
 * The rows the filters keep: with a query, in the order the search ranks their cards; otherwise in the
 * bundle's order. Every filter only narrows, so clearing one never hides a row another filter allowed.
 */
export const filterRows = (
  rows: readonly BrowserRow[],
  filters: BrowserFilters,
  index: ContentSearchIndex | undefined,
  uncommittedCards: ReadonlySet<string> = new Set(),
): BrowserResult => {
  const items = new Set(filters.items);
  const keep = (row: BrowserRow): boolean =>
    (items.size === 0 || items.has(row.item)) &&
    (filters.domain === "" || row.domain === filters.domain) &&
    (filters.topic === "" || row.topic === filters.topic) &&
    (filters.tag === "" || row.tags.includes(filters.tag)) &&
    (filters.type === "" || row.type === filters.type) &&
    (filters.status === "" || row.status === filters.status) &&
    (!filters.leech || row.leech) &&
    (!filters.changed || row.changed) &&
    (!filters.uncommitted || uncommittedCards.has(row.cardId));
  const query = filters.q.trim();
  if (query === "" || index === undefined)
    return { rows: rows.filter(keep), topics: [] };
  const hits = index.search(query, { limit: SEARCH_LIMIT });
  const rank = new Map(
    hits
      .filter((hit) => hit.kind === "card")
      .map((hit, position) => [hit.id, position]),
  );
  return {
    rows: rows
      .filter((row) => rank.has(row.cardId) && keep(row))
      .sort((a, b) => (rank.get(a.cardId) ?? 0) - (rank.get(b.cardId) ?? 0)),
    topics: hits.filter(
      (hit) =>
        hit.kind === "topic" &&
        (filters.domain === "" || hit.domain === filters.domain) &&
        (filters.topic === "" || hit.id === filters.topic),
    ),
  };
};
