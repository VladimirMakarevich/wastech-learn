import type { TopicIndexFrontMatter } from "../schema/front-matter.js";
import type { PretestItem } from "../schema/mcp/content.js";
import { INDEX_SECTIONS } from "../template.js";
import {
  frontMatterText,
  sectionMarkdown,
  withSection,
  type ContentDocument,
} from "./document.js";
import { markdownLink, oneLine } from "./inline.js";

/** A card as the topic's `## Cards` list names it. */
export interface CardLink {
  readonly id: string;
  readonly title: string;
}

export const cardLinkTarget = (id: string): string => `cards/${id}.md`;

const cardLinkLine = (card: CardLink): string =>
  `- ${markdownLink(card.title, cardLinkTarget(card.id))}`;

/**
 * One numbered pretest line: the question, then the first answer and its confidence when the learner gave
 * them. Only punctuation is added, so the line reads the same in every topic language.
 */
const pretestLine = (item: PretestItem, index: number): string => {
  const answer = item.answer === undefined ? "" : ` — ${oneLine(item.answer)}`;
  const confidence =
    item.confidence === undefined ? "" : ` (${String(item.confidence)}/3)`;
  return `${String(index + 1)}. ${oneLine(item.question)}${answer}${confidence}`;
};

export const pretestMarkdown = (items: readonly PretestItem[]): string =>
  items.map(pretestLine).join("\n");

export interface TopicIndexInput {
  readonly frontMatter: TopicIndexFrontMatter;
  readonly keyIdea: string;
  readonly pretest: readonly PretestItem[];
  readonly cards: readonly CardLink[];
}

/** A topic's `index.md`: its passport, the pretest the capture started with, and the list of its cards. */
export const topicIndexDocument = (input: TopicIndexInput): ContentDocument => {
  const { frontMatter } = input;
  return {
    frontMatter: frontMatterText([
      ["title", frontMatter.title],
      ["domain", frontMatter.domain],
      ["lang", frontMatter.lang],
      ["status", frontMatter.status],
      ["familiarity", frontMatter.familiarity],
      ["created", frontMatter.created],
      ["origin", frontMatter.origin],
      ["tags", frontMatter.tags],
      ["related", frontMatter.related],
    ]),
    head: `# ${oneLine(frontMatter.title)}`,
    sections: [
      {
        heading: "## Key idea",
        name: "Key idea",
        markdown: input.keyIdea.trim(),
      },
      {
        heading: "## Pretest",
        name: "Pretest",
        markdown: pretestMarkdown(input.pretest),
      },
      {
        heading: "## Cards",
        name: "Cards",
        markdown: input.cards.map(cardLinkLine).join("\n"),
      },
    ],
  };
};

/**
 * The index with a link to each given card in `## Cards`: a card not listed yet is appended, a card
 * already listed keeps its line and its place, with the title refreshed when it changed. A retried or
 * overlapping write therefore leaves one line per card, and the author's order of the lines is kept.
 */
export const withCardLinks = (
  document: ContentDocument,
  cards: readonly CardLink[],
): ContentDocument => {
  const current = sectionMarkdown(document, "Cards") ?? "";
  const lines = current === "" ? [] : current.split("\n");
  const updated = [...lines];
  for (const card of cards) {
    const target = `(${cardLinkTarget(card.id)})`;
    const index = updated.findIndex((line) => line.includes(target));
    if (index === -1) {
      updated.push(cardLinkLine(card));
      continue;
    }
    // Only the link itself is rewritten: a note the author added after it on the same line stays.
    updated[index] = (updated[index] ?? "").replace(
      new RegExp(`\\[(?:\\\\.|[^\\]\\\\])*\\]\\(${cardLinkTarget(card.id)}\\)`),
      // A function, not a string: a `$` in a title must not be read as a replacement pattern.
      () => markdownLink(card.title, cardLinkTarget(card.id)),
    );
  }
  const markdown = updated.join("\n");
  if (markdown === current) return document;
  return withSection(document, "Cards", markdown, INDEX_SECTIONS);
};

const hasLink = (line: string, id: string): boolean =>
  line.includes(`(${cardLinkTarget(id)})`);

/**
 * The index without the card's line in `## Cards`, for a card being deleted. Every other line, the
 * author's notes and order included, stays as it is.
 */
export const withoutCardLink = (
  document: ContentDocument,
  id: string,
): ContentDocument => {
  const current = sectionMarkdown(document, "Cards") ?? "";
  const lines = current === "" ? [] : current.split("\n");
  const kept = lines.filter((line) => !hasLink(line, id));
  if (kept.length === lines.length) return document;
  return withSection(document, "Cards", kept.join("\n"), INDEX_SECTIONS);
};

/**
 * The index with a deleted card's line back, as `committed` (the index of the last commit) had it: the
 * same text, placed after the nearest card that preceded it there and is still listed. Lines added or
 * edited since the commit stay, so undoing a delete never undoes other work on the index.
 */
export const withRestoredCardLink = (
  document: ContentDocument,
  committed: ContentDocument,
  card: CardLink,
): ContentDocument => {
  const current = sectionMarkdown(document, "Cards") ?? "";
  const lines = current === "" ? [] : current.split("\n");
  if (lines.some((line) => hasLink(line, card.id))) return document;
  const before = (sectionMarkdown(committed, "Cards") ?? "").split("\n");
  const at = before.findIndex((line) => hasLink(line, card.id));
  const line = before[at];
  if (at === -1 || line === undefined) return withCardLinks(document, [card]);
  let insertAt = 0;
  for (let previous = at - 1; previous >= 0; previous--) {
    const id = /\(cards\/([^/)]+)\.md\)/.exec(before[previous] ?? "")?.[1];
    const found =
      id === undefined ? -1 : lines.findIndex((other) => hasLink(other, id));
    if (found !== -1) {
      insertAt = found + 1;
      break;
    }
  }
  const restored = [
    ...lines.slice(0, insertAt),
    line,
    ...lines.slice(insertAt),
  ];
  return withSection(document, "Cards", restored.join("\n"), INDEX_SECTIONS);
};
