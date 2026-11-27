import MiniSearch from "minisearch";
import type { ContentModel } from "../model.js";
import { findSection } from "../parse/sections.js";
import { oneLine } from "../serialize/inline.js";
import {
  INDEX_OPTIONS,
  foldDiacritics,
  wrap,
  type ContentSearchIndex,
  type IndexedDoc,
} from "./load.js";

export { foldDiacritics, loadSearchIndex } from "./load.js";
export type {
  ContentSearchIndex,
  SearchFilters,
  SearchHit,
  SearchHitKind,
} from "./load.js";

const SNIPPET_CHARS = 120;

const snippetOf = (markdown: string): string => {
  const line = oneLine(markdown);
  return line.length <= SNIPPET_CHARS
    ? line
    : `${line.slice(0, SNIPPET_CHARS - 1)}…`;
};

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
