import type { MaterialItem } from "../schema/mcp/content.js";
import {
  MATERIAL_KINDS,
  MATERIAL_STATUSES,
  MATERIALS_SECTION,
} from "../template.js";
import {
  frontMatterText,
  sectionMarkdown,
  withFrontMatterValue,
  withSection,
  type ContentDocument,
} from "./document.js";
import {
  LINK_PATTERN,
  linkParts,
  markdownLink,
  oneLine,
  tableCell,
  tableCells,
} from "./inline.js";

const HEADER = "| Title | Kind | Why | Status |\n| --- | --- | --- | --- |";

const row = (item: MaterialItem): string =>
  `| ${tableCell(markdownLink(item.title, item.url))} | ${item.kind} | ${tableCell(item.why)} | ${item.status} |`;

const isKind = (value: string): value is MaterialItem["kind"] =>
  (MATERIAL_KINDS as readonly string[]).includes(value);

const isStatus = (value: string): value is MaterialItem["status"] =>
  (MATERIAL_STATUSES as readonly string[]).includes(value);

/**
 * The rows of a materials table that follow the template: a linked title, a known kind, a reason and a
 * known status. A row written another way is not a material this tool understands and is skipped, never
 * guessed at; it stays in the file untouched.
 */
export const readMaterials = (markdown: string): readonly MaterialItem[] =>
  markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .slice(2)
    .flatMap((line) => {
      const [title = "", kind = "", why = "", status = "to-read"] =
        tableCells(line);
      const link = LINK_PATTERN.exec(title);
      if (link === null || !isKind(kind) || !isStatus(status)) return [];
      const { text, url } = linkParts(link);
      return [{ title: text, url, kind, why, status }];
    });

export interface MaterialsInput {
  readonly title: string;
  readonly updated: string;
  readonly items: readonly MaterialItem[];
}

/** A topic's `materials.md`; with no items the table has only its header, ready for the first row. */
export const materialsDocument = (input: MaterialsInput): ContentDocument => ({
  frontMatter: frontMatterText([["updated", input.updated]]),
  head: `# ${oneLine(input.title)}`,
  sections: [
    {
      heading: `## ${MATERIALS_SECTION}`,
      name: MATERIALS_SECTION,
      markdown: [HEADER, ...input.items.map(row)].join("\n"),
    },
  ],
});

/**
 * The materials file with new rows appended to its table. A link already listed is not added again: a
 * retried import or two chats recommending the same page leave one row, and its status, which the
 * learner may have changed to `read`, stays as it is.
 */
export const withMaterials = (
  document: ContentDocument,
  items: readonly MaterialItem[],
  updated: string,
): ContentDocument => {
  const current = sectionMarkdown(document, MATERIALS_SECTION) ?? "";
  const known = new Set(readMaterials(current).map((item) => item.url));
  const fresh: MaterialItem[] = [];
  for (const item of items) {
    if (known.has(item.url)) continue;
    known.add(item.url);
    fresh.push(item);
  }
  if (fresh.length === 0) return document;
  const lines = current.split("\n");
  const lastRow = lines.findLastIndex((line) => line.trim().startsWith("|"));
  const rows = fresh.map(row);
  const table = [HEADER, ...rows].join("\n");
  const markdown =
    lastRow !== -1
      ? [
          ...lines.slice(0, lastRow + 1),
          ...rows,
          ...lines.slice(lastRow + 1),
        ].join("\n")
      : current.trim() === ""
        ? table
        : `${current.trim()}\n\n${table}`;
  return withSection(
    withFrontMatterValue(document, "updated", updated),
    MATERIALS_SECTION,
    markdown,
    [MATERIALS_SECTION],
  );
};
