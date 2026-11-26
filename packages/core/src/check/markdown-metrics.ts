import type { Code, List, ListItem, Nodes, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";
import { parseMarkdown } from "../parse/markdown.js";
import type { Section } from "../parse/sections.js";

// `{{c1::receive window::hint}}` reads as "receive window": the markup is not part of what the learner reads.
const CLOZE_MARKUP = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

const collectText = (node: Nodes, out: string[]): void => {
  // A code block has its own limits; counting it as words would push every "predict the output" card
  // over the question limit.
  if (node.type === "code" || node.type === "html") return;
  if (node.type === "text" || node.type === "inlineCode") {
    out.push(node.value);
    return;
  }
  if ("children" in node)
    for (const child of node.children) collectText(child, out);
};

/**
 * Words a learner reads in a piece of Markdown: prose and inline code, without code blocks, markup or
 * standalone punctuation such as a dash.
 */
export const countWords = (markdown: string): number => {
  const parts: string[] = [];
  collectText(parseMarkdown(markdown), parts);
  return parts
    .join(" ")
    .replace(CLOZE_MARKUP, "$1")
    .split(/\s+/)
    .filter((token) => HAS_LETTER_OR_DIGIT.test(token)).length;
};

/** Items of the lists at the top level of a section: the points of an answer or a rubric. */
export const topLevelListItems = (markdown: string): readonly ListItem[] =>
  parseMarkdown(markdown)
    .children.filter((node): node is List => node.type === "list")
    .flatMap((list) => list.children);

export const listItemText = (item: ListItem): string => toString(item).trim();

export interface CodeBlockAt {
  readonly code: Code;
  /** 1-based file line of the opening fence. */
  readonly line: number;
}

/** Code blocks of a section with their file lines. */
export const codeBlocks = (section: Section): readonly CodeBlockAt[] => {
  const blocks: CodeBlockAt[] = [];
  const tree: Root = parseMarkdown(section.markdown);
  visit(tree, "code", (code) => {
    blocks.push({
      code,
      line: section.contentLine + (code.position?.start.line ?? 1) - 1,
    });
  });
  return blocks;
};

/** Link targets in a piece of Markdown, in document order. */
export const linkUrls = (markdown: string): readonly string[] => {
  const urls: string[] = [];
  visit(parseMarkdown(markdown), "link", (link) => {
    urls.push(link.url);
  });
  return urls;
};

/** Text of the emphasized spans (`*…*`, `_…_`) of a piece of Markdown. */
export const emphasisTexts = (markdown: string): readonly string[] => {
  const texts: string[] = [];
  visit(parseMarkdown(markdown), "emphasis", (emphasis) => {
    texts.push(toString(emphasis).trim());
  });
  return texts;
};

/** The words of a piece of Markdown in order, lower-cased, for comparing two versions of a text. */
export const wordsOf = (markdown: string): readonly string[] => {
  const parts: string[] = [];
  collectText(parseMarkdown(markdown), parts);
  return parts
    .join(" ")
    .replace(CLOZE_MARKUP, "$1")
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => HAS_LETTER_OR_DIGIT.test(token));
};
