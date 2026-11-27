import {
  isSyncedArea,
  type GitBlockReason,
  type GitEntry,
  type GitFailure,
  type GitState,
  type GitSyncResult,
} from "@wastech-learn/core";
import type { MessageKey } from "../i18n/en";
import type { MessageParams } from "../i18n/message";

/** A message to show: its key and parameters, translated by the template that shows it. */
export interface Line {
  readonly key: MessageKey;
  readonly params?: MessageParams;
}

/** What Sync commits and what it leaves for the owner, as the panel lists them. */
export const splitEntries = (
  state: GitState,
): {
  readonly synced: readonly GitEntry[];
  readonly other: readonly GitEntry[];
} => ({
  synced: state.entries.filter((entry) => isSyncedArea(entry.area)),
  other: state.entries.filter((entry) => !isSyncedArea(entry.area)),
});

/** Nothing to commit, send or receive: the sidebar can say everything is in place. */
export const isInSync = (state: GitState): boolean =>
  state.entries.length === 0 && state.ahead === 0 && state.behind === 0;

/**
 * Ratings of this computer that the other one does not have yet: the log changed since the last commit,
 * or a commit is waiting to be pushed. Then the session summary mentions it.
 */
export const hasUnsentReviews = (state: GitState): boolean =>
  state.ahead > 0 || state.entries.some((entry) => entry.area === "reviews");

/** The uncommitted files of one topic, cards included, for its page. */
export const topicEntries = (
  state: GitState,
  topic: string,
): readonly GitEntry[] =>
  state.entries.filter(
    (entry) =>
      entry.topic === topic &&
      (entry.area === "topic" || entry.area === "card"),
  );

/** How each card differs from the last commit, by id; a card absent here is committed as it is. */
export const cardChanges = (
  state: GitState,
): ReadonlyMap<string, GitEntry["change"]> =>
  new Map(
    state.entries.flatMap((entry) =>
      entry.area === "card" && entry.card !== undefined
        ? [[entry.card, entry.change] as const]
        : [],
    ),
  );

/**
 * Cards deleted since the last commit, which Cards still lists so they can be brought back. A card moved
 * in the editor shows in git as a deletion plus a new file with the same id; it is not gone, so it is
 * left out, as is any card the content still holds under another path.
 */
export const deletedCards = (
  state: GitState,
  present: ReadonlySet<string> = new Set(),
): readonly { readonly path: string; readonly card: string }[] => {
  const elsewhere = new Set(
    state.entries.flatMap((entry) =>
      entry.area === "card" &&
      entry.change !== "deleted" &&
      entry.card !== undefined
        ? [entry.card]
        : [],
    ),
  );
  return state.entries.flatMap((entry) =>
    entry.area === "card" &&
    entry.change === "deleted" &&
    entry.card !== undefined &&
    !elsewhere.has(entry.card) &&
    !present.has(entry.card)
      ? [{ path: entry.path, card: entry.card }]
      : [],
  );
};

/**
 * Whether the last commit holds the card: a card never committed, or a folder without git, leaves nothing
 * to bring back after a deletion. An unknown state counts as not committed, so no undo is promised.
 */
export const isCommittedCard = (
  state: GitState | undefined,
  card: string,
): boolean =>
  state !== undefined &&
  state.blocked?.reason !== "no-git" &&
  state.blocked?.reason !== "not-a-repository" &&
  !state.entries.some(
    (entry) =>
      entry.area === "card" &&
      entry.card === card &&
      (entry.change === "untracked" || entry.change === "added"),
  );

const BLOCK_KEYS: Readonly<Record<GitBlockReason, MessageKey>> = {
  "no-git": "git.blocked.no-git",
  "not-a-repository": "git.blocked.not-a-repository",
  detached: "git.blocked.detached",
  "no-upstream": "git.blocked.no-upstream",
  "operation-in-progress": "git.blocked.operation-in-progress",
  unmerged: "git.blocked.unmerged",
};

export const blockLine = (reason: GitBlockReason): Line => ({
  key: BLOCK_KEYS[reason],
});

/** One line about a finished Sync or Pull: what was committed, received and sent, or that nothing was new. */
export const resultLine = (result: GitSyncResult): Line => {
  if (result.pulled === 0 && result.pushed === 0 && result.committed === 0)
    return { key: "git.result.nothing" };
  if (result.pulled === 0)
    return { key: "git.result.sent", params: { count: result.pushed } };
  if (result.pushed === 0)
    return { key: "git.result.received", params: { count: result.pulled } };
  return {
    key: "git.result.both",
    params: { sent: result.pushed, received: result.pulled },
  };
};

/** What went wrong and what to do about it, in that order. */
export const failureLine = (failure: GitFailure): Line => {
  switch (failure.code) {
    case "conflict":
      return failure.stashKept === true
        ? { key: "git.failure.conflict-stash" }
        : { key: "git.failure.conflict" };
    case "auth-required":
      return { key: "git.failure.auth-required" };
    case "offline":
      return { key: "git.failure.offline" };
    case "identity-missing":
      return { key: "git.failure.identity-missing" };
    case "busy":
      return { key: "git.failure.busy" };
    case "blocked":
      return blockLine(failure.blocked?.reason ?? "not-a-repository");
    case "push-rejected":
      return { key: "git.failure.push-rejected" };
    case "git-failed":
      return {
        key: "git.failure.git-failed",
        params: { detail: failure.detail ?? "" },
      };
  }
};
