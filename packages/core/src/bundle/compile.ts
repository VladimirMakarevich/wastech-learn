import type { List } from "mdast";
import type { Card, ContentModel, Topic, TopicDoc } from "../model.js";
import type { ContentFiles } from "../parse/content.js";
import { parseMarkdown } from "../parse/markdown.js";
import { findSection } from "../parse/sections.js";
import { RUBRIC_REQUIRED_MARK } from "../check/limits.js";
import {
  codeLanguages,
  createMarkdownRenderer,
  type MarkdownRenderer,
} from "./render.js";
import type {
  CardEntry,
  ContentBundle,
  DomainMeta,
  RubricItem,
  TopicMeta,
} from "./types.js";

export interface CompileOptions {
  /** When the bundle was built; passed in, so two builds of the same content are byte-identical. */
  readonly builtAt: Date;
}

const sectionHtml = (
  renderer: MarkdownRenderer,
  doc: Pick<TopicDoc<unknown>, "file" | "sections">,
  name: string,
): string => {
  const section = findSection(doc.sections, name);
  return section === undefined
    ? ""
    : renderer.render(section.markdown, doc.file);
};

const rubricItems = (
  renderer: MarkdownRenderer,
  card: Card,
): readonly RubricItem[] => {
  const rubric = findSection(card.sections, "Rubric");
  if (rubric === undefined) return [];
  const lists = parseMarkdown(rubric.markdown).children.filter(
    (node): node is List => node.type === "list",
  );
  return lists.flatMap((list) =>
    list.children.map((item) => {
      const start = item.children[0]?.position?.start.offset ?? 0;
      const end = item.children.at(-1)?.position?.end.offset ?? start;
      const source = rubric.markdown.slice(start, end).trim();
      const required = source.startsWith(RUBRIC_REQUIRED_MARK);
      const text = required
        ? source.slice(RUBRIC_REQUIRED_MARK.length).trim()
        : source;
      return { required, html: renderer.render(text, card.file) };
    }),
  );
};

const topicMeta = (
  renderer: MarkdownRenderer,
  topic: Topic,
  cards: readonly Card[],
): TopicMeta => {
  const { frontMatter } = topic.index;
  return {
    path: topic.path,
    domain: topic.domain,
    title: frontMatter.title,
    lang: frontMatter.lang,
    status: frontMatter.status,
    familiarity: frontMatter.familiarity,
    created: frontMatter.created,
    tags: frontMatter.tags ?? [],
    related: frontMatter.related ?? [],
    keyIdeaHtml: sectionHtml(renderer, topic.index, "Key idea"),
    summary:
      topic.summary?.sections.map((section) => ({
        name: section.name,
        html: renderer.render(
          section.markdown,
          topic.summary?.file ?? topic.index.file,
        ),
      })) ?? [],
    materialsHtml:
      topic.materials === undefined
        ? ""
        : sectionHtml(renderer, topic.materials, "Materials"),
    cards: cards
      .filter((card) => card.topic === topic.path)
      .map((card) => card.id)
      .sort(),
  };
};

const cardEntry = (renderer: MarkdownRenderer, card: Card): CardEntry => {
  const { frontMatter } = card;
  return {
    id: card.id,
    topic: card.topic,
    domain: card.domain,
    type: frontMatter.type,
    status: frontMatter.status,
    bloom: frontMatter.bloom,
    grading: frontMatter.grading,
    idea: frontMatter.idea ?? null,
    tags: frontMatter.tags ?? [],
    lang: card.lang,
    langPair: frontMatter.langPair ?? null,
    title: card.title ?? card.id,
    variants: card.variants,
    questionHtml: renderer.render(card.question.markdown, card.file),
    answerHtml: renderer.render(card.answer.markdown, card.file),
    rubric: rubricItems(renderer, card),
    explanationHtml: sectionHtml(renderer, card, "Explanation"),
    sourcesHtml: sectionHtml(renderer, card, "Sources"),
    contentHash: card.contentHash,
  };
};

/**
 * Compiles the content model into the bundle the app reads. Pure apart from the highlighter it creates:
 * the same model, files and `builtAt` always give the same bundle.
 */
export const compileBundle = async (
  model: ContentModel,
  files: ContentFiles,
  options: CompileOptions,
): Promise<ContentBundle> => {
  const markdown = [
    ...model.cards.flatMap((card) =>
      card.sections.map((section) => section.markdown),
    ),
    ...model.topics.flatMap((topic) =>
      [topic.index, topic.summary, topic.materials].flatMap(
        (doc) => doc?.sections.map((s) => s.markdown) ?? [],
      ),
    ),
  ];
  const renderer = await createMarkdownRenderer(files, codeLanguages(markdown));
  const topics = [...model.topics].sort((a, b) =>
    a.path.localeCompare(b.path, "en"),
  );
  const cards = [...model.cards].sort(
    (a, b) =>
      a.id.localeCompare(b.id, "en") || a.file.localeCompare(b.file, "en"),
  );
  const domains: DomainMeta[] = [
    ...new Set(topics.map((topic) => topic.domain)),
  ]
    .sort()
    .map((id) => ({
      id,
      topics: topics
        .filter((topic) => topic.domain === id)
        .map((topic) => topic.path),
    }));
  const topicMetas = topics.map((topic) => topicMeta(renderer, topic, cards));
  const cardEntries = cards.map((card) => cardEntry(renderer, card));
  return {
    version: 1,
    builtAt: options.builtAt.toISOString(),
    domains,
    topics: topicMetas,
    cards: cardEntries,
    assets: renderer.assets(),
  };
};
