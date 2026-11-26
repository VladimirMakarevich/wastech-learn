import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

// The same parser stack as wastech-mdlint, so a heading, list or code block means the same thing to
// the first validation tier and to this one.
const processor = unified().use(remarkParse).use(remarkGfm).freeze();

export const parseMarkdown = (markdown: string): Root =>
  processor.parse(markdown);
