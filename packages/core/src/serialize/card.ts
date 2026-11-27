import type { CardFrontMatter } from "../schema/front-matter.js";
import type {
  CardFields,
  CardPatch,
  CardSource,
} from "../schema/mcp/content.js";
import { CARD_SECTIONS } from "../template.js";
import {
  frontMatterText,
  withFrontMatterValue,
  withSection,
  type ContentDocument,
} from "./document.js";
import { markdownLink, oneLine } from "./inline.js";

/** What a tool decides about a new card, not the author: its identity and where it came from. */
export interface NewCardMeta {
  readonly id: string;
  readonly origin: CardFrontMatter["origin"];
  /** `YYYY-MM-DD` in the learner's time zone; the host reads the clock. */
  readonly created: string;
}

const listMarkdown = (items: readonly string[]): string =>
  items.map((item) => `- ${oneLine(item)}`).join("\n");

export const sourcesMarkdown = (sources: readonly CardSource[]): string =>
  listMarkdown(sources.map((source) => markdownLink(source.title, source.url)));

export const rubricMarkdown = (rubric: readonly string[]): string =>
  listMarkdown(rubric);

const cardFrontMatter = (
  fields: Omit<
    CardFields,
    "question" | "answer" | "title" | "sources" | "rubric" | "explanation"
  >,
  meta: NewCardMeta,
): string =>
  frontMatterText([
    ["id", meta.id],
    ["type", fields.type],
    ["status", fields.status],
    ["bloom", fields.bloom],
    ["grading", fields.grading],
    ["idea", fields.idea],
    ["langPair", fields.langPair],
    ["tags", fields.tags],
    ["origin", meta.origin],
    ["created", meta.created],
    ["lang", fields.lang],
  ]);

/**
 * A new card file from the fields a chat proposed, in the layout of hand-written cards: front matter,
 * `#` title, then the sections in their fixed order, optional ones only when there is text for them.
 */
export const cardDocument = (
  fields: CardFields,
  meta: NewCardMeta,
): ContentDocument => {
  const sections: [string, string | undefined][] = [
    ["Question", fields.question],
    ["Answer", fields.answer],
    [
      "Rubric",
      fields.rubric === undefined || fields.rubric.length === 0
        ? undefined
        : rubricMarkdown(fields.rubric),
    ],
    ["Explanation", fields.explanation],
    [
      "Sources",
      fields.sources.length === 0 ? undefined : sourcesMarkdown(fields.sources),
    ],
  ];
  return {
    frontMatter: cardFrontMatter(fields, meta),
    head: `# ${oneLine(fields.title)}`,
    sections: sections.flatMap(([name, markdown]) =>
      markdown === undefined
        ? []
        : [{ heading: `## ${name}`, name, markdown: markdown.trim() }],
    ),
  };
};

const withTitle = (
  document: ContentDocument,
  title: string,
): ContentDocument => {
  const lines = document.head === "" ? [] : document.head.split("\n");
  const titleLine = `# ${oneLine(title)}`;
  const index = lines.findIndex((line) => line.startsWith("# "));
  if (index === -1)
    return { ...document, head: [titleLine, ...lines].join("\n") };
  lines[index] = titleLine;
  return { ...document, head: lines.join("\n") };
};

const withoutSection = (
  document: ContentDocument,
  name: string,
): ContentDocument => ({
  ...document,
  sections: document.sections.filter((section) => section.name !== name),
});

/**
 * An existing card with only the given fields changed. Everything the patch does not name - other front
 * matter keys and their comments, extra sections, the author's formatting - stays as it was. An empty
 * rubric or source list removes the section.
 */
export const patchCardDocument = (
  document: ContentDocument,
  patch: CardPatch,
): ContentDocument => {
  let result = document;
  const scalarKeys = [
    "type",
    "status",
    "bloom",
    "grading",
    "idea",
    "lang",
    "langPair",
    "tags",
  ] as const;
  for (const key of scalarKeys) {
    const value = patch[key];
    if (value !== undefined) result = withFrontMatterValue(result, key, value);
  }
  if (patch.title !== undefined) result = withTitle(result, patch.title);
  const sectionValues: [string, string | undefined][] = [
    ["Question", patch.question],
    ["Answer", patch.answer],
    [
      "Rubric",
      patch.rubric === undefined ? undefined : rubricMarkdown(patch.rubric),
    ],
    ["Explanation", patch.explanation],
    [
      "Sources",
      patch.sources === undefined ? undefined : sourcesMarkdown(patch.sources),
    ],
  ];
  for (const [name, markdown] of sectionValues) {
    if (markdown === undefined) continue;
    result =
      markdown.trim() === ""
        ? withoutSection(result, name)
        : withSection(result, name, markdown, CARD_SECTIONS);
  }
  return result;
};

/**
 * The successor of a card whose meaning changed: the old text with the patch applied, under a new identity.
 * Its history starts empty, which is the point: the old reviews describe a different question.
 */
export const successorCardDocument = (
  document: ContentDocument,
  patch: CardPatch,
  meta: NewCardMeta,
): ContentDocument => {
  let result = patchCardDocument(document, patch);
  result = withFrontMatterValue(result, "id", meta.id);
  result = withFrontMatterValue(result, "created", meta.created);
  result = withFrontMatterValue(result, "origin", meta.origin);
  return result;
};
