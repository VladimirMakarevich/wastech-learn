import {
  readSections,
  splitFrontMatter,
  type Finding,
} from "@wastech-learn/core";

const frontMatterOf = (text: string): Readonly<Record<string, unknown>> => {
  const split = splitFrontMatter(text);
  return split.ok && typeof split.data === "object" && split.data !== null
    ? (split.data as Record<string, unknown>)
    : {};
};

const FILE_ID = /\/cards\/([^/]+)\.md$/;

/** The id a card file owns by its name, for a text whose front matter cannot be read. */
export const fileCardId = (path: string): string | undefined =>
  FILE_ID.exec(path)?.[1];

/**
 * The id is what the review history hangs on; an edit that changes it would orphan every past answer.
 * The id before the edit is the reference, or the file name when the old text has no readable id.
 */
export const idChange = (
  path: string,
  before: string,
  after: string,
): Finding | undefined => {
  const split = splitFrontMatter(after);
  if (!split.ok) return undefined;
  // YAML reads an id of digits (or one like `1e5abcde`) as a number; the text of the line is what counts.
  const asText = (value: unknown): string | undefined =>
    typeof value === "string" || typeof value === "number"
      ? String(value)
      : undefined;
  const expected = asText(frontMatterOf(before).id) ?? fileCardId(path) ?? "";
  if (asText(frontMatterOf(after).id) === expected) return undefined;
  const lines = after.split("\n");
  const index = lines.findIndex((line) => /^id\s*:/.test(line));
  return {
    ruleId: "card-id-changed",
    severity: "error",
    file: path,
    line: index === -1 ? 1 : index + 1,
    params: { id: expected },
  };
};

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/** The text with its front matter's `updated` line set to `today`; the rest stays as typed. */
export const withUpdated = (text: string, today: string): string => {
  const block = FRONT_MATTER.exec(text)?.[0];
  if (block === undefined) return text;
  return (
    block.replace(/^updated\s*:.*$/m, `updated: ${today}`) +
    text.slice(block.length)
  );
};

/**
 * Sets `updated` the way the chat tools do, unless the learner changed it themselves. Only that one
 * line of the front matter is replaced, so the rest of the text is saved exactly as typed.
 */
export const withUpdatedToday = (
  before: string,
  after: string,
  today: string,
): string => {
  const was = frontMatterOf(before).updated;
  const now = frontMatterOf(after).updated;
  if (now !== was || now === today) return after;
  return withUpdated(after, today);
};

/** The `#` title of a Markdown file, or `undefined` when its front matter cannot be read. */
export const titleOf = (text: string): string | undefined => {
  const split = splitFrontMatter(text);
  return split.ok ? readSections(split.body, split.bodyLine).title : undefined;
};
