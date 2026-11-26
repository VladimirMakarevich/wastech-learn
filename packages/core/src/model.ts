import type { Finding } from "./finding.js";
import type { Section } from "./parse/sections.js";
import type { ContentLang } from "./schema/common.js";
import type {
  CardFrontMatter,
  MaterialsFrontMatter,
  SummaryFrontMatter,
  TopicIndexFrontMatter,
} from "./schema/front-matter.js";

/** One Markdown file of a topic after its front matter passed the schema. */
export interface TopicDoc<FrontMatter> {
  readonly file: string;
  readonly frontMatter: FrontMatter;
  readonly title: string | undefined;
  readonly sections: readonly Section[];
}

export interface Topic {
  /** `<domain>/<topic>`: the topic's identity, independent of where the content repository lives. */
  readonly path: string;
  readonly domain: string;
  /** Repository-relative folder, `content/<domain>/<topic>`. */
  readonly dir: string;
  readonly index: TopicDoc<TopicIndexFrontMatter>;
  readonly summary: TopicDoc<SummaryFrontMatter> | undefined;
  readonly materials: TopicDoc<MaterialsFrontMatter> | undefined;
}

export interface Card {
  readonly file: string;
  readonly id: string;
  /** Path of the owning topic, `<domain>/<topic>`. */
  readonly topic: string;
  readonly domain: string;
  readonly frontMatter: CardFrontMatter;
  /** The card's own `lang` or, as almost always, its topic's. */
  readonly lang: ContentLang;
  readonly title: string | undefined;
  readonly sections: readonly Section[];
  readonly question: Section;
  readonly answer: Section;
  readonly variants: readonly string[];
  /** Scheduled units, `<id>:<variant>`, in variant order. */
  readonly items: readonly string[];
  readonly contentHash: string;
}

/** A Mermaid source and the SVG rendered next to it, both as text. */
export interface Diagram {
  readonly source: string;
  readonly sourceText: string;
  readonly svg: string;
  readonly svgText: string | undefined;
}

export interface ContentModel {
  readonly topics: readonly Topic[];
  readonly cards: readonly Card[];
  readonly diagrams: readonly Diagram[];
}

export interface ParsedContent {
  readonly model: ContentModel;
  /** Files that could not enter the model, and why. */
  readonly findings: readonly Finding[];
}
