import { isSyncedArea, type GitEntry } from "@wastech-learn/core";

/** Whether Sync commits the path; `other` paths are the owner's to commit by hand. */
export const isSynced = (item: GitEntry): boolean => isSyncedArea(item.area);

const plural = (count: number, one: string, many: string): string =>
  `${String(count)} ${count === 1 ? one : many}`;

const joinParts = (parts: readonly string[]): string =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1) ?? ""}`;

/**
 * The commit message the Sync panel starts with, built from what will be committed: reviews, how many
 * topics were touched (a card counts for its topic), the inbox, and the device it was written on. It is
 * English like the content repository's other Conventional Commits, and predictable so the owner reads
 * the log at a glance; the owner may still rewrite it before pressing Sync.
 */
export const suggestCommitMessage = (
  entries: readonly GitEntry[],
  device: string,
): string => {
  const synced = entries.filter(isSynced);
  const topics = new Set(
    synced.flatMap((item) => (item.topic === undefined ? [] : [item.topic])),
  );
  const looseContent = synced.some(
    (item) =>
      (item.area === "topic" || item.area === "card") &&
      item.topic === undefined,
  );
  const parts: string[] = [];
  if (synced.some((item) => item.area === "reviews")) parts.push("reviews");
  if (topics.size > 0) parts.push(plural(topics.size, "topic", "topics"));
  else if (looseContent) parts.push("content");
  if (synced.some((item) => item.area === "inbox")) parts.push("inbox");
  if (parts.length === 0) return `chore: sync from ${device}`;
  return `chore: ${joinParts(parts)} from ${device}`;
};
