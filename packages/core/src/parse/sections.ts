import { toString } from "mdast-util-to-string";
import { parseMarkdown } from "./markdown.js";

/** A `## Heading` block of a content file: its fixed English key and its raw Markdown. */
export interface Section {
  readonly name: string;
  readonly markdown: string;
  /** 1-based file line of the heading. */
  readonly line: number;
  /** 1-based file line on which `markdown` starts, to turn positions inside it into file lines. */
  readonly contentLine: number;
}

export interface SectionedBody {
  /** Text of the first `#` heading: the short title for lists and search. */
  readonly title: string | undefined;
  readonly sections: readonly Section[];
}

/**
 * Splits a body into its `##` sections by the Markdown tree, not by text: a `## ` line inside a code
 * block is code, and only the parser knows that. Each section keeps its source text verbatim, so the
 * content hash and the bundle see exactly what the author wrote.
 */
export const readSections = (body: string, bodyLine: number): SectionedBody => {
  const tree = parseMarkdown(body);
  let title: string | undefined;
  const headings: { name: string; start: number; end: number; line: number }[] =
    [];
  for (const node of tree.children) {
    if (node.type !== "heading") continue;
    if (node.depth === 1 && title === undefined) title = toString(node).trim();
    if (node.depth !== 2) continue;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    const line = node.position?.start.line;
    if (start === undefined || end === undefined || line === undefined)
      continue;
    headings.push({
      name: toString(node).trim(),
      start,
      end,
      line: line + bodyLine - 1,
    });
  }
  const sections = headings.map((heading, index) => {
    const raw = body.slice(
      heading.end,
      headings[index + 1]?.start ?? body.length,
    );
    const leading = raw.length - raw.trimStart().length;
    const skippedLines = raw.slice(0, leading).split("\n").length - 1;
    return {
      name: heading.name,
      markdown: raw.trim(),
      line: heading.line,
      contentLine: heading.line + skippedLines,
    };
  });
  return { title, sections };
};

export const findSection = (
  sections: readonly Section[],
  name: string,
): Section | undefined => sections.find((section) => section.name === name);
