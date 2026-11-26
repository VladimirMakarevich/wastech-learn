import { toString } from "mdast-util-to-string";
import { stringify } from "yaml";
import { parseMarkdown } from "../parse/markdown.js";
import { oneLine } from "./inline.js";

/** A `## Heading` block kept as written: the heading line itself and the Markdown under it. */
export interface DocumentSection {
  /** The heading line verbatim, `## Key idea`, so inline code or emphasis in it survives an edit. */
  readonly heading: string;
  readonly name: string;
  readonly markdown: string;
}

/**
 * A content file split into the parts tools edit: the raw front matter, the head (the `#` title and any
 * text before the first section) and the `##` sections. Every part keeps its text verbatim, so editing
 * one section or one front matter key leaves the rest of a hand-written file byte for byte as it was.
 */
export interface ContentDocument {
  /** YAML between the `---` fences, without them. */
  readonly frontMatter: string;
  readonly head: string;
  readonly sections: readonly DocumentSection[];
}

/** What a front matter key may hold in a content file: a scalar or a flat list of scalars. */
export type FrontMatterValue = string | number | boolean | readonly string[];

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

// Wrapping a long title onto a folded second line would be valid YAML but unreadable in an editor, and
// lists stay in the flow style the content files are written in.
const YAML_OPTIONS = {
  lineWidth: 0,
  collectionStyle: "flow",
  flowCollectionPadding: false,
} as const;

// A line break would turn the scalar into a continuation line at column 0, which is not valid YAML under
// a key; front matter values are short labels, so they are kept on one line.
const yamlValue = (value: FrontMatterValue): string =>
  stringify(
    typeof value === "string"
      ? oneLine(value)
      : Array.isArray(value)
        ? value.map(oneLine)
        : value,
    YAML_OPTIONS,
  ).trimEnd();

/**
 * Front matter text from ordered entries; `undefined` values are left out, so optional keys need no
 * special casing at the call site.
 */
export const frontMatterText = (
  entries: readonly (readonly [string, FrontMatterValue | undefined])[],
): string =>
  entries
    .filter(
      (entry): entry is readonly [string, FrontMatterValue] =>
        entry[1] !== undefined,
    )
    .map(([key, value]) => `${key}: ${yamlValue(value)}`)
    .join("\n");

/**
 * Splits a content file into front matter, head and sections by the Markdown tree, so a `## ` line inside
 * a code block stays code. `undefined` when the file has no front matter block.
 */
export const readDocument = (text: string): ContentDocument | undefined => {
  const match = FENCE.exec(text);
  if (match === null) return undefined;
  const body = text.slice(match[0].length).replaceAll("\r\n", "\n");
  const headings = parseMarkdown(body).children.flatMap((node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (
      node.type !== "heading" ||
      node.depth !== 2 ||
      start === undefined ||
      end === undefined
    ) {
      return [];
    }
    return [{ name: toString(node).trim(), start, end }];
  });
  const sections = headings.map((heading, index) => ({
    heading: body.slice(heading.start, heading.end).trim(),
    name: heading.name,
    markdown: body
      .slice(heading.end, headings[index + 1]?.start ?? body.length)
      .trim(),
  }));
  return {
    frontMatter: (match[1] ?? "").replaceAll("\r\n", "\n"),
    head: body.slice(0, headings[0]?.start ?? body.length).trim(),
    sections,
  };
};

/**
 * The file text of a document in the layout every content file uses: blocks separated by one blank line,
 * a final newline, LF line endings.
 */
export const writeDocument = (document: ContentDocument): string => {
  const blocks = [`---\n${document.frontMatter}\n---`];
  if (document.head !== "") blocks.push(document.head);
  for (const section of document.sections) {
    blocks.push(
      section.markdown === ""
        ? section.heading
        : `${section.heading}\n\n${section.markdown}`,
    );
  }
  return `${blocks.join("\n\n")}\n`;
};

export const sectionMarkdown = (
  document: ContentDocument,
  name: string,
): string | undefined =>
  document.sections.find((section) => section.name === name)?.markdown;

/**
 * The document with a section's Markdown replaced, or the section added. A new section goes after the
 * last existing one that precedes it in `order`, so the fixed section order the linter checks holds even
 * when a tool fills sections one at a time.
 */
export const withSection = (
  document: ContentDocument,
  name: string,
  markdown: string,
  order: readonly string[] = [],
): ContentDocument => {
  const text = markdown.trim();
  if (document.sections.some((section) => section.name === name)) {
    return {
      ...document,
      sections: document.sections.map((section) =>
        section.name === name ? { ...section, markdown: text } : section,
      ),
    };
  }
  const added: DocumentSection = {
    heading: `## ${name}`,
    name,
    markdown: text,
  };
  const rank = order.indexOf(name);
  let insertAt = document.sections.length;
  if (rank !== -1) {
    const after = document.sections.findLastIndex((section) => {
      const position = order.indexOf(section.name);
      return position !== -1 && position < rank;
    });
    const firstLater = document.sections.findIndex(
      (section) => order.indexOf(section.name) > rank,
    );
    insertAt = after !== -1 ? after + 1 : firstLater !== -1 ? firstLater : 0;
  }
  return {
    ...document,
    sections: [
      ...document.sections.slice(0, insertAt),
      added,
      ...document.sections.slice(insertAt),
    ],
  };
};

const TOP_LEVEL_KEY = /^([A-Za-z_][\w-]*)\s*:/;

/**
 * The document with one top-level front matter key set, or removed when `value` is `undefined`. Only that
 * key's lines change: comments and the order of the other keys stay as the author left them.
 */
export const withFrontMatterValue = (
  document: ContentDocument,
  key: string,
  value: FrontMatterValue | undefined,
): ContentDocument => {
  const lines =
    document.frontMatter === "" ? [] : document.frontMatter.split("\n");
  const start = lines.findIndex(
    (line) => TOP_LEVEL_KEY.exec(line)?.[1] === key,
  );
  const replacement =
    value === undefined ? [] : [frontMatterText([[key, value]])];
  if (start === -1) {
    return {
      ...document,
      frontMatter: [...lines, ...replacement].join("\n"),
    };
  }
  // A block-style list or a folded scalar continues on indented lines (or `- ` items) under its key.
  let end = start + 1;
  while (end < lines.length && /^(\s|-\s)/.test(lines[end] ?? "")) end++;
  return {
    ...document,
    frontMatter: [
      ...lines.slice(0, start),
      ...replacement,
      ...lines.slice(end),
    ].join("\n"),
  };
};
