import {
  LearnError,
  readDocument,
  withRestoredCardLink,
  withoutCardLink,
  writeDocument,
} from "@wastech-learn/core";
import { runGit } from "../git/run.js";
import type { Workspace } from "../workspace.js";
import { applyWrite, type WriteOutcomeOf } from "./apply.js";
import { updateCard } from "./cards.js";
import { requireTopic, topicDir } from "./topic-paths.js";

export interface ChangedCard {
  readonly id: string;
  readonly paths: readonly string[];
}

const missingCard = (id: string): LearnError =>
  new LearnError("card-not-found", `No card with id ${id}`, { subject: id });

/**
 * Deletes a card: its file and its line in the topic's `## Cards`, in one validated transaction, so the
 * index never links to a file that is gone. The review log is not touched: events of a card that no
 * longer exists are skipped by replay, and the deletion can be undone until it is committed.
 */
export const deleteCard = async (
  workspace: Workspace,
  id: string,
): Promise<WriteOutcomeOf<ChangedCard>> => {
  const snapshot = await workspace.snapshot();
  const card = snapshot.parsed.model.cards.find(
    (candidate) => candidate.id === id,
  );
  if (card === undefined) throw missingCard(id);
  const topic = requireTopic(snapshot, card.topic);
  const files = new Map<string, string | null>([
    [card.file, null],
    [topic.indexPath, writeDocument(withoutCardLink(topic.index, id))],
  ]);
  return applyWrite(
    workspace,
    {
      basis: snapshot,
      files,
      incidental: [topic.indexPath],
      result: { id, paths: [card.file, topic.indexPath] },
    },
    { dryRun: false },
  );
};

const committedText = async (
  root: string,
  path: string,
): Promise<string | undefined> => {
  const shown = await runGit(root, ["show", `HEAD:./${path}`]);
  return shown.exitCode === 0 ? shown.stdout : undefined;
};

/** Where the last commit kept the card: a card file is named by its id, whatever topic holds it. */
const committedCardPath = async (
  root: string,
  id: string,
): Promise<string | undefined> => {
  const listed = await runGit(root, [
    "ls-tree",
    "-r",
    "-z",
    "--name-only",
    "--full-name",
    "HEAD",
    "--",
    ".",
  ]);
  const prefix = (
    await runGit(root, ["rev-parse", "--show-prefix"])
  ).stdout.trim();
  if (listed.exitCode !== 0) return undefined;
  const suffix = `/cards/${id}.md`;
  const found = listed.stdout
    .split("\0")
    .find(
      (path) => path.startsWith(`${prefix}content/`) && path.endsWith(suffix),
    );
  return found?.slice(prefix.length);
};

/**
 * Undoes a deletion that is not committed yet: the card's file comes back with the text of the last
 * commit and its line goes back into the topic's index next to the cards it stood with. Other edits made
 * to the index since the commit stay, which restoring the whole file from git would throw away.
 */
export const restoreCard = async (
  workspace: Workspace,
  id: string,
): Promise<WriteOutcomeOf<ChangedCard>> => {
  const snapshot = await workspace.snapshot();
  const path = await committedCardPath(workspace.root, id);
  const text =
    path === undefined ? undefined : await committedText(workspace.root, path);
  // A card with this id anywhere in the content (moved to another topic, say) is not deleted.
  const present = snapshot.parsed.model.cards.some((card) => card.id === id);
  if (
    path === undefined ||
    text === undefined ||
    present ||
    snapshot.files.has(path)
  )
    throw new LearnError(
      "nothing-to-restore",
      `Card ${id} has no uncommitted deletion`,
      { subject: id },
    );
  const topicPath = path.slice("content/".length, -`/cards/${id}.md`.length);
  const topic = requireTopic(snapshot, topicPath);
  const committedIndex = await committedText(
    workspace.root,
    `${topicDir(topicPath)}/index.md`,
  );
  const card = readDocument(text);
  // The head may carry a lead paragraph under the title; a list line takes the title alone.
  const heading = card?.head.split("\n")[0]?.replace(/^#\s+/, "").trim();
  const title = heading === undefined || heading === "" ? id : heading;
  const index =
    committedIndex === undefined ? undefined : readDocument(committedIndex);
  const files = new Map<string, string | null>([
    [path, text],
    [
      topic.indexPath,
      writeDocument(
        withRestoredCardLink(topic.index, index ?? topic.index, { id, title }),
      ),
    ],
  ]);
  return applyWrite(
    workspace,
    {
      basis: snapshot,
      files,
      incidental: [topic.indexPath],
      result: { id, paths: [path, topic.indexPath] },
    },
    { dryRun: false },
  );
};

/** The card statuses the app sets: it archives and returns a card, it never makes one a draft again. */
export type AppCardStatus = "active" | "retired";

/**
 * Archives or returns a card by its `status` alone, through the same `updateCard` the MCP tool uses, so
 * an archive from the app and one from a chat leave the same file behind.
 */
export const setCardStatus = async (
  workspace: Workspace,
  id: string,
  status: AppCardStatus,
): Promise<WriteOutcomeOf<ChangedCard>> => {
  const outcome = await updateCard(workspace, {
    id,
    fields: { status },
    meaningChanged: false,
  });
  return { ...outcome, result: { id, paths: outcome.result.paths } };
};
