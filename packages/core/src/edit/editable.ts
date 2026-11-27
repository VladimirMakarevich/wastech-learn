/**
 * The files the app may open as text and save: a card, and a topic's passport, summary and materials.
 * Diagrams, the review log, configs and everything outside a topic stay out, because their writes need
 * more than a text edit (a render, an append-only log) or belong to the owner alone.
 */
export const EDITABLE_KINDS = [
  "card",
  "topic-index",
  "summary",
  "materials",
] as const;
export type EditableKind = (typeof EDITABLE_KINDS)[number];

// Segments are matched strictly rather than with `[^/]+`: a `..`, a dot file or an encoded separator is
// never the name of a topic or a card, so it is refused here before any path reaches the disk.
const SEGMENT = "[a-z0-9][a-z0-9-]*";
const TOPIC_FILE = new RegExp(
  `^content/${SEGMENT}/${SEGMENT}/(index|summary|materials)\\.md$`,
);
const CARD_FILE = new RegExp(
  `^content/${SEGMENT}/${SEGMENT}/cards/${SEGMENT}\\.md$`,
);

const TOPIC_KINDS: Readonly<Record<string, EditableKind>> = {
  index: "topic-index",
  summary: "summary",
  materials: "materials",
};

/** What kind of editable file a repository path names, or `undefined` when the app may not edit it. */
export const editableKind = (path: string): EditableKind | undefined => {
  if (CARD_FILE.test(path)) return "card";
  const name = TOPIC_FILE.exec(path)?.[1];
  return name === undefined ? undefined : TOPIC_KINDS[name];
};

/** `<domain>/<topic>` of an editable path, the identity the content model gives the topic. */
export const editableTopic = (path: string): string | undefined =>
  editableKind(path) === undefined
    ? undefined
    : path.split("/").slice(1, 3).join("/");
