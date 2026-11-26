import type { ContentLang } from "../schema/common.js";
import type { CardStatus, CardType } from "../schema/front-matter.js";

export interface DomainMeta {
  readonly id: string;
  /** Topic paths of the domain, sorted. */
  readonly topics: readonly string[];
}

export interface SummarySection {
  /** The fixed English section key, translated by the UI. */
  readonly name: string;
  readonly html: string;
}

export interface TopicMeta {
  readonly path: string;
  readonly domain: string;
  readonly title: string;
  readonly lang: ContentLang;
  readonly status: string;
  readonly familiarity: string;
  readonly created: string;
  readonly tags: readonly string[];
  readonly related: readonly string[];
  readonly keyIdeaHtml: string;
  readonly summary: readonly SummarySection[];
  readonly materialsHtml: string;
  /** Ids of the topic's cards, sorted. */
  readonly cards: readonly string[];
}

export interface RubricItem {
  /** Marked `(!)` in the source: naming it is required for a passing grade. */
  readonly required: boolean;
  readonly html: string;
}

export interface CardEntry {
  readonly id: string;
  readonly topic: string;
  readonly domain: string;
  readonly type: CardType;
  readonly status: CardStatus;
  readonly bloom: string;
  readonly grading: string;
  readonly idea: string | null;
  readonly tags: readonly string[];
  /** `YYYY-MM-DD` from the front matter: new cards of a topic come up in the order they were captured. */
  readonly created: string;
  readonly lang: ContentLang;
  readonly langPair: string | null;
  readonly title: string;
  readonly variants: readonly string[];
  /** Cloze gaps are `<span class="cloze" data-cloze="N">`, so the UI hides the gap of the variant shown. */
  readonly questionHtml: string;
  readonly answerHtml: string;
  readonly rubric: readonly RubricItem[];
  readonly explanationHtml: string;
  readonly sourcesHtml: string;
  readonly contentHash: string;
}

/**
 * What the app reads instead of the content repository: metadata and pre-rendered, sanitized HTML. It is
 * derived from the content and never committed there. The search index is an optional field, so a bundle
 * without it is still version 1.
 */
export interface ContentBundle {
  readonly version: 1;
  readonly builtAt: string;
  readonly domains: readonly DomainMeta[];
  readonly topics: readonly TopicMeta[];
  readonly cards: readonly CardEntry[];
  /** Repository paths of local images that are not inlined, for the host to serve. */
  readonly assets: Readonly<Record<string, string>>;
  /** The serialized search index over topics and cards; `loadSearchIndex` restores it. */
  readonly searchIndex?: string;
}
