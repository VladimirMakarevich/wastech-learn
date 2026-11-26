// Text that tools put inside Markdown syntax comes from a chat and may contain the syntax's own
// characters; escaping them keeps a title with brackets a title instead of a broken link.

/** Link text with `[`, `]` and backslashes escaped, on one line. */
export const linkText = (text: string): string =>
  oneLine(text).replace(/[\\[\]]/g, (char) => `\\${char}`);

/** A link destination; one with spaces or parentheses is wrapped in `<…>` so the parser keeps it whole. */
export const linkUrl = (url: string): string =>
  /[\s()<>]/.test(url) ? `<${url.replace(/[<>]/g, encodeURIComponent)}>` : url;

export const markdownLink = (text: string, url: string): string =>
  `[${linkText(text)}](${linkUrl(url)})`;

/**
 * A whole Markdown link: text with escapes, then a destination in angle brackets (any characters but
 * `>`) or bare with balanced parentheses, as `Lock_(computer_science)` in a Wikipedia URL.
 */
export const LINK_PATTERN =
  /^\[((?:\\.|[^\]\\])*)\]\((<[^>]*>|(?:[^()\s]|\([^()\s]*\))+)\)$/;

/** The text and destination of a link matched by `LINK_PATTERN`, with escapes and angle brackets undone. */
export const linkParts = (
  match: RegExpExecArray,
): { readonly text: string; readonly url: string } => {
  const raw = match[2] ?? "";
  const url = raw.startsWith("<")
    ? raw.slice(1, -1).replaceAll("%3C", "<").replaceAll("%3E", ">")
    : raw;
  return { text: (match[1] ?? "").replace(/\\([\\[\]])/g, "$1"), url };
};

/** A table cell: one line, pipes escaped, so a value never splits the row. */
export const tableCell = (text: string): string =>
  oneLine(text).replace(/\|/g, "\\|");

/** Collapses line breaks and runs of spaces: list items and headings written by tools are one line. */
export const oneLine = (text: string): string =>
  text.replace(/\s+/g, " ").trim();

/** The cells of one Markdown table row; an escaped `\|` stays inside its cell. */
export const tableCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll("\\|", "|"));
